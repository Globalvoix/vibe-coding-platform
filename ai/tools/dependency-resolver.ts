/**
 * Dependency conflict detection and resolution
 * Analyzes package.json for peer dependency issues and suggests fixes
 */

export interface DependencyConflict {
  type: 'peer_dependency' | 'version_mismatch' | 'missing_dependency'
  severity: 'critical' | 'warning'
  package: string
  required: string
  current?: string
  suggestion: string
  installFlag?: string
}

export interface DependencyResolutionResult {
  hasConflicts: boolean
  conflicts: DependencyConflict[]
  resolution: {
    installFlags: string[]
    packageJsonUpdates?: Record<string, string>
    advice: string[]
  }
}

/**
 * Common peer dependency conflicts and their solutions
 */
const KNOWN_PEER_CONFLICTS: Record<string, { packages: string[]; flags: string[] }> = {
  tailwindcss: {
    packages: ['postcss', 'autoprefixer'],
    flags: ['--legacy-peer-deps', '--force'],
  },
  'next-auth': {
    packages: ['react', 'react-dom'],
    flags: ['--legacy-peer-deps'],
  },
  '@supabase/supabase-js': {
    packages: ['react'],
    flags: [],
  },
  'react-query': {
    packages: ['react', 'react-dom'],
    flags: [],
  },
  'framer-motion': {
    packages: ['react', 'react-dom'],
    flags: [],
  },
  'next-themes': {
    packages: ['react', 'react-dom'],
    flags: [],
  },
}

export class DependencyResolver {
  /**
   * Analyze package.json for conflicts
   */
  async analyzeConflicts(pkg: Record<string, unknown>): Promise<DependencyResolutionResult> {
    const conflicts: DependencyConflict[] = []
    const deps = { ...((pkg.dependencies as Record<string, unknown>) || {}) }
    const devDeps = { ...((pkg.devDependencies as Record<string, unknown>) || {}) }

    const allDeps = { ...deps, ...devDeps }

    // Check for known conflicts
    for (const [packageName, config] of Object.entries(KNOWN_PEER_CONFLICTS)) {
      if (packageName in allDeps) {
        for (const peerPkg of config.packages) {
          if (!(peerPkg in allDeps)) {
            conflicts.push({
              type: 'peer_dependency',
              severity: 'warning',
              package: packageName,
              required: peerPkg,
              suggestion: `${packageName} may require ${peerPkg}`,
              installFlag: config.flags[0],
            })
          }
        }
      }
    }

    // Analyze resolution strategy
    const resolution = this.suggestResolution(conflicts)

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      resolution,
    }
  }

  /**
   * Suggest resolution strategy
   */
  private suggestResolution(conflicts: DependencyConflict[]): DependencyResolutionResult['resolution'] {
    const flags = new Set<string>()
    const advice: string[] = []

    for (const conflict of conflicts) {
      if (conflict.type === 'peer_dependency') {
        advice.push(`Add ${conflict.required} to dependencies (may be required by ${conflict.package})`)

        if (conflict.installFlag) {
          flags.add(conflict.installFlag)
        }
      }
    }

    // Build flag list
    const installFlags: string[] = []
    if (flags.has('--legacy-peer-deps')) {
      installFlags.push('--legacy-peer-deps')
    }
    if (flags.has('--force')) {
      installFlags.push('--force')
    }

    if (installFlags.length > 0) {
      advice.push(`Try installing with: npm install ${installFlags.join(' ')}`)
    }

    if (conflicts.length === 0) {
      advice.push('No peer dependency conflicts detected')
    }

    return {
      installFlags,
      advice,
    }
  }

  /**
   * Check if version satisfies requirement
   */
  satisfiesVersion(installed: string, required: string): boolean {
    // Simple check - remove ^ and ~ prefixes and compare
    const normalize = (v: string) => v.replace(/^[\^~]/, '').split('.')[0]
    return normalize(installed) === normalize(required)
  }

  /**
   * Suggest compatible versions
   */
  getCompatibleVersions(packageName: string): string[] {
    const versionMap: Record<string, string[]> = {
      'react': ['^18.0.0', '^17.0.0'],
      'react-dom': ['^18.0.0', '^17.0.0'],
      'next': ['^14.0.0', '^13.0.0'],
      'tailwindcss': ['^3.0.0', '^2.0.0'],
      '@supabase/supabase-js': ['^2.0.0', '^1.0.0'],
      'framer-motion': ['^10.0.0', '^9.0.0'],
    }

    return versionMap[packageName] || ['latest']
  }

  /**
   * Generate conflict report
   */
  generateReport(result: DependencyResolutionResult): string {
    const lines: string[] = []

    lines.push('=== DEPENDENCY ANALYSIS ===')
    lines.push(`Status: ${result.hasConflicts ? '⚠️ CONFLICTS DETECTED' : '✅ OK'}`)
    lines.push('')

    if (result.conflicts.length > 0) {
      lines.push('CONFLICTS:')
      for (const conflict of result.conflicts) {
        lines.push(`  [${conflict.severity.toUpperCase()}] ${conflict.package}`)
        lines.push(`    Issue: ${conflict.suggestion}`)
        if (conflict.installFlag) {
          lines.push(`    Fix: Use ${conflict.installFlag} flag when installing`)
        }
      }
      lines.push('')
    }

    lines.push('RESOLUTION:')
    for (const advice of result.resolution.advice) {
      lines.push(`  → ${advice}`)
    }

    return lines.join('\n')
  }
}

export const dependencyResolver = new DependencyResolver()
