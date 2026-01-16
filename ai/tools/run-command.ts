import type { UIMessageStreamWriter, UIMessage } from 'ai'
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

function buildInstallFallbackSequence(
  currentPM: 'npm' | 'yarn' | 'pnpm'
): { pm: 'npm' | 'yarn' | 'pnpm'; flags: string[] }[] {
  const pmPreference = getPackageManagerPreference()
  const fallbackSequence: { pm: 'npm' | 'yarn' | 'pnpm'; flags: string[] }[] = []

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

  if (!fallbackSequence.some((x) => x.pm === currentPM)) {
    fallbackSequence.unshift({ pm: currentPM, flags: ['install'] })
  }

  return fallbackSequence
}

export const runCommand = ({ writer }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      sandboxId: z.string().describe('The ID of the Vercel Sandbox to run the command in'),
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
      sudo: z.boolean().optional().describe('Whether to run the command with sudo'),
      wait: z
        .boolean()
        .describe(
          'Whether to wait for the command to finish before returning. If true, the command will block until it completes, and you will receive its output.'
        ),
    }),
    execute: async ({ sandboxId, command, sudo, wait, args = [] }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: 'data-run-command',
        data: { sandboxId, command, args, status: 'executing' },
      })

      let sandbox: Sandbox

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

      // If we don't wait, behave like the original: start in background and return immediately.
      if (!wait) {
        const cmd = await sandbox.runCommand({
          detached: true,
          cmd: command,
          args,
          sudo,
        })

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

      const isInstallCommand = (cmd: string, cmdArgs: string[]) => {
        if (cmd === 'npm' || cmd === 'yarn' || cmd === 'pnpm') return cmdArgs[0] === 'install'
        return cmd.toLowerCase().includes('install')
      }

      const currentPM = (command === 'npm' || command === 'yarn' || command === 'pnpm' ? command : 'npm') as
        | 'npm'
        | 'yarn'
        | 'pnpm'

      const isRetryableCommand =
        (command === 'npm' || command === 'yarn' || command === 'pnpm') &&
        (args[0] === 'install' || args[0] === 'run' || args[0] === 'build')

      const runForeground = async (cmdToRun: string, argsToRun: string[]) => {
        try {
          const res = await sandbox.runCommand({
            cmd: cmdToRun,
            args: argsToRun,
            sudo,
          })
          return res
        } catch (error) {
          const richError = getRichError({
            action: 'run command in sandbox',
            args: { sandboxId, command: cmdToRun, args: argsToRun },
            error,
          })

          if (richError.classification?.isRetryable) {
            generationLogger.progress('run_command', `Command failed with transient error: ${cmdToRun}`)
          }

          throw error
        }
      }

      let cmd: Command

      try {
        if (isRetryableCommand && isFeatureEnabled('aggressiveRecovery')) {
          cmd = await defaultRetryStrategy.execute(
            () => runForeground(command, args),
            `${command} ${args.join(' ')}`
          )
        } else {
          cmd = await runForeground(command, args)
        }

        if (isFeatureEnabled('fallbackStrategies') && isInstallCommand(command, args) && cmd.exitCode !== 0) {
          generationLogger.progress(
            'run_command',
            `Install command failed with exit code ${cmd.exitCode}, attempting PM fallback`
          )

          const fallbackSequence = buildInstallFallbackSequence(currentPM)
          let fallbackSuccess = false

          for (const { pm, flags: fallbackFlags } of fallbackSequence) {
            if (pm === currentPM && JSON.stringify(fallbackFlags) === JSON.stringify(args)) {
              continue
            }

            try {
              generationLogger.progress('run_command', `Attempting fallback: ${pm} ${fallbackFlags.join(' ')}`)
              const fallbackCmd = await runForeground(pm, fallbackFlags)

              if (fallbackCmd.exitCode === 0) {
                generationLogger.success('run_command', `Fallback succeeded with ${pm} ${fallbackFlags.join(' ')}`)
                cmd = fallbackCmd
                fallbackSuccess = true
                break
              }
            } catch {
              generationLogger.progress('run_command', `Fallback ${pm} ${fallbackFlags.join(' ')} failed, trying next`)
            }
          }

          if (!fallbackSuccess) {
            generationLogger.error(
              'run_command',
              'All fallback attempts failed',
              'INSTALL_FAILED',
              'Install command and all fallbacks failed'
            )
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
          status: 'waiting',
        },
      })

      const done = await cmd.wait()

      try {
        const [stdout, stderr] = await Promise.all([done.stdout(), done.stderr()])

        const combinedOutput = `${stdout}\n${stderr}`
        let parsedErrors: ReturnType<typeof buildOutputParser.parseInstallOutput> | null = null

        if (isFeatureEnabled('buildOutputParsing')) {
          if (command === 'npm' || command === 'yarn' || command === 'pnpm') {
            parsedErrors = buildOutputParser.parseInstallOutput(stdout, stderr, currentPM)

            if (parsedErrors.length > 0) {
              generationLogger.progress('run_command', `Parsed ${parsedErrors.length} errors from build output`)

              if (isFeatureEnabled('autoTargetedInstall') && done.exitCode !== 0) {
                generationLogger.progress('run_command', 'Attempting to auto-install missing packages')
                const installResults = await autoInstallMissingPackages(sandbox, combinedOutput, currentPM)

                if (installResults.length > 0 && installResults.some((r) => r.installed)) {
                  generationLogger.progress(
                    'run_command',
                    `Auto-installed ${installResults.filter((r) => r.installed).length} packages, retrying command`
                  )

                  try {
                    const retryDone = await sandbox.runCommand({
                      cmd: command,
                      args,
                      sudo,
                    })

                    if (retryDone.exitCode === 0) {
                      generationLogger.success('run_command', 'Command succeeded after auto-install')
                      const retryStdout = await retryDone.stdout()
                      return `Auto-installed ${installResults.filter((r) => r.installed).length} packages and re-ran command successfully.\n\nRetry output:\n\`\`\`\n${retryStdout}\n\`\`\``
                    }
                  } catch {
                    generationLogger.progress(
                      'run_command',
                      'Command still failed after auto-install, continuing with error report'
                    )
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
          `The command \`${command} ${args.join(' ')}\` has finished with exit code ${done.exitCode}.` +
          `\n\nStdout of the command was: \n` +
          `\`\`\`\n${stdout}\n\`\`\`\n` +
          `Stderr of the command was: \n` +
          `\`\`\`\n${stderr}\n\`\`\``

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
