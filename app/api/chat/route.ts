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
import { getEnvVarsForChat } from '@/lib/env-vars-db'
import { getSupabaseProject } from '@/lib/supabase-projects-db'
import prompt from './prompt.md'

interface BodyData {
  messages: ChatUIMessage[]
  modelId?: string
  reasoningEffort?: 'low' | 'medium'
  projectId?: string
  supabaseConnected?: boolean
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

    const [models, bodyData] = await Promise.all([
      getAvailableModels(),
      req.json() as Promise<BodyData>,
    ])

    const { messages, modelId = DEFAULT_MODEL, reasoningEffort, projectId } = bodyData
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
    }

    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        originalMessages: messages,
        execute: ({ writer }) => {
          const processedMessages = messages.map((message) => {
            message.parts = message.parts.map((part) => {
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

          const systemPrompt = prompt + envVarsContext

          const result = streamText({
            ...getModelOptions(modelId, { reasoningEffort: effectiveReasoningEffort }),
            system: systemPrompt,
            messages: convertToModelMessages(processedMessages),
            stopWhen: stepCountIs(20),
            tools: tools({ modelId, writer, projectId }),
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
