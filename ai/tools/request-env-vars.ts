import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { tool } from 'ai'
import z from 'zod/v3'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  projectId?: string
}

export const requestEnvVars = ({ writer, projectId }: Params) =>
  tool({
    description:
      "Call this tool when the user asks to add integrations that require environment variables or API keys (e.g., 'add OpenAI', 'use Stripe', 'add SendGrid', 'add database connection', etc.). This prompts the user to securely provide the required API keys and environment variables. The AI will store them encrypted and push them to Supabase Edge Function Secrets.",
    inputSchema: z.object({
      requiredVars: z.array(
        z.object({
          key: z.string().describe("The environment variable name (e.g., 'OPENAI_API_KEY')"),
          description: z
            .string()
            .describe("Human-readable description of what this variable is for"),
        })
      ),
      reason: z
        .string()
        .describe(
          "Explanation of why these environment variables are needed (e.g., 'To use OpenAI API for text generation')"
        ),
    }),
    execute: async ({ requiredVars, reason }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: 'data-request-env-vars',
        data: { projectId, requiredVars, reason },
      })

      return {
        requested: true,
        reason,
        vars: requiredVars.map((v) => v.key),
      }
    },
  })
