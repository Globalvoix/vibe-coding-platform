import { type ChatUIMessage } from '@/components/chat/types'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from 'ai'
import { DEFAULT_MODEL, Models } from '@/ai/constants'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getAvailableModels, getModelOptions } from '@/ai/gateway'
import { checkBotId } from 'botid/server'
import { tools } from '@/ai/tools'
import { recordUsageAndDeductCredits, getUserCredits } from '@/lib/credits'
import { getUserSubscription } from '@/lib/subscription'
import { createOrUpdateEnvVar, listEnvVars } from '@/lib/env-vars-db'
import { getProject } from '@/lib/projects-db'
import { CONNECTOR_DEFINITIONS, detectConnectorFromPhrase, type ConnectorId } from '@/lib/connector-mapping'
import prompt from './prompt.md'

interface BodyData {
  messages: ChatUIMessage[]
  projectId?: string
}

function calculatePromptCost(text: string): number {
  const words = text.trim().split(/\s+/).filter((word) => word.length > 0).length

  if (words > 50) return 15
  if (words > 20) return 12
  return 10
}

function extractEnvVarsFromText(text: string) {
  const found: Array<{ key: string; value: string }> = []

  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^([A-Z][A-Z0-9_]{1,63})\s*=\s*(.+)$/)
    if (!match) continue

    const key = match[1] ?? ''
    let rawValue = (match[2] ?? '').trim()

    if (rawValue.startsWith('"') && rawValue.endsWith('"') && rawValue.length >= 2) {
      rawValue = rawValue
        .slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    } else if (rawValue.startsWith("'") && rawValue.endsWith("'") && rawValue.length >= 2) {
      rawValue = rawValue.slice(1, -1)
    }

    if (!rawValue) continue

    found.push({ key, value: rawValue })
  }

  const present = new Set(found.map((v) => v.key))
  const add = (key: string, value: string | undefined) => {
    if (!value) return
    if (present.has(key)) return
    found.push({ key, value })
    present.add(key)
  }

  const extractToken = (re: RegExp) => text.match(re)?.[0]

  // Google Gemini
  if (!present.has('GOOGLE_GENERATIVE_AI_API_KEY')) {
    const isGeminiMentioned = /\bgemini\b/i.test(text) || /google\s+generative/i.test(text)
    if (isGeminiMentioned) {
      add('GOOGLE_GENERATIVE_AI_API_KEY', extractToken(/AIza[0-9A-Za-z_-]{20,}/))
    }
  }

  // OpenAI
  if (!present.has('OPENAI_API_KEY')) {
    const isOpenAIMentioned = /\bopenai\b/i.test(text) || /\bgpt\b/i.test(text) || /chatgpt/i.test(text)
    if (isOpenAIMentioned) {
      add('OPENAI_API_KEY', extractToken(/sk-(?:proj-)?[0-9A-Za-z_-]{20,}/))
    }
  }

  // Together AI
  if (!present.has('TOGETHER_API_KEY')) {
    const isTogetherMentioned = /\btogether\b/i.test(text)
    if (isTogetherMentioned) {
      add('TOGETHER_API_KEY', extractToken(/tgp_v1__?[0-9A-Za-z_-]{20,}/))
    }
  }

  // Deepseek (shares sk- prefix, so require explicit mention)
  if (!present.has('DEEPSEEK_API_KEY')) {
    const isDeepseekMentioned = /\bdeepseek\b/i.test(text)
    if (isDeepseekMentioned) {
      add('DEEPSEEK_API_KEY', extractToken(/sk-[0-9A-Za-z_-]{20,}/))
    }
  }

  // Perplexity
  if (!present.has('PERPLEXITY_API_KEY')) {
    const isPerplexityMentioned = /\bperplexity\b/i.test(text)
    if (isPerplexityMentioned) {
      add('PERPLEXITY_API_KEY', extractToken(/pplx-[0-9A-Za-z_-]{10,}/))
    }
  }

  // Firecrawl
  if (!present.has('FIRECRAWL_API_KEY')) {
    const isFirecrawlMentioned = /\bfirecrawl\b/i.test(text)
    if (isFirecrawlMentioned) {
      add('FIRECRAWL_API_KEY', extractToken(/fc[-_][0-9A-Za-z]{10,}/))
    }
  }

  // ElevenLabs
  if (!present.has('ELEVEN_LABS_API_KEY')) {
    const isElevenMentioned = /\beleven\b/i.test(text) || /11\s?labs/i.test(text)
    if (isElevenMentioned) {
      add('ELEVEN_LABS_API_KEY', extractToken(/sk_[0-9A-Za-z_-]{10,}/))
    }
  }

  return found
}

