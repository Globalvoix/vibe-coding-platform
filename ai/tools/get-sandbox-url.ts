import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Sandbox } from 'e2b'
import { tool } from 'ai'
import description from './get-sandbox-url.md'
import z from 'zod/v3'
import { GenerationSessionTracker } from '@/lib/generation-session-tracker'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  sessionTracker?: GenerationSessionTracker | null
}

export const getSandboxURL = ({ writer, sessionTracker }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      sandboxId: z
        .string()
        .describe(
          'The unique identifier of the sandbox. This ID is returned when creating a sandbox and is used to reference the specific sandbox instance.'
        ),
      port: z
        .number()
        .describe(
          'The port number where a service is running inside the sandbox (e.g., 3000 for Next.js dev server, 8000 for Python apps, 5000 for Flask).'
        ),
    }),
    execute: async ({ sandboxId, port }, { toolCallId }) => {
      if (sessionTracker) {
        const isCancelled = await GenerationSessionTracker.isCancelled(sessionTracker.id)
        if (isCancelled) {
          throw new Error('Generation cancelled')
        }
      }

      writer.write({
        id: toolCallId,
        type: 'data-get-sandbox-url',
        data: { status: 'loading' },
      })

      const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
      const host = sandbox.getHost(port)
      const url = `https://${host}`

      writer.write({
        id: toolCallId,
        type: 'data-get-sandbox-url',
        data: { url, status: 'done' },
      })

      if (sessionTracker) {
        await sessionTracker.updateProgress({
          stage: 'done',
          message: 'Preview ready',
          completionPercentage: 100,
        })
      }

      return { url }
    },
  })
