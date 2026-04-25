import type { ChatUIMessage } from '@/components/chat/types'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from 'ai'
import { Models } from '@/ai/constants'
import type { ModelOptions } from '@/ai/gateway'
import { getModelOptions } from '@/ai/gateway'
import { GenerationSessionTracker } from '@/lib/generation-session-tracker'
import { getDefaultModel } from '../packages/runtime/packages/agent'
import { getModelById } from '../packages/runtime/packages/agent'
import type { ToolSet } from 'ai'
import type { OpenAgentCallOptions } from '../packages/runtime/packages/agent'

export interface AgentRuntimeConfig {
  userId: string
  projectId?: string
  modelId?: string
  sessionTracker?: GenerationSessionTracker
  customInstructions?: string
}

export interface RuntimeToolsOptions {
  modelId: string
  writer: any
  userId: string
  projectId?: string
  sessionTracker?: GenerationSessionTracker
}

const wrapToolsForRuntime = (
  baseTools: ToolSet,
  options: RuntimeToolsOptions,
): ToolSet => {
  return baseTools
}

export interface AgentResponse {
  stream: Promise<ReadableStream<Uint8Array>>
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export async function runAgentChat(
  messages: ChatUIMessage[],
  config: AgentRuntimeConfig,
): Promise<AgentResponse> {
  const { userId, projectId, sessionTracker, customInstructions } = config
  const modelId = config.modelId || getDefaultModel()

  const processedMessages = messages.map((message) => ({
    ...message,
    parts: message.parts?.map((part) => {
      if (part.type === 'data-report-errors') {
        return {
          type: 'text' as const,
          text:
            `There are errors in the generated code. This is the summary of the errors we have:\n` +
            `\`\`\`${part.data.summary}\`\`\`\`\n` +
            (part.data.paths?.length
              ? `The following files may contain errors:\n\`\`\`${part.data.paths?.join('\n')}\`\`\`\n`
              : '') +
            `Fix the errors reported.`,
        }
      }
      return part
    }),
  }))

  const modelOptions = getModelOptions(modelId, { reasoningEffort: 'medium' })

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: messages,
      execute: ({ writer }) => {
        const safeWriter = {
          write: (value: unknown) => {
            try {
              writer.write(value as never)
            } catch {
              // Stream closed
            }
          },
          merge: (value: unknown) => {
            try {
              writer.merge(value as never)
            } catch {
              // Stream closed
            }
          },
        }

        const tools = getRuntimeTools({
          modelId,
          writer: safeWriter,
          userId,
          projectId,
          sessionTracker,
        })

        const result = streamText({
          ...modelOptions,
          messages: convertToModelMessages(processedMessages),
          stopWhen: stepCountIs(200),
          tools,
          onFinish: async ({ usage }) => {
            if (sessionTracker) {
              try {
                await sessionTracker.complete('completed')
              } catch (error) {
                console.warn('Failed to finalize generation session status', error)
              }
            }
          },
          onError: (error) => {
            console.error('Error communicating with AI', error)
            if (sessionTracker) {
              void (async () => {
                try {
                  await sessionTracker.complete('error')
                } catch (trackerError) {
                  console.warn('Failed to update generation session status on error', trackerError)
                }
              })()
            }
          },
        })

        safeWriter.merge(
          result.toUIMessageStream({
            sendReasoning: true,
            sendStart: false,
            messageMetadata: () => ({
              model: modelId,
            }),
          }),
        )
      },
    }),
  })
}

function getRuntimeTools(options: RuntimeToolsOptions): ToolSet {
  const { modelId, writer, userId, projectId, sessionTracker } = options

  return {
    todo_write: {
      description: 'Write todo items',
      parameters: {
        type: 'object' as const,
        properties: {
          items: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                id: { type: 'string' as const },
                content: { type: 'string' as const },
                status: { type: 'string' as const, enum: ['pending', 'in_progress', 'completed'] },
              },
              required: ['id', 'content', 'status'],
            },
          },
        },
        required: ['items'],
      },
    },
  }
}

export function createAgentStream(config: AgentRuntimeConfig) {
  return runAgentChat([], config)
}