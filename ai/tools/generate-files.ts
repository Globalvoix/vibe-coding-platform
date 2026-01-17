import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Sandbox } from '@vercel/sandbox'
import { getContents, type File } from './generate-files/get-contents'
import { getRichError } from './get-rich-error'
import { getWriteFiles } from './generate-files/get-write-files'
import { tool } from 'ai'
import description from './generate-files.md'
import z from 'zod/v3'
import { upsertProjectFiles } from '@/lib/project-files-db'
import { buildGenerationBlueprint } from '@/lib/generation-blueprint'
import { validateGeneratedFiles } from '@/lib/code-semantic-validator'
import { detectMissingDependencies, generateInstallCommand } from '@/lib/missing-dependencies-detector'
import { sandboxFileOps } from './sandbox-file-operations'
import { GenerationSessionTracker } from '@/lib/generation-session-tracker'

interface Params {
  modelId: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  userId: string
  projectId?: string
}

export const generateFiles = ({ writer, modelId, userId, projectId }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      sandboxId: z.string(),
      paths: z.array(z.string()),
    }),
    execute: async ({ sandboxId, paths }, { toolCallId, messages }) => {
      const sessionTracker = new GenerationSessionTracker(toolCallId, projectId || '', userId)

      try {
        // Initialize session tracking
        if (projectId) {
          await sessionTracker.initialize(sandboxId)
        }

        writer.write({
          id: toolCallId,
          type: 'data-generating-files',
          data: { paths: [], status: 'generating' },
        })

        // Step 1: Build generation blueprint for context
        writer.write({
          id: toolCallId,
          type: 'data-generating-files',
          data: { paths: [], status: 'analyzing', message: 'Analyzing generation requirements...' },
        })

        if (projectId) {
          await sessionTracker.updateProgress({
            stage: 'analyzing',
            message: 'Analyzing generation requirements...',
          })
        }

        const blueprint = buildGenerationBlueprint({
          paths,
          userRequest: messages[messages.length - 1]?.content?.toString() ?? '',
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
            type: 'data-generating-files',
            data: { error: richError.error, paths: [], status: 'error' },
          })

          if (projectId) {
            await sessionTracker.complete('error')
          }
          return richError.message
        }

        const writeFiles = getWriteFiles({ sandbox, toolCallId, writer })
        const iterator = getContents({ messages, modelId, paths, blueprint })
        const uploaded: File[] = []
        const allGeneratedFiles: File[] = []

        const persistFiles = async (files: File[]) => {
          if (!projectId) return
          if (files.length === 0) return

          try {
            await upsertProjectFiles({
              userId,
              projectId,
              files: files.map((file) => ({ path: file.path, content: file.content })),
            })
          } catch {
            // best-effort persistence
          }
        }

        try {
          for await (const chunk of iterator) {
            // Check if generation was cancelled
            if (projectId) {
              const isCancelled = await GenerationSessionTracker.isCancelled(toolCallId)
              if (isCancelled) {
                if (projectId) {
                  await sessionTracker.complete('cancelled')
                }

                writer.write({
                  id: toolCallId,
                  type: 'data-generating-files',
                  data: {
                    paths,
                    status: 'error',
                    error: { message: 'Generation was cancelled by user' },
                  },
                })
                return 'Generation was cancelled by user.'
              }
            }

            if (chunk.files.length > 0) {
              // Collect for later validation
              allGeneratedFiles.push(...chunk.files)

              const error = await writeFiles(chunk)
              if (error) {
                if (projectId) {
                  await sessionTracker.complete('error')
                }
                return error
              }

              uploaded.push(...chunk.files)
              await persistFiles(chunk.files)
            } else {
              writer.write({
                id: toolCallId,
                type: 'data-generating-files',
                data: {
                  status: 'generating',
                  paths: chunk.paths,
                },
              })
            }
          }
        } catch (error) {
          const richError = getRichError({
            action: 'generate file contents',
            args: { modelId, paths },
            error,
          })

          writer.write({
            id: toolCallId,
            type: 'data-generating-files',
            data: {
              error: richError.error,
              status: 'error',
              paths,
            },
          })

          if (projectId) {
            await sessionTracker.complete('error')
          }
          return richError.message
        }

        // Step 2: Validate generated files
        writer.write({
          id: toolCallId,
          type: 'data-generating-files',
          data: { paths: uploaded.map((f) => f.path), status: 'validating', message: 'Validating generated code...' },
        })

        if (projectId) {
          await sessionTracker.updateProgress({
            stage: 'validating',
            message: 'Validating generated code...',
            filesCount: uploaded.length,
          })
        }

        const validationResult = validateGeneratedFiles(
          uploaded.map((file) => ({
            path: file.path,
            content: file.content,
          })),
          blueprint.componentStructure.routes
        )

        if (!validationResult.isValid) {
          const errorMessages = validationResult.errors.map((e) => `${e.file}: ${e.message}`).join('\n')
          if (projectId) {
            await sessionTracker.complete('error')
          }
          return `Code generation had validation errors:\n\n${errorMessages}\n\nPlease try again or specify corrections.`
        }

        // Step 3: Detect and install missing dependencies
        writer.write({
          id: toolCallId,
          type: 'data-generating-files',
          data: { paths: uploaded.map((f) => f.path), status: 'analyzing', message: 'Checking for missing dependencies...' },
        })

        // Get package.json to check what's installed
        let packageJsonContent = ''
        let packageJsonFile = uploaded.find((f) => f.path === 'package.json')
        let wasPackageJsonGenerated = false

        try {
          if (packageJsonFile) {
            packageJsonContent = packageJsonFile.content
            wasPackageJsonGenerated = true
          } else {
            // Try to read from sandbox if not generated
            if (sandbox) {
              const pkgText = await sandboxFileOps.readFileText(sandbox, 'package.json')
              if (typeof pkgText === 'string') {
                packageJsonContent = pkgText
              }
            }
          }
        } catch (error) {
          console.error('Failed to read package.json:', error)
        }

        // If we couldn't read package.json, skip dependency detection to avoid false positives
        if (!packageJsonContent || packageJsonContent.trim().length === 0) {
          writer.write({
            id: toolCallId,
            type: 'data-generating-files',
            data: {
              paths: uploaded.map((f) => f.path),
              status: 'analyzing',
              message: 'Skipping dependency check (package.json could not be read from sandbox).',
            },
          })

          writer.write({
            id: toolCallId,
            type: 'data-generating-files',
            data: { paths: uploaded.map((file) => file.path), status: 'done' },
          })

          if (projectId) {
            await sessionTracker.complete('completed')
          }

          const pathList = uploaded.map((file) => `- ${file.path}`).join('\n')
          return `Successfully generated and validated ${uploaded.length} files.\n\nPaths:\n${pathList}`
        }

        // Detect missing dependencies
        const dependencyReport = detectMissingDependencies(
          uploaded.map((f) => ({ path: f.path, content: f.content })),
          packageJsonContent
        )

        if (dependencyReport.missingPackages.length > 0) {
          writer.write({
            id: toolCallId,
            type: 'data-generating-files',
            data: {
              paths: uploaded.map((f) => f.path),
              status: 'analyzing',
              message: `Installing ${dependencyReport.missingPackages.length} missing package(s): ${dependencyReport.missingPackages.join(', ')}...`,
            },
          })

          if (projectId) {
            await sessionTracker.updateProgress({
              stage: 'installing-deps',
              message: `Installing ${dependencyReport.missingPackages.length} missing package(s)`,
              filesCount: uploaded.length,
            })
          }

          try {
            // Attempt to install missing packages
            const installCommand = generateInstallCommand(dependencyReport.missingPackages, 'npm')
            console.log(`Installing missing dependencies: ${installCommand}`)

            if (sandbox) {
              const cmdResult = await sandbox.runCommand({
                cmd: 'npm',
                args: ['install', ...dependencyReport.missingPackages],
                detached: false,
              })

              if (cmdResult.exitCode === 0) {
                writer.write({
                  id: toolCallId,
                  type: 'data-generating-files',
                  data: {
                    paths: uploaded.map((f) => f.path),
                    status: 'analyzing',
                    message: `✅ Successfully installed ${dependencyReport.missingPackages.length} package(s)`,
                  },
                })
              } else {
                const stderr = await cmdResult.stderr()
                writer.write({
                  id: toolCallId,
                  type: 'data-generating-files',
                  data: {
                    paths: uploaded.map((f) => f.path),
                    status: 'analyzing',
                    message: `⚠️  Could not auto-install all dependencies. Please run: ${installCommand}`,
                  },
                })
                console.error('npm install failed:', stderr)
              }
            }
          } catch (error) {
            const installCommand = generateInstallCommand(dependencyReport.missingPackages, 'npm')
            writer.write({
              id: toolCallId,
              type: 'data-generating-files',
              data: {
                paths: uploaded.map((f) => f.path),
                status: 'analyzing',
                message: `⚠️  Could not auto-install dependencies. Please run: ${installCommand}`,
              },
            })
            console.error('Dependency installation error:', error)
          }
        }

        writer.write({
          id: toolCallId,
          type: 'data-generating-files',
          data: { paths: uploaded.map((file) => file.path), status: 'done' },
        })

        if (projectId) {
          await sessionTracker.complete('completed')
        }

        const pathList = uploaded.map((file) => `- ${file.path}`).join('\n')
        const depsInfo =
          dependencyReport.missingPackages.length > 0
            ? `\n\n📦 Dependencies: ${dependencyReport.summary}`
            : ''
        return `Successfully generated and validated ${uploaded.length} files.\n\nPaths:\n${pathList}${depsInfo}`
      } catch (error) {
        console.error('Generation session error:', error)
        if (projectId) {
          await sessionTracker.complete('error')
        }
        throw error
      }
    },
  })
