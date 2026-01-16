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
import { isFeatureEnabled, getPackageManagerPreference } from '@/lib/generation-config'
import { autoInstallMissingPackages } from './auto-install-missing-packages'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
}

/**
 * Build install command with fallback sequence for a specific package manager
 */
function buildInstallFallbackSequence(currentPM: 'npm' | 'yarn' | 'pnpm'): { pm: 'npm' | 'yarn' | 'pnpm', flags: string[] }[] {
  const pmPreference = getPackageManagerPreference()
  const fallbackSequence: { pm: 'npm' | 'yarn' | 'pnpm', flags: string[] }[] = []

  // Build fallback sequence starting with preferred PMs
  for (const pm of pmPreference) {
    if (pm === 'pnpm') {
      fallbackSequence.push({ pm: 'pnpm', flags: ['install', '--force'] })
      fallbackSequence.push({ pm: 'pnpm', flags: ['install'] })
    } else if (pm === 'yarn') {
      fallbackSequence.push({ pm: 'yarn', flags: ['install', '--ignore-engines'] })
      fallbackSequence.push({ pm: 'yarn', flags: ['install'] })
    } else if (pm === 'npm') {
      fallbackSequence.push({ pm: 'npm', flags: ['install', '--legacy-peer-deps'] })
      fallbackSequence.push({ pm: 'npm', flags: ['install'] })
    }
  }

  return fallbackSequence
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

      // Detect if this is an install command specifically
      const isInstallCommand = (cmd: string, cmdArgs?: string[]) => {
        return cmd === 'npm' || cmd === 'yarn' || cmd === 'pnpm' ? cmdArgs?.[0] === 'install' : cmd.includes('install')
      }

      const currentPM = (command === 'npm' || command === 'yarn' || command === 'pnpm' ? command : 'npm') as 'npm' | 'yarn' | 'pnpm'

      const executeCommand = async (pm?: 'npm' | 'yarn' | 'pnpm', flags?: string[]) => {
        try {
          const cmdToRun = pm || command
          const argsToRun = flags || args

          const result = await sandbox.runCommand({
            detached: true,
            cmd: cmdToRun,
            args: argsToRun,
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

        // If install failed and fallback is enabled, try alternate package managers
        if (isFeatureEnabled('fallbackStrategies') && isInstallCommand(command, args) && cmd.exitCode !== 0) {
          generationLogger.progress('run_command', `Install command failed with exit code ${cmd.exitCode}, attempting PM fallback`)

          const fallbackSequence = buildInstallFallbackSequence(currentPM)
          let fallbackSuccess = false

          for (const { pm, flags: fallbackFlags } of fallbackSequence) {
            if (pm === currentPM && JSON.stringify(fallbackFlags) === JSON.stringify(args)) {
              // Skip the exact same command we already tried
              continue
            }

            try {
              generationLogger.progress('run_command', `Attempting fallback: ${pm} ${fallbackFlags.join(' ')}`)
              const fallbackCmd = await executeCommand(pm, fallbackFlags)

              if (fallbackCmd.exitCode === 0) {
                generationLogger.success('run_command', `Fallback succeeded with ${pm} ${fallbackFlags.join(' ')}`)
                cmd = fallbackCmd
                fallbackSuccess = true
                break
              }
            } catch (fallbackError) {
              generationLogger.progress('run_command', `Fallback ${pm} ${fallbackFlags.join(' ')} failed, trying next`)
              continue
            }
          }

          if (!fallbackSuccess) {
            generationLogger.error('run_command', 'All fallback attempts failed', 'INSTALL_FAILED', 'Install command and all fallbacks failed')
          }
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

        // Parse build/install output for specific errors
        let parsedErrors = null
        const combinedOutput = `${stdout}\n${stderr}`

        if (command === 'npm' || command === 'yarn' || command === 'pnpm' || command.includes('npm') || command.includes('yarn') || command.includes('pnpm')) {
          if (done.exitCode !== 0) {
            const parser = buildOutputParser
            parsedErrors = parser.parseInstallOutput(stdout as string, stderr as string, (command === 'npm' ? 'npm' : command === 'yarn' ? 'yarn' : 'pnpm') as 'npm' | 'yarn' | 'pnpm')

            if (parsedErrors.length > 0) {
              generationLogger.progress('run_command', `Parsed ${parsedErrors.length} errors from build output`)

              // Try auto-install missing packages if feature is enabled
              if (isFeatureEnabled('autoTargetedInstall')) {
                generationLogger.progress('run_command', 'Attempting to auto-install missing packages')
                const installResults = await autoInstallMissingPackages(sandbox, combinedOutput, currentPM)

                if (installResults.length > 0 && installResults.some((r) => r.installed)) {
                  generationLogger.progress('run_command', `Auto-installed ${installResults.filter((r) => r.installed).length} packages, retrying command`)

                  // Retry the command after auto-install
                  try {
                    const retryCmd = await sandbox.runCommand({
                      detached: true,
                      cmd: command,
                      args,
                      sudo,
                    })
                    const retryDone = await retryCmd.wait()

                    if (retryDone.exitCode === 0) {
                      generationLogger.success('run_command', 'Command succeeded after auto-install')
                      const retryStdout = await retryDone.stdout()
                      const retrySummary = `Auto-installed ${installResults.filter((r) => r.installed).length} packages and re-ran command successfully.\n\nRetry output:\n\`\`\`\n${retryStdout}\n\`\`\``
                      return retrySummary
                    }
                  } catch (retryError) {
                    generationLogger.progress('run_command', 'Command still failed after auto-install, continuing with error report')
                  }
                }
              }
            }
          }
        }

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

        let resultMessage =
          `The command \`${command} ${args.join(
            ' '
          )}\` has finished with exit code ${done.exitCode}.` +
          `\n\nStdout of the command was: \n` +
          `\`\`\`\n${stdout}\n\`\`\`\n` +
          `Stderr of the command was: \n` +
          `\`\`\`\n${stderr}\n\`\`\``

        // Append parsed errors if any
        if (parsedErrors && parsedErrors.length > 0) {
          const summary = buildOutputParser.generateSummary(parsedErrors)
          resultMessage += `\n\n## Parsed Error Summary:\n${summary}`
        }

        return resultMessage
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
