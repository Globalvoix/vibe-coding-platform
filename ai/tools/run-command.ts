import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Command, Sandbox } from '@vercel/sandbox'
import { getRichError } from './get-rich-error'
import { tool } from 'ai'
import description from './run-command.md'
import z from 'zod/v3'
import { defaultRetryStrategy } from './retry-strategy'
import { buildOutputParser } from './build-output-parser'
import { generationLogger } from './generation-logger'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
}

export const runCommand = ({ writer }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      sandboxId: z
        .string()
        .describe('The ID of the Vercel Sandbox to run the command in'),
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
      sudo: z
        .boolean()
        .optional()
        .describe('Whether to run the command with sudo'),
      wait: z
        .boolean()
        .describe(
          'Whether to wait for the command to finish before returning. If true, the command will block until it completes, and you will receive its output.'
        ),
    }),
    execute: async (
      { sandboxId, command, sudo, wait, args = [] },
      { toolCallId }
    ) => {
      writer.write({
        id: toolCallId,
        type: 'data-run-command',
        data: { sandboxId, command, args, status: 'executing' },
      })

      let sandbox: Sandbox | null = null

      try {
        sandbox = await Sandbox.get({ sandboxId })
      } catch (error) {
        const richError = getRichError({
          action: 'get sandbox by id',
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

      let cmd: Command | null = null

      // Determine if this is a retryable command (install/build operations)
      const isRetryableCommand = ['npm', 'yarn', 'pnpm', 'npm install', 'yarn install', 'pnpm install'].some(
        (prefix) => command.toLowerCase().startsWith(prefix) || (command === 'npm' && args?.[0] === 'install')
      )

      const executeCommand = async () => {
        try {
          const result = await sandbox.runCommand({
            detached: true,
            cmd: command,
            args,
            sudo,
          })
          return result
        } catch (error) {
          const richError = getRichError({
            action: 'run command in sandbox',
            args: { sandboxId, command, args },
            error,
          })

          // Log for potential retry
          if (richError.classification.isRetryable) {
            generationLogger.progress(
              'run_command',
              `Command failed with transient error, attempting retry: ${command}`
            )
          }

          throw error
        }
      }

      // Use retry strategy for install/build commands, direct execution for others
      try {
        if (isRetryableCommand) {
          cmd = await defaultRetryStrategy.execute(() => executeCommand(), `${command} ${args?.join(' ') || ''}`)
        } else {
          cmd = await executeCommand()
        }
      } catch (error) {
        const richError = getRichError({
          action: 'run command in sandbox',
          args: { sandboxId, command, args },
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

      writer.write({
        id: toolCallId,
        type: 'data-run-command',
        data: {
          sandboxId,
          commandId: cmd.cmdId,
          command,
          args,
          status: 'executing',
        },
      })

      if (!wait) {
        writer.write({
          id: toolCallId,
          type: 'data-run-command',
          data: {
            sandboxId,
            commandId: cmd.cmdId,
            command,
            args,
            status: 'running',
          },
        })

        return `The command \`${command} ${args.join(
          ' '
        )}\` has been started in the background in the sandbox with ID \`${sandboxId}\` with the commandId ${
          cmd.cmdId
        }.`
      }

      writer.write({
        id: toolCallId,
        type: 'data-run-command',
        data: {
          sandboxId,
          commandId: cmd.cmdId,
          command,
          args,
          status: 'waiting',
        },
      })

      const done = await cmd.wait()
      try {
        const [stdout, stderr] = await Promise.all([
          done.stdout(),
          done.stderr(),
        ])

        writer.write({
          id: toolCallId,
          type: 'data-run-command',
          data: {
            sandboxId,
            commandId: cmd.cmdId,
            command,
            args,
            exitCode: done.exitCode,
            status: 'done',
          },
        })

        return (
          `The command \`${command} ${args.join(
            ' '
          )}\` has finished with exit code ${done.exitCode}.` +
          `Stdout of the command was: \n` +
          `\`\`\`\n${stdout}\n\`\`\`\n` +
          `Stderr of the command was: \n` +
          `\`\`\`\n${stderr}\n\`\`\``
        )
      } catch (error) {
        const richError = getRichError({
          action: 'wait for command to finish',
          args: { sandboxId, commandId: cmd.cmdId },
          error,
        })

        writer.write({
          id: toolCallId,
          type: 'data-run-command',
          data: {
            sandboxId,
            commandId: cmd.cmdId,
            command,
            args,
            error: richError.error,
            status: 'error',
          },
        })

        return richError.message
      }
    },
  })
