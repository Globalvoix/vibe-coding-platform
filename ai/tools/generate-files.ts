import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Sandbox } from 'e2b'
import { getContents, type File } from './generate-files/get-contents'
import { getRichError } from './get-rich-error'
import { getWriteFiles } from './generate-files/get-write-files'
import { tool } from 'ai'
import description from './generate-files.md'
import z from 'zod/v3'
import { GenerationSessionTracker } from '@/lib/generation-session-tracker'

interface Params {
  modelId: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  sessionTracker?: GenerationSessionTracker | null
}

export const generateFiles = ({ writer, modelId, sessionTracker }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      sandboxId: z.string(),
      paths: z.array(z.string()),
    }),
    execute: async ({ sandboxId, paths }, { toolCallId, messages }) => {
      if (sessionTracker) {
        const isCancelled = await GenerationSessionTracker.isCancelled(sessionTracker.id)
        if (isCancelled) {
          throw new Error('Generation cancelled')
        }
        await sessionTracker.updateProgress({
          stage: 'generating',
          message: 'Generating files',
          paths: [],
          filesCount: 0,
          completionPercentage: 30,
        })
      }

      writer.write({
        id: toolCallId,
        type: 'data-generating-files',
        data: { paths: [], status: 'generating' },
      })

      let sandbox: Sandbox | null = null

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
          type: 'data-generating-files',
          data: { error: richError.error, paths: [], status: 'error' },
        })

        return richError.message
      }

      const writeFiles = getWriteFiles({ sandbox, sandboxId, toolCallId, writer })
      const iterator = getContents({ messages, modelId, paths })
      const uploaded: File[] = []

      try {
        for await (const chunk of iterator) {
          if (sessionTracker) {
            const isCancelled = await GenerationSessionTracker.isCancelled(sessionTracker.id)
            if (isCancelled) {
              await sessionTracker.updateProgress({
                stage: 'done',
                message: 'Generation cancelled',
                completionPercentage: 100,
              })
              throw new Error('Generation cancelled')
            }
          }

          if (chunk.files.length > 0) {
            const error = await writeFiles(chunk)
            if (error) {
              return error
            } else {
              uploaded.push(...chunk.files)
              if (sessionTracker) {
                await sessionTracker.updateProgress({
                  stage: 'generating',
                  message: 'Writing files',
                  paths: uploaded.map((file) => file.path),
                  filesCount: uploaded.length,
                  completionPercentage: 30 + Math.min(60, uploaded.length),
                })
              }
            }
          } else {
            if (sessionTracker) {
              await sessionTracker.updateProgress({
                stage: 'generating',
                message: 'Preparing file contents',
                paths: chunk.paths,
                filesCount: uploaded.length,
                completionPercentage: 30,
              })
            }

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

        return richError.message
      }

      writer.write({
        id: toolCallId,
        type: 'data-generating-files',
        data: { paths: uploaded.map((file) => file.path), status: 'done' },
      })

      if (sessionTracker) {
        await sessionTracker.updateProgress({
          stage: 'validating',
          message: 'Files generated. Validating project...',
          paths: uploaded.map((file) => file.path),
          filesCount: uploaded.length,
          completionPercentage: 92,
        })
      }

      return `Successfully generated and uploaded ${
        uploaded.length
      } files. Their paths and contents are as follows:
        ${uploaded
          .map((file) => `Path: ${file.path}\nContent: ${file.content}\n`)
          .join('\n')}`
    },
  })
