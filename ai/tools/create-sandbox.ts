import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Sandbox } from 'e2b'
import { getRichError } from './get-rich-error'
import { tool } from 'ai'
import description from './create-sandbox.md'
import z from 'zod/v3'
import { GenerationSessionTracker } from '@/lib/generation-session-tracker'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  sessionTracker?: GenerationSessionTracker | null
}

export const createSandbox = ({ writer, sessionTracker }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      timeout: z
        .number()
        .min(600000)
        .max(2700000)
        .optional()
        .describe(
          'Maximum time in milliseconds the sandbox will remain active before automatically shutting down. Minimum 600000ms (10 minutes), maximum 2700000ms (45 minutes). Defaults to 600000ms (10 minutes).'
        ),
      ports: z
        .array(z.number())
        .max(2)
        .optional()
        .describe(
          'Array of network ports to expose. Common ports: 3000 (Next.js), 8000 (Python), 5000 (Flask). Ports are automatically available in E2B sandboxes.'
        ),
    }),
    execute: async ({ timeout }, { toolCallId }) => {
      if (sessionTracker) {
        const isCancelled = await GenerationSessionTracker.isCancelled(sessionTracker.id)
        if (isCancelled) {
          throw new Error('Generation cancelled')
        }
        await sessionTracker.updateProgress({
          stage: 'analyzing',
          message: 'Creating sandbox',
          completionPercentage: 10,
        })
      }

      writer.write({
        id: toolCallId,
        type: 'data-create-sandbox',
        data: { status: 'loading' },
      })

      try {
        const sandbox = await Sandbox.create({
          timeoutMs: timeout ?? 600000,
          apiKey: process.env.E2B_API_KEY,
        })

        if (sessionTracker) {
          await sessionTracker.updateProgress({
            stage: 'generating',
            message: 'Sandbox ready, preparing files',
            completionPercentage: 20,
          })
        }

        writer.write({
          id: toolCallId,
          type: 'data-create-sandbox',
          data: { sandboxId: sandbox.sandboxId, status: 'done' },
        })

        return (
          `Sandbox created with ID: ${sandbox.sandboxId}.` +
          `\nYou can now upload files, run commands, and access services on the exposed ports.`
        )
      } catch (error) {
        const richError = getRichError({
          action: 'Creating Sandbox',
          error,
        })

        writer.write({
          id: toolCallId,
          type: 'data-create-sandbox',
          data: {
            error: { message: richError.error.message },
            status: 'error',
          },
        })

        console.log('Error creating Sandbox:', richError.error)
        return richError.message
      }
    },
  })
