export interface ParsedBuildError {
  type: 'peer_dependency' | 'missing_package' | 'network' | 'version_conflict' | 'permission' | 'unknown'
  severity: 'error' | 'warning'
  message: string
  packageName?: string
  requiredVersion?: string
  installedVersion?: string
  solution?: string
  raw: string
}

/**
 * Parses npm/yarn/pnpm install and build output to extract structured error information
 */
export class BuildOutputParser {
  /**
   * Parse npm/yarn/pnpm install output
   */
  parseInstallOutput(
    stdout: string,
    stderr: string,
    packageManager: 'npm' | 'yarn' | 'pnpm'
  ): ParsedBuildError[] {
    const errors: ParsedBuildError[] = []
    const output = `${stdout}\n${stderr}`.split('\n')

    for (const line of output) {
      const error = this.parseLine(line, packageManager)
      if (error) {
        errors.push(error)
      }
    }

    return errors
  }

  /**
   * Parse a single line of output
   */
  private parseLine(line: string, packageManager: 'npm' | 'yarn' | 'pnpm'): ParsedBuildError | null {
    if (!line.trim()) return null

    if (packageManager === 'npm') {
      return this.parseNpmLine(line)
    } else if (packageManager === 'yarn') {
      return this.parseYarnLine(line)
    } else if (packageManager === 'pnpm') {
      return this.parsePnpmLine(line)
    }

    return null
  }

  /**
   * Parse npm-specific error lines
   */
  private parseNpmLine(line: string): ParsedBuildError | null {
    // Peer dependency errors
    if (line.includes('peer dep') || line.includes('peerDependencies')) {
      const match = line.match(
        /(.+?)\s+requires\s+(.+?)\s+but\s+(you have|has)\s+(.+?)(?:\.|$)/i
      )
      if (match) {
        const [, packageName, required, , actual] = match
        return {
          type: 'peer_dependency',
          severity: 'error',
          message: `Peer dependency conflict: ${packageName} requires ${required} but ${actual} is installed`,
          packageName: packageName.trim(),
          requiredVersion: required.trim(),
          installedVersion: actual.trim(),
          solution: 'Try: npm install --legacy-peer-deps',
          raw: line,
        }
      }
    }

    // Module not found
    if (line.includes('MODULE_NOT_FOUND') || line.includes('Cannot find module')) {
      const match = line.match(/Cannot find module ['"](.*?)['"]/)
      if (match) {
        const packageName = match[1]
        return {
          type: 'missing_package',
          severity: 'error',
          message: `Missing package: ${packageName}`,
          packageName,
          solution: `Try: npm install ${packageName}`,
          raw: line,
        }
      }
    }

    // Network errors
    if (
      line.includes('ECONNREFUSED') ||
      line.includes('ENOTFOUND') ||
      line.includes('timeout') ||
      line.includes('ERR!')
    ) {
      return {
        type: 'network',
        severity: 'error',
        message: `Network or registry error: ${line.trim()}`,
        solution: 'Check network connection and retry',
        raw: line,
      }
    }

    // Permission errors
    if (line.includes('EACCES') || line.includes('permission denied')) {
      return {
        type: 'permission',
        severity: 'error',
        message: `Permission denied: ${line.trim()}`,
        solution: 'Check file permissions or try running with appropriate privileges',
        raw: line,
      }
    }

    return null
  }

  /**
   * Parse yarn-specific error lines
   */
  private parseYarnLine(line: string): ParsedBuildError | null {
    // Yarn peer dependency errors
    if (line.includes('peer') && line.includes('package')) {
      const match = line.match(/(.+?)\s+requested\s+(.+?)\s+but\s+(.+?)\s+is being installed/i)
      if (match) {
        const [, packageName, required, actual] = match
        return {
          type: 'peer_dependency',
          severity: 'error',
          message: `Peer dependency mismatch: ${packageName}`,
          packageName: packageName.trim(),
          requiredVersion: required.trim(),
          installedVersion: actual.trim(),
          solution: 'Try: yarn install --ignore-engines',
          raw: line,
        }
      }
    }

    // Generic yarn error
    if (line.includes('error') || line.includes('ERROR')) {
      return {
        type: 'unknown',
        severity: 'error',
        message: line.trim(),
        solution: 'Check the full error output above for details',
        raw: line,
      }
    }

    return null
  }

  /**
   * Parse pnpm-specific error lines
   */
  private parsePnpmLine(line: string): ParsedBuildError | null {
    // pnpm peer dependency conflicts
    if (line.includes('peer') && line.includes('mismatch')) {
      const match = line.match(/(.+?)\s+@ requires\s+(.+?)\s+but\s+(.+?)\s+is being installed/i)
      if (match) {
        const [, packageName, required, actual] = match
        return {
          type: 'peer_dependency',
          severity: 'error',
          message: `Peer dependency conflict in pnpm: ${packageName}`,
          packageName: packageName.trim(),
          requiredVersion: required.trim(),
          installedVersion: actual.trim(),
          solution: 'Try: pnpm install --force',
          raw: line,
        }
      }
    }

    // pnpm ERR!
    if (line.includes('ERR!')) {
      if (line.includes('not found') || line.includes('no such')) {
        return {
          type: 'missing_package',
          severity: 'error',
          message: `Missing or invalid package: ${line.trim()}`,
          solution: 'Verify package name and version in package.json',
          raw: line,
        }
      }

      return {
        type: 'unknown',
        severity: 'error',
        message: line.replace('ERR!', '').trim(),
        solution: 'Review full error output for context',
        raw: line,
      }
    }

    return null
  }

  /**
   * Group and summarize errors
   */
  summarizeErrors(errors: ParsedBuildError[]): Map<string, ParsedBuildError[]> {
    const grouped = new Map<string, ParsedBuildError[]>()

    for (const error of errors) {
      const key = error.type
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(error)
    }

    return grouped
  }

  /**
   * Generate a human-readable summary with solutions
   */
  generateSummary(errors: ParsedBuildError[]): string {
    if (errors.length === 0) return ''

    const grouped = this.summarizeErrors(errors)
    const lines: string[] = []

    for (const [type, typeErrors] of grouped) {
      lines.push(`\n## ${type.replace(/_/g, ' ').toUpperCase()} (${typeErrors.length})`)

      for (const error of typeErrors) {
        lines.push(`- ${error.message}`)
        if (error.solution) {
          lines.push(`  Solution: ${error.solution}`)
        }
      }
    }

    return lines.join('\n')
  }
}

export const buildOutputParser = new BuildOutputParser()
