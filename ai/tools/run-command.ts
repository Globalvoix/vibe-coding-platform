import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Sandbox } from 'e2b'
import { getRichError } from './get-rich-error'
import { tool } from 'ai'
import description from './run-command.md'
import z from 'zod/v3'
import { GenerationSessionTracker } from '@/lib/generation-session-tracker'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  sessionTracker?: GenerationSessionTracker | null
}

export const runCommand = ({ writer, sessionTracker }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      sandboxId: z.string().describe('The ID of the sandbox to run the command in'),
      command: z
        .string()
        .describe(
          "The base command to run (e.g., 'npm', 'node', 'python', 'ls', 'cat'). Do NOT include arguments here. IMPORTANT: Each command runs independently in a fresh shell session - there is no persistent state between commands. You cannot use 'cd' to change directories for subsequent commands."
        ),
      args: z
        .array(z.string())
        .optional()
        .describe(
          "Array of arguments for the command. Each argument should be a separate string (e.g., ['install', '--verbose'] for npm install --verbose, or ['src/index.js'] to run a file, or ['-la', './src'] to list files). IMPORTANT: Use relative paths (e.g., 'src/file.js') or absolute paths instead of trying to change directories with 'cd' first, since each command runs in a fresh shell session."
        ),
      sudo: z.boolean().optional().describe('Whether to run the command with elevated privileges'),
      wait: z
        .boolean()
        .describe(
          'Whether to wait for the command to finish before returning. If true, the command will block until it completes, and you will receive its output.'
        ),
    }),
    execute: async ({ sandboxId, command, sudo: _sudo, wait, args = [] }, { toolCallId }) => {
      if (sessionTracker) {
        const isCancelled = await GenerationSessionTracker.isCancelled(sessionTracker.id)
        if (isCancelled) {
          throw new Error('Generation cancelled')
        }

        const isInstallCommand =
          ['npm', 'pnpm', 'yarn', 'bun'].includes(command) && args[0] === 'install'

        await sessionTracker.updateProgress({
          stage: isInstallCommand ? 'installing-deps' : 'validating',
          message: `Running ${command} ${args.join(' ')}`.trim(),
          completionPercentage: isInstallCommand ? 96 : 94,
        })
      }

      writer.write({
        id: toolCallId,
        type: 'data-run-command',
        data: { sandboxId, command, args, status: 'executing' },
      })

      let sandbox: Sandbox

      try {
        sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
      } catch (error) {
        const richError = getRichError({
          action: 'connect to sandbox by id',
          args: { sandboxId },
          error,
        })

        writer.write({
          id: toolCallId,
          type: 'data-run-command',
          data: {
            sandboxId,
            command,
            args,
            error: richError.error,
            status: 'error',
          },
        })

        return richError.message
      }

      const fullCmd = [command, ...args].join(' ')

      if (!wait) {
        const handle = await sandbox.commands.run(fullCmd, { background: true })
        const cmdId = String(handle.pid)

        writer.write({
          id: toolCallId,
          type: 'data-run-command',
          data: {
            sandboxId,
            commandId: cmdId,
            command,
            args,
            status: 'running',
          },
        })

        return `The command \`${fullCmd}\` has been started in the background in sandbox \`${sandboxId}\` with commandId ${cmdId}.`
      }

      // Blocking commands with retry logic for transient failures
      let lastError: unknown = null
      const maxRetries = 2

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          writer.write({
            id: toolCallId,
            type: 'data-run-command',
            data: {
              sandboxId,
              command,
              args,
              status: 'waiting',
            },
          })

          const result = await sandbox.commands.run(fullCmd, { timeoutMs: 120_000 })

          writer.write({
            id: toolCallId,
            type: 'data-run-command',
            data: {
              sandboxId,
              command,
              args,
              exitCode: result.exitCode,
              status: 'done',
            },
          })

          if (sessionTracker) {
            await sessionTracker.updateProgress({
              stage: 'done',
              message: 'Generation complete',
              completionPercentage: 100,
            })
          }

          return (
            `The command \`${fullCmd}\` has finished with exit code ${result.exitCode}.` +
            `\n\nStdout:\n\`\`\`\n${result.stdout}\n\`\`\`` +
            `\n\nStderr:\n\`\`\`\n${result.stderr}\n\`\`\``
          )
        } catch (error) {
          lastError = error

          const errorStr = String(error)
          const isTransient =
            errorStr.includes('timeout') ||
            errorStr.includes('ETIMEDOUT') ||
            errorStr.includes('ECONNREFUSED') ||
            errorStr.includes('temporarily')

          if (!isTransient || attempt === maxRetries) {
            break
          }

          const delayMs = Math.pow(2, attempt) * 1000
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }

      const richError = getRichError({
        action: 'run command in sandbox',
        args: { sandboxId, command, args },
        error: lastError,
      })

      writer.write({
        id: toolCallId,
        type: 'data-run-command',
        data: {
          sandboxId,
          command,
          args,
          error: richError.error,
          status: 'error',
        },
      })

      return richError.message
    },
  })
