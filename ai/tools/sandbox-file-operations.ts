import { Sandbox } from '@vercel/sandbox'
import { createHash } from 'crypto'
import { generationLogger } from './generation-logger'

export interface FileOperation {
  path: string
  content: string | Buffer
  encoding?: BufferEncoding
}

export interface WriteFileResult {
  success: boolean
  path: string
  size: number
  checksum: string
  verified: boolean
  error?: string
}

/**
 * Wrapper for sandbox file operations with integrity checks
 */
export class SandboxFileOperations {
  /**
   * Write files with integrity verification
   */
  async writeFilesWithVerification(
    sandbox: Sandbox,
    files: FileOperation[]
  ): Promise<WriteFileResult[]> {
    const results: WriteFileResult[] = []

    for (const file of files) {
      try {
        const result = await this.writeFileWithVerification(sandbox, file)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          path: file.path,
          size: 0,
          checksum: '',
          verified: false,
          error: String(error),
        })
      }
    }

    return results
  }

  /**
   * Write a single file with integrity verification
   */
  async writeFileWithVerification(sandbox: Sandbox, file: FileOperation): Promise<WriteFileResult> {
    const content = typeof file.content === 'string' ? Buffer.from(file.content) : file.content
    const originalChecksum = this.calculateChecksum(content)

    try {
      generationLogger.progress('file_write', `Writing file: ${file.path}`)

      // Write file to sandbox
      await sandbox.writeFiles([
        {
          path: file.path,
          data: content,
        },
      ])

      // Read file back to verify
      const readBack = await sandbox.readFile({ path: file.path })
      const readBackBuffer = Buffer.isBuffer(readBack) ? readBack : Buffer.from(readBack)
      const readBackChecksum = this.calculateChecksum(readBackBuffer)

      const verified = originalChecksum === readBackChecksum

      if (!verified) {
        throw new Error(
          `Checksum mismatch for ${file.path}: expected ${originalChecksum}, got ${readBackChecksum}`
        )
      }

      generationLogger.success('file_write', `File written and verified: ${file.path}`)

      return {
        success: true,
        path: file.path,
        size: content.length,
        checksum: originalChecksum,
        verified: true,
      }
    } catch (error) {
      const errorMsg = String(error)
      generationLogger.error('file_write', `Failed to write file: ${file.path}`, 'FILE_WRITE_ERROR', errorMsg)

      return {
        success: false,
        path: file.path,
        size: content.length,
        checksum: originalChecksum,
        verified: false,
        error: errorMsg,
      }
    }
  }

  /**
   * Read and parse package.json
   */
  async readPackageJson(sandbox: Sandbox): Promise<Record<string, unknown> | null> {
    try {
      const content = await sandbox.readFile({ path: 'package.json' })
      const text = typeof content === 'string' ? content : content.toString()
      return JSON.parse(text) as Record<string, unknown>
    } catch (error) {
      generationLogger.error(
        'file_read',
        'Failed to read package.json',
        'PACKAGE_JSON_READ_ERROR',
        String(error)
      )
      return null
    }
  }

  /**
   * Write package.json with validation
   */
  async writePackageJson(sandbox: Sandbox, pkg: Record<string, unknown>): Promise<boolean> {
    try {
      // Validate structure
      if (!pkg.name || !pkg.version) {
        throw new Error('Invalid package.json: missing name or version')
      }

      // Pretty-print JSON
      const content = JSON.stringify(pkg, null, 2)

      // Write with verification
      const result = await this.writeFileWithVerification(sandbox, {
        path: 'package.json',
        content,
      })

      return result.success && result.verified
    } catch (error) {
      generationLogger.error(
        'file_write',
        'Failed to write package.json',
        'PACKAGE_JSON_WRITE_ERROR',
        String(error)
      )
      return false
    }
  }

  /**
   * Merge dependencies into package.json
   */
  async mergeDependencies(
    sandbox: Sandbox,
    newDeps: Record<string, string>,
    depType: 'dependencies' | 'devDependencies' = 'dependencies'
  ): Promise<boolean> {
    try {
      const pkg = await this.readPackageJson(sandbox)
      if (!pkg) {
        throw new Error('Could not read package.json')
      }

      // Ensure dependency section exists
      if (!(depType in pkg)) {
        pkg[depType] = {}
      }

      const currentDeps = pkg[depType] as Record<string, unknown>
      if (typeof currentDeps !== 'object' || currentDeps === null) {
        throw new Error(`Invalid ${depType} structure`)
      }

      // Merge new dependencies
      Object.assign(currentDeps, newDeps)

      // Write back
      return await this.writePackageJson(sandbox, pkg)
    } catch (error) {
      generationLogger.error(
        'file_write',
        `Failed to merge ${depType}`,
        'DEPENDENCY_MERGE_ERROR',
        String(error)
      )
      return false
    }
  }

  /**
   * Calculate SHA256 checksum of content
   */
  private calculateChecksum(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex')
  }

  /**
   * Check if file exists in sandbox
   */
  async fileExists(sandbox: Sandbox, path: string): Promise<boolean> {
    try {
      await sandbox.readFile({ path })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get file size
   */
  async getFileSize(sandbox: Sandbox, path: string): Promise<number> {
    try {
      const content = await sandbox.readFile({ path })
      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content)
      return buffer.length
    } catch {
      return 0
    }
  }

  /**
   * Create backup of file
   */
  async createBackup(sandbox: Sandbox, path: string): Promise<boolean> {
    try {
      const content = await sandbox.readFile({ path })
      const backupPath = `${path}.backup`

      await sandbox.writeFiles([
        {
          path: backupPath,
          data: Buffer.isBuffer(content) ? content : Buffer.from(content),
        },
      ])

      return true
    } catch (error) {
      generationLogger.error('file_write', `Failed to create backup of ${path}`, 'BACKUP_ERROR', String(error))
      return false
    }
  }
}

export const sandboxFileOps = new SandboxFileOperations()
