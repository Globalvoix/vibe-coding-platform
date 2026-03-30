import { Sandbox } from 'e2b'
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
    const contentStr = content.toString('utf8')

    try {
      generationLogger.progress('file_write', `Writing file: ${file.path}`)

      // Write file to sandbox using E2B API
      await sandbox.files.write(file.path, contentStr)

      // Read file back to verify
      const readBack = await sandbox.files.read(file.path)
      const readBackBuffer = Buffer.from(readBack, 'utf8')
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
      const text = await sandbox.files.read('package.json')
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
   * Read a file from sandbox and return its text content
   */
  async readFileText(sandbox: Sandbox, path: string): Promise<string | null> {
    try {
      return await sandbox.files.read(path)
    } catch {
      return null
    }
  }

  /**
   * Check if file exists in sandbox
   */
  async fileExists(sandbox: Sandbox, path: string): Promise<boolean> {
    try {
      await sandbox.files.read(path)
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
      const content = await sandbox.files.read(path)
      return Buffer.byteLength(content, 'utf8')
    } catch {
      return 0
    }
  }

  /**
   * Create backup of file
   */
  async createBackup(sandbox: Sandbox, path: string): Promise<boolean> {
    try {
      const content = await sandbox.files.read(path)
      const backupPath = `${path}.backup`
      await sandbox.files.write(backupPath, content)
      return true
    } catch (error) {
      generationLogger.error('file_write', `Failed to create backup of ${path}`, 'BACKUP_ERROR', String(error))
      return false
    }
  }
}

export const sandboxFileOps = new SandboxFileOperations()
