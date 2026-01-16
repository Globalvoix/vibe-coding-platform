import type { DataPart } from '../../messages/data-parts'
import type { File } from './get-contents'
import type { Sandbox } from '@vercel/sandbox'
import type { UIMessageStreamWriter, UIMessage } from 'ai'
import { getRichError } from '../get-rich-error'
import { generationLogger } from '../generation-logger'
import { validateGeneratedFiles } from '@/lib/code-semantic-validator'

interface Params {
  sandbox: Sandbox
  toolCallId: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
}

export function getWriteFiles({ sandbox, toolCallId, writer }: Params) {
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
      const integrityChecksEnabled = isFeatureEnabled('integrityChecks')

      if (integrityChecksEnabled) {
        generationLogger.progress('file_write', `Writing ${params.files.length} files with integrity verification`)
        await sandboxFileOps.writeFilesWithVerification(sandbox, params.files)
        generationLogger.success('file_write', `All ${params.files.length} files written and verified`)
      } else {
        await sandbox.writeFiles(
          params.files.map((file) => ({
            content: Buffer.from(file.content, 'utf8'),
            path: file.path,
          }))
        )
      }
    } catch (error) {
      const richError = getRichError({
        action: 'write files to sandbox',
        args: params,
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
