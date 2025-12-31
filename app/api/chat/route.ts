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
import { tools, type SupabaseConnectionInfo } from '@/ai/tools'
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

    // Get project env vars if projectId is provided
    let envVarsContext = ''
    let envVarsForTools: Record<string, string> = {}
    let supabaseContext = ''
    let supabaseConnectionInfo: SupabaseConnectionInfo | undefined

    if (projectId) {
      try {
        const envVars = await getEnvVarsForChat(projectId)
        envVarsForTools = { ...envVars }
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
            // Extract Supabase env vars from the connection
            const supabaseUrl = `https://${supabaseProject.supabase_project_ref}.supabase.co`
            const supabaseAnonKey = supabaseProject.anon_key

            // Log for debugging
            if (!supabaseAnonKey) {
              console.warn('Supabase project connected but anon_key is missing', {
                projectId,
                supabaseProjectRef: supabaseProject.supabase_project_ref,
              })
            }

            // Add to env vars for code generation
            if (supabaseUrl && supabaseAnonKey) {
              envVarsForTools['NEXT_PUBLIC_SUPABASE_URL'] = supabaseUrl
              envVarsForTools['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = supabaseAnonKey
            }

            supabaseContext = `\n\n## Supabase Backend Integration:\nThis project is connected to a Supabase PostgreSQL database at ${supabaseUrl}.\n\nAutomatically available environment variables:\n- NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}\n- NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey ? '(set)' : '(missing - check connection settings)'}\n\nYou have full access to:\n- Create and manage database tables\n- Create PostgreSQL functions and triggers\n- Enable real-time subscriptions\n- Manage RLS policies\n- Execute arbitrary queries\n\nWhen generating code, automatically include these env vars in .env.local and use them in the Supabase client initialization. The Supabase project is: ${supabaseProject.supabase_project_name} (Ref: ${supabaseProject.supabase_project_ref}).`

            // Prepare Supabase connection info for AI tools
            if (supabaseProject.access_token) {
              supabaseConnectionInfo = {
                accessToken: supabaseProject.access_token,
                projectRef: supabaseProject.supabase_project_ref,
                projectName: supabaseProject.supabase_project_name || undefined,
                organizationId: supabaseProject.supabase_org_id || undefined,
                anonKey: supabaseProject.anon_key || undefined,
                supabaseUrl: supabaseUrl,
              }
            }
          } else {
            console.warn('Supabase connected flag is true but no project record found', {
              projectId,
              userId,
            })
          }
        } catch (error) {
          console.error('Failed to fetch Supabase project:', {
            error: error instanceof Error ? error.message : String(error),
            projectId,
            userId,
          })
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

          const result = streamText({
            ...getModelOptions(modelId, { reasoningEffort: effectiveReasoningEffort }),
            system: prompt,
            messages: convertToModelMessages(processedMessages),
            stopWhen: stepCountIs(20),
            tools: tools({
              modelId,
              writer,
            }),
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
