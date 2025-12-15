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
import { getUserSubscription, isPaidSubscription } from '@/lib/subscription'
import { createOrUpdateEnvVar, getEnvVarsForChat } from '@/lib/env-vars-db'
import { getProject } from '@/lib/projects-db'
import { getSupabaseProject } from '@/lib/supabase-projects-db'
import prompt from './prompt.md'

interface BodyData {
  messages: ChatUIMessage[]
  modelId?: string
  reasoningEffort?: 'low' | 'medium'
  projectId?: string
  supabaseConnected?: boolean
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

  if (!found.some((v) => v.key === 'GOOGLE_GENERATIVE_AI_API_KEY')) {
    const isGeminiMentioned = /\bgemini\b/i.test(text) || /google\s+generative/i.test(text)
    const tokenMatch = text.match(/AIza[0-9A-Za-z_-]{20,}/)
    if (isGeminiMentioned && tokenMatch?.[0]) {
      found.push({ key: 'GOOGLE_GENERATIVE_AI_API_KEY', value: tokenMatch[0] })
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
    const {
      messages,
      modelId = DEFAULT_MODEL,
      reasoningEffort,
      projectId,
      supabaseConnected,
    } = bodyData

    const [models, subscription] = await Promise.all([
      getAvailableModels(),
      getUserSubscription(userId),
    ])

    if (modelId === Models.AnthropicClaude45Sonnet && !isPaidSubscription(subscription)) {
      return NextResponse.json(
        {
          error:
            'Claude Sonnet 4.5 is available on paid plans. Please upgrade to use it.',
          code: 'PAID_PLAN_REQUIRED',
        },
        { status: 403 }
      )
    }

    const extractedEnvVars: Array<{ key: string; value: string }> = []
    const secretsToRedact: string[] = []

    if (projectId) {
      try {
        const project = await getProject(userId, projectId)
        if (project) {
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
        }
      } catch (error) {
        console.warn('Failed to capture env vars from chat:', error)
      }
    }
    const effectiveReasoningEffort: BodyData['reasoningEffort'] =
      reasoningEffort ?? (modelId === Models.OpenAIGPT5 ? 'medium' : 'low')

    const model = models.find((model) => model.id === modelId)
    if (!model) {
      return NextResponse.json(
        { error: `Model ${modelId} not found.` },
        { status: 400 }
      )
    }

    const credits = await getUserCredits(userId)

    if (credits.balance <= 0) {
      return NextResponse.json(
        { error: 'You have no AI credits remaining. Please upgrade your plan.' },
        { status: 402 }
      )
    }

    // Get project env vars if projectId is provided
    let envVarsContext = ''
    let supabaseContext = ''
    let supabaseConnectionInfo: typeof import('@/ai/tools').SupabaseConnectionInfo | undefined

    if (projectId) {
      try {
        const envVars = await getEnvVarsForChat(projectId)
        const envVarKeys = Object.keys(envVars)
        if (envVarKeys.length > 0) {
          envVarsContext = `\n\n## Available Environment Variables for this project:\n${envVarKeys.map((key) => `- ${key}`).join('\n')}\n\nYou have access to these environment variables. Use them when generating code. If you need additional environment variables, ask the user to add them in the Environment Variables tab.`
        }
      } catch (error) {
        console.warn('Failed to fetch env vars:', error)
      }

      // Get Supabase project details if connected
      if (supabaseConnected) {
        try {
          const supabaseProject = await getSupabaseProject(userId, projectId)
          if (supabaseProject) {
            supabaseContext = `\n\n## Supabase Backend Integration:\nThis project is connected to a Supabase PostgreSQL database. You have full access to create tables, functions, enable real-time subscriptions, and manage the database schema. The Supabase project is: ${supabaseProject.supabase_project_name} (Ref: ${supabaseProject.supabase_project_ref}). When generating code, you can automatically set up the database schema and real-time features.`

            // Prepare Supabase connection info for AI tools
            const supabaseUrl =
              process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
            if (supabaseUrl && supabaseProject.access_token) {
              supabaseConnectionInfo = {
                accessToken: supabaseProject.access_token,
                projectRef: supabaseProject.supabase_project_ref,
                projectName: supabaseProject.supabase_project_name || undefined,
                organizationId: supabaseProject.supabase_org_id || undefined,
                supabaseUrl,
              }
            }
          }
        } catch (error) {
          console.warn('Failed to fetch Supabase project:', error)
        }
      }
    }

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

          const systemPrompt = prompt + envVarsContext + supabaseContext

          const result = streamText({
            ...getModelOptions(modelId, { reasoningEffort: effectiveReasoningEffort }),
            system: systemPrompt,
            messages: convertToModelMessages(processedMessages),
            stopWhen: stepCountIs(20),
            tools: tools({ modelId, writer, userId, projectId, supabaseConnected }),
            onError: (error) => {
              console.error('Error communicating with AI')
              console.error(JSON.stringify(error, null, 2))
            },
            onFinish: async ({ usage }) => {
              try {
                await recordUsageAndDeductCredits({
                  userId,
                  modelId,
                  usage,
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
                model: model.name,
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
