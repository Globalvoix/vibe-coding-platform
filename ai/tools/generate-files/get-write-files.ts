import type { DataPart } from '../../messages/data-parts'
import type { File } from './get-contents'
import type { Sandbox } from 'e2b'
import type { UIMessageStreamWriter, UIMessage } from 'ai'
import { getRichError } from '../get-rich-error'
import { generationLogger } from '../generation-logger'
import { validateGeneratedFiles } from '@/lib/code-semantic-validator'

interface Params {
  sandbox: Sandbox
  sandboxId: string
  toolCallId: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
}

export function getWriteFiles({ sandbox, sandboxId, toolCallId, writer }: Params) {
  return async function writeFiles(params: {
    written: string[]
    files: File[]
    paths: string[]
  }) {
    const paths = params.written.concat(params.files.map((file) => file.path))
    writer.write({
      id: toolCallId,
      type: 'data-generating-files',
      data: { paths, status: 'uploading' },
    })

    try {
      generationLogger.progress('file_write', `Validating ${params.files.length} files before upload`)

      const validationResult = validateGeneratedFiles(
        params.files.map((file) => ({
          path: file.path,
          content: file.content,
        }))
      )

      if (!validationResult.isValid) {
        const errorSummary = validationResult.errors
          .slice(0, 3)
          .map((e) => `${e.file}: ${e.message}`)
          .join('\n')

        const message = `Pre-write validation failed:\n${errorSummary}`
        generationLogger.error('file_write', message, 'VALIDATION_ERROR', message)

        writer.write({
          id: toolCallId,
          type: 'data-generating-files',
          data: {
            error: { message },
            status: 'error',
            paths: params.paths,
          },
        })

        return message
      }

      generationLogger.progress('file_write', `Writing ${params.files.length} validated files to sandbox`)

      // Write files to E2B sandbox in parallel + stream content to Monaco
      await Promise.all(
        params.files.map(async (file) => {
          let content = file.content
          if (typeof content !== 'string') {
            content = String(content)
          }

          await sandbox.files.write(file.path, content)

          // Stream file content to the frontend so Monaco can display it immediately
          writer.write({
            id: toolCallId,
            type: 'data-file-content',
            data: { sandboxId, path: file.path, content },
          })
        })
      )

      generationLogger.success('file_write', `Successfully wrote ${params.files.length} files to sandbox`)
    } catch (error) {
      const richError = getRichError({
        action: 'write files to sandbox',
        args: {
          fileCount: params.files.length,
          paths: params.paths,
          firstError: error instanceof Error ? error.message : 'unknown',
        },
        error,
      })

      generationLogger.error(
        'file_write',
        'Failed to write files to sandbox',
        'FILE_WRITE_ERROR',
        String(error)
      )

      writer.write({
        id: toolCallId,
        type: 'data-generating-files',
        data: {
          error: richError.error,
          status: 'error',
          paths: params.paths,
        },
      })

      return richError.message
    }

    writer.write({
      id: toolCallId,
      type: 'data-generating-files',
      data: { paths, status: 'uploaded' },
    })
  }
}
