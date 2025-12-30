import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Sandbox } from '@vercel/sandbox'
import { APIError } from '@vercel/sandbox/dist/api-client/api-error'
import { getRichError } from './get-rich-error'
import { syncProjectEnvToSandbox } from './project-env'
import { tool } from 'ai'
import description from './create-sandbox.md'
import z from 'zod/v3'
import { getProject, updateProjectSandboxState } from '@/lib/projects-db'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  userId?: string
  projectId?: string
}

function coerceSandboxState(value: unknown): {
  sandboxId?: string
  paths?: string[]
  url?: string
  urlUUID?: string
  port?: number
} | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>

  return {
    sandboxId: typeof v.sandboxId === 'string' ? v.sandboxId : undefined,
    paths: Array.isArray(v.paths) ? (v.paths.filter((p) => typeof p === 'string') as string[]) : undefined,
    url: typeof v.url === 'string' ? v.url : undefined,
    urlUUID: typeof v.urlUUID === 'string' ? v.urlUUID : undefined,
    port: typeof v.port === 'number' && Number.isFinite(v.port) ? v.port : undefined,
  }
}

async function isSandboxRunning(sandboxId: string) {
  try {
    const sandbox = await Sandbox.get({ sandboxId })
    await sandbox.runCommand({ cmd: 'echo', args: ['status'] })
    return true
  } catch (error) {
    if (error instanceof APIError && error.json.error.code === 'sandbox_stopped') {
      return false
    }
    return false
  }
}

export const createSandbox = ({ writer, userId, projectId }: Params) =>
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
      writer.write({
        id: toolCallId,
        type: 'data-create-sandbox',
        data: { status: 'loading' },
      })

      try {
        if (userId && projectId) {
          const project = await getProject(userId, projectId)
          const existingState = coerceSandboxState(project?.sandbox_state)

          if (existingState?.sandboxId) {
            const running = await isSandboxRunning(existingState.sandboxId)
            if (running) {
              writer.write({
                id: toolCallId,
                type: 'data-create-sandbox',
                data: { sandboxId: existingState.sandboxId, status: 'done' },
              })

              return (
                `Reusing existing sandbox with ID: ${existingState.sandboxId}.` +
                `\nYou can now upload files, run commands, and access services on the exposed ports.`
              )
            }
          }
        }

        const SANDBOX_MAX_DURATION_MS =
          typeof timeout === 'number' && timeout > 0 ? timeout : 45 * 60 * 1000

        const sandbox = await Sandbox.create({
          timeout: SANDBOX_MAX_DURATION_MS,
          ports,
        })

        try {
          await syncProjectEnvToSandbox({ sandbox, userId, projectId })
        } catch {
          // best-effort: sandbox still usable even if env sync fails
        }

        if (userId && projectId) {
          try {
            const project = await getProject(userId, projectId)
            const previous = coerceSandboxState(project?.sandbox_state) ?? {}
            await updateProjectSandboxState(userId, projectId, {
              ...previous,
              sandboxId: sandbox.sandboxId,
              url: undefined,
              urlUUID: undefined,
            })
          } catch {
            // best-effort
          }
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
