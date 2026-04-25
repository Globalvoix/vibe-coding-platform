import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Sandbox } from '@vercel/sandbox'
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
          'Maximum time in milliseconds the Vercel Sandbox will remain active before automatically shutting down. Minimum 600000ms (10 minutes), maximum 2700000ms (45 minutes). Defaults to 600000ms (10 minutes). The sandbox will terminate all running processes when this timeout is reached.'
        ),
      ports: z
        .array(z.number())
        .max(2)
        .optional()
        .describe(
          'Array of network ports to expose and make accessible from outside the Vercel Sandbox. These ports allow web servers, APIs, or other services running inside the Vercel Sandbox to be reached externally. Common ports include 3000 (Next.js), 8000 (Python servers), 5000 (Flask), etc.'
        ),
    }),
    execute: async ({ timeout, ports }, { toolCallId }) => {
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
          timeout: timeout ?? 600000,
          ports,
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
        const isOIDCError = error instanceof Error &&
          error.message.includes('x-vercel-oidc-token')

        let userMessage = ''
        if (isOIDCError) {
          const env = process.env.NODE_ENV
          const isProduction = env === 'production'
          userMessage = isProduction
            ? 'Sandbox creation failed due to OIDC authentication. Please ensure OIDC is enabled in your Vercel project settings.'
            : 'Sandbox creation requires running in a Vercel environment with OIDC enabled. ' +
              'For local development, please deploy to Vercel or use `npx vercel dev` with your Vercel credentials configured. ' +
              'Alternatively, ensure your Vercel project has "Secure Backend Access with OIDC Federation" enabled in project settings.'
        }

        const richError = userMessage
          ? { message: userMessage, error: { message: userMessage } }
          : getRichError({
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

        console.log('Error creating Sandbox:', error)
        return
      }
    },
  })
