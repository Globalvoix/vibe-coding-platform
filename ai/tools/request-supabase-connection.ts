import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { tool } from 'ai'
import z from 'zod/v3'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  projectId?: string
}

export const requestSupabaseConnection = ({ writer, projectId }: Params) =>
  tool({
    description: "Call this tool when the user asks to add any integration using an API or environment variable (e.g., 'add auth', 'add database', 'add payment integration', 'add email service', 'add stripe', 'add sendgrid', etc.). This tool will prompt the user to first connect to Supabase, which provides a unified cloud backend, database, and managed AI models. You should ONLY call this tool if Supabase is NOT already connected for the project.",
    inputSchema: z.object({
      reason: z.string().describe("The reason why Supabase connection is requested (e.g., 'To add authentication and database persistence')"),
    }),
    execute: async ({ reason }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: 'data-connect-supabase',
        data: { projectId },
      })

      return { requested: true, reason }
    },
  })