function redactSecretsFromText(text: string, secrets: string[]) {
  let redacted = text
  for (const secret of secrets) {
    if (!secret) continue
    redacted = redacted.split(secret).join('[REDACTED]')
  }
  return redacted
}

async function buildConnectorContext({
  projectId,
  userPromptText,
}: {
  projectId: string
  userPromptText: string
}): Promise<string> {
  const envVars = await listEnvVars(projectId)
  const configuredKeys = new Set(
    envVars.filter((v) => (v.value ?? '').length > 0).map((v) => v.key)
  )

  const configuredConnectors = Object.values(CONNECTOR_DEFINITIONS)
    .filter(
      (c) =>
        configuredKeys.has(c.envVarKey) ||
        (c.envVarAliases ?? []).some((alias) => configuredKeys.has(alias))
    )
    .sort((a, b) => b.priority - a.priority)

  const detected = detectConnectorFromPhrase(userPromptText)
    .slice(0, 5)
    .map((m) => ({ id: m.connector.id as ConnectorId, displayName: m.connector.displayName }))

  const detectedUnique = Array.from(
    new Map(detected.map((d) => [d.id, d])).values()
  )

  const configuredNames = configuredConnectors.map((c) => c.displayName)
  const detectedNames = detectedUnique.map((d) => d.displayName)

  const lines: string[] = []
  lines.push('# PROJECT CONNECTOR CONTEXT')
  lines.push('')
  lines.push('## Configured connectors (available now)')
  if (configuredNames.length === 0) {
    lines.push('- (none configured)')
  } else {
    for (const name of configuredNames) lines.push(`- ${name}`)
  }

  lines.push('')
  lines.push('## Detected needs from the latest user message')
  if (detectedNames.length === 0) {
    lines.push('- (no connector-specific needs detected)')
  } else {
    for (const name of detectedNames) lines.push(`- ${name}`)
  }

  lines.push('')
  lines.push('## Rules')
  lines.push('- If a detected connector is already configured, use it immediately and generate code that reads its env var (do not ask for the key).')
  lines.push('- If a detected connector is not configured, instruct the user to configure it in Settings → Connectors, then proceed.')
  lines.push('- Never include any secret env var values in messages or code.')

  return lines.join('\n')
}

