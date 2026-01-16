import { Sandbox } from '@vercel/sandbox'
import { sandboxHealthChecker } from './sandbox-health-check'
import { generationLogger } from './generation-logger'

export interface PreGenerationValidationResult {
  valid: boolean
  sandboxHealthy: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

/**
 * Validates project state before code generation starts
 */
export class PreGenerationValidator {
  /**
   * Run comprehensive pre-generation validation
   */
  async validate(sandbox: Sandbox, port?: number): Promise<PreGenerationValidationResult> {
    const result: PreGenerationValidationResult = {
      valid: true,
      sandboxHealthy: false,
      errors: [],
      warnings: [],
      suggestions: [],
    }

    generationLogger.start('validation', 'Starting pre-generation validation')

    try {
      // 1. Check sandbox health
      const healthResult = await sandboxHealthChecker.checkHealth(sandbox, port)
      result.sandboxHealthy = healthResult.healthy
      result.errors.push(...healthResult.errors)
      result.warnings.push(...healthResult.warnings)

      if (!result.sandboxHealthy) {
        result.valid = false
        result.suggestions.push('Resolve sandbox health issues before proceeding with generation')
      }

      // 2. Check Node version compatibility
      try {
        await this.validateNodeVersion(sandbox, result)
      } catch (error) {
        result.warnings.push(`Node version check failed: ${String(error)}`)
      }

      // 3. Check package manager availability
      try {
        await this.validatePackageManagers(sandbox, result)
      } catch (error) {
        result.warnings.push(`Package manager check failed: ${String(error)}`)
      }

      // 4. Check for conflicting processes
      try {
        await this.checkConflictingProcesses(sandbox, result)
      } catch (error) {
        result.warnings.push(`Process conflict check failed: ${String(error)}`)
      }

      if (result.errors.length > 0) {
        result.valid = false
      }

      const status = result.valid ? 'success' : 'error'
      generationLogger.progress(
        'validation',
        `Validation complete: ${result.valid ? 'PASS' : 'FAIL'} (${result.errors.length} errors, ${result.warnings.length} warnings)`
      )
    } catch (error) {
      result.valid = false
      result.errors.push(`Unexpected validation error: ${String(error)}`)
      generationLogger.error('validation', 'Validation failed unexpectedly', 'VALIDATION_ERROR', String(error))
    }

    return result
  }

  /**
   * Validate Node.js version
   */
  private async validateNodeVersion(
    sandbox: Sandbox,
    result: PreGenerationValidationResult
  ): Promise<void> {
    try {
      const nodeResult = await sandbox.runCommand({
        cmd: 'node',
        args: ['--version'],
        wait: true,
      })

      const versionOutput = (nodeResult.stdout as string).trim()
      const match = versionOutput.match(/v(\d+)\.(\d+)\.(\d+)/)

      if (match) {
        const major = parseInt(match[1], 10)
        const minor = parseInt(match[2], 10)

        // Node 18+ is required
        if (major < 18) {
          result.errors.push(`Node version ${versionOutput} is too old. Node 18+ required.`)
          result.suggestions.push('Update Node.js to version 18 or later')
        } else {
          generationLogger.progress('validation', `Node.js version: ${versionOutput}`)
        }
      }
    } catch (error) {
      result.warnings.push(`Could not determine Node version: ${String(error)}`)
    }
  }

  /**
   * Validate package manager availability
   */
  private async validatePackageManagers(
    sandbox: Sandbox,
    result: PreGenerationValidationResult
  ): Promise<void> {
    const managers = ['pnpm', 'yarn', 'npm']
    const available: string[] = []

    for (const pm of managers) {
      try {
        await sandbox.runCommand({
          cmd: pm,
          args: ['--version'],
          wait: true,
        })
        available.push(pm)
      } catch {
        // PM not available
      }
    }

    if (available.length === 0) {
      result.errors.push('No package manager found (npm, yarn, or pnpm)')
      result.suggestions.push('Ensure at least one package manager is installed')
    } else {
      generationLogger.progress('validation', `Available package managers: ${available.join(', ')}`)
    }
  }

  /**
   * Check for conflicting processes (e.g., dev server already running)
   */
  private async checkConflictingProcesses(
    sandbox: Sandbox,
    result: PreGenerationValidationResult
  ): Promise<void> {
    try {
      const psResult = await sandbox.runCommand({
        cmd: 'ps',
        args: ['aux'],
        wait: true,
      })

      const output = (psResult.stdout as string).toLowerCase()

      // Check for common dev server processes
      const conflicts = [
        { name: 'Next.js dev server', patterns: ['next.*dev', 'port.*3000'] },
        { name: 'Vite dev server', patterns: ['vite', 'port.*5173'] },
        { name: 'React dev server', patterns: ['react-scripts.*start', 'port.*3000'] },
      ]

      for (const conflict of conflicts) {
        for (const pattern of conflict.patterns) {
          if (new RegExp(pattern).test(output)) {
            result.warnings.push(`Possible conflicting process: ${conflict.name}`)
            result.suggestions.push(`Stop ${conflict.name} before starting generation`)
            break
          }
        }
      }
    } catch (error) {
      generationLogger.progress('validation', 'Could not check for conflicting processes')
    }
  }

  /**
   * Format validation result as human-readable message
   */
  formatResultMessage(result: PreGenerationValidationResult): string {
    const lines: string[] = []

    lines.push('=== PRE-GENERATION VALIDATION ===')
    lines.push(`Status: ${result.valid ? '✓ PASS' : '✗ FAIL'}`)
    lines.push(`Sandbox Health: ${result.sandboxHealthy ? '✓ Healthy' : '✗ Issues detected'}`)
    lines.push('')

    if (result.errors.length > 0) {
      lines.push('ERRORS:')
      for (const error of result.errors) {
        lines.push(`  ✗ ${error}`)
      }
      lines.push('')
    }

    if (result.warnings.length > 0) {
      lines.push('WARNINGS:')
      for (const warning of result.warnings) {
        lines.push(`  ⚠ ${warning}`)
      }
      lines.push('')
    }

    if (result.suggestions.length > 0) {
      lines.push('SUGGESTIONS:')
      for (const suggestion of result.suggestions) {
        lines.push(`  → ${suggestion}`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }
}

export const preGenerationValidator = new PreGenerationValidator()