export async function POST(req: Request) {
  try {
    const checkResult = await checkBotId()
    if (checkResult.isBot) {
      return NextResponse.json({ error: `Bot detected` }, { status: 403 })
    }

    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    const bodyData = (await req.json()) as BodyData
    const { messages, projectId } = bodyData

    const toolModelId = DEFAULT_MODEL
    const chatModelId = Models.OpenAIGPT5Mini

    const project = projectId ? await getProject(userId, projectId).catch(() => null) : null

    const models = await getAvailableModels()

    const extractedEnvVars: Array<{ key: string; value: string }> = []
    const secretsToRedact: string[] = []

    if (projectId && project) {
      try {
        for (const message of messages) {
          if (message.role !== 'user') continue
          for (const part of message.parts ?? []) {
            if (part.type !== 'text') continue
            const text = String(part.text ?? '')
            const vars = extractEnvVarsFromText(text)
            for (const v of vars) {
              extractedEnvVars.push(v)
              secretsToRedact.push(v.value)
            }
          }
        }

        for (const { key, value } of extractedEnvVars) {
          await createOrUpdateEnvVar(projectId, userId, key, value, true)
        }
      } catch (error) {
        console.warn('Failed to capture env vars from chat:', error)
      }
    }
    const effectiveReasoningEffort = 'medium' as const

    const toolModel = models.find((model) => model.id === toolModelId)
    if (!toolModel) {
      return NextResponse.json(
        { error: `Model ${toolModelId} not found.` },
        { status: 400 }
      )
    }

    const chatModel = models.find((model) => model.id === chatModelId) ?? toolModel

    // Extract user's latest message text to calculate cost
    let userPromptText = ''
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      if (message.role === 'user') {
        for (const part of message.parts ?? []) {
          if (part.type === 'text') {
            userPromptText = String(part.text ?? '')
            break
          }
        }
        if (userPromptText) break
      }
    }

    const requiredCredits = calculatePromptCost(userPromptText)
    const credits = await getUserCredits(userId)
    const subscription = await getUserSubscription(userId)

    // Check if user has a paid subscription
    if (!subscription || subscription.plan_id === 'free' || subscription.status !== 'active') {
      return NextResponse.json(
        {
          error: 'A paid subscription is required to use ThinkSoft. We are in beta and paid-only due to high demand.',
          code: 'SUBSCRIPTION_REQUIRED',
        },
        { status: 403 }
      )
    }

    if (credits.balance < requiredCredits) {
      return NextResponse.json(
        {
          error: `Insufficient credits. This prompt requires ${requiredCredits} credits. Please upgrade your plan or wait for your monthly credits to refresh.`,
          code: 'INSUFFICIENT_CREDITS',
          currentBalance: credits.balance,
          requiredCredits,
          planId: credits.planId,
        },
        { status: 402 }
      )
    }

    const connectorContext =
      projectId && project ? await buildConnectorContext({ projectId, userPromptText }) : ''

    const repoContext =
      project && typeof project.repo_context === 'string' && project.repo_context.trim()
        ? project.repo_context.trim()
        : ''

    const systemPrompt = [prompt, connectorContext, repoContext].filter(Boolean).join('\n\n')

    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        originalMessages: messages,
        execute: ({ writer }) => {
          const processedMessages = messages.map((message) => {
            message.parts = message.parts.map((part) => {
              if (message.role === 'user' && part.type === 'text' && secretsToRedact.length > 0) {
                return {
                  ...part,
                  text: redactSecretsFromText(String(part.text ?? ''), secretsToRedact),
                }
              }
              if (part.type === 'data-report-errors') {
                return {
                  type: 'text',
                  text:
                    `There are errors in the generated code. This is the summary of the errors we have:\n` +
                    `\`\`\`${part.data.summary}\`\`\`\n` +
                    (part.data.paths?.length
                      ? `The following files may contain errors:\n` +
                        `\`\`\`${part.data.paths?.join('\n')}\`\`\`\n`
                      : '') +
                    `Fix the errors reported.`,
                }
              }
              return part
            })
            return message
          })

          const result = streamText({
            ...getModelOptions(chatModelId, { reasoningEffort: effectiveReasoningEffort }),
            system: systemPrompt,
            messages: convertToModelMessages(processedMessages),
            stopWhen: stepCountIs(20),
            tools: tools({
              modelId: toolModelId,
              writer,
              userId,
              projectId,
            }),
            onError: (error) => {
              console.error('Error communicating with AI')
              console.error(JSON.stringify(error, null, 2))
            },
            onFinish: async ({ usage }) => {
              try {
                await recordUsageAndDeductCredits({
                  userId,
                  modelId: chatModelId,
                  usage,
                  creditsRequired: requiredCredits,
                  metadata: { source: 'chat' },
                })
              } catch (error) {
                console.error('Failed to record credit usage for chat', error)
              }
            },
          })
          result.consumeStream()
          writer.merge(
            result.toUIMessageStream({
              sendReasoning: true,
              sendStart: false,
              messageMetadata: () => ({
                model: chatModel.name,
              }),
            })
          )
        },
      }),
    })
  } catch (error) {
    console.error('Chat API error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
