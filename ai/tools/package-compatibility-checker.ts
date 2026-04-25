/**
 * Package compatibility checking for app types
 */

export interface CompatibilityCheck {
  compatible: boolean
  missingPackages: string[]
  warnings: string[]
  recommendations: string[]
}

const APP_TYPE_PACKAGES: Record<string, { required: string[]; recommended: string[] }> = {
  'next-app': {
    required: ['react', 'react-dom', 'next'],
    recommended: ['tailwindcss', 'lucide-react', 'framer-motion'],
  },
  'vite-react': {
    required: ['react', 'react-dom', 'vite'],
    recommended: ['tailwindcss', 'lucide-react', 'framer-motion'],
  },
  'nextjs-ecommerce': {
    required: ['react', 'react-dom', 'next', 'stripe'],
    recommended: ['tailwindcss', 'framer-motion', '@tanstack/react-query'],
  },
  'nextjs-saas': {
    required: ['react', 'react-dom', 'next'],
    recommended: ['tailwindcss', 'framer-motion', '@supabase/supabase-js', '@tanstack/react-query'],
  },
  'nextjs-blog': {
    required: ['react', 'react-dom', 'next', 'date-fns'],
    recommended: ['tailwindcss', 'lucide-react', 'framer-motion'],
  },
  'nextjs-dashboard': {
    required: ['react', 'react-dom', 'next'],
    recommended: ['tailwindcss', 'lucide-react', 'framer-motion', '@tanstack/react-query'],
  },
}

export class PackageCompatibilityChecker {
  /**
   * Check if package.json is compatible with app type
   */
  checkCompatibility(appType: string, pkg: Record<string, unknown>): CompatibilityCheck {
    const config = APP_TYPE_PACKAGES[appType]

    if (!config) {
      return {
        compatible: true,
        missingPackages: [],
        warnings: [`Unknown app type: ${appType}`],
        recommendations: [],
      }
    }

    const deps = this.getAllDependencies(pkg)
    const missingRequired: string[] = []
    const missingRecommended: string[] = []

    for (const req of config.required) {
      if (!(req in deps)) {
        missingRequired.push(req)
      }
    }

    for (const rec of config.recommended) {
      if (!(rec in deps)) {
        missingRecommended.push(rec)
      }
    }

    const recommendations: string[] = []

    if (missingRecommended.length > 0) {
      recommendations.push(
        `Consider adding recommended packages: ${missingRecommended.join(', ')}`
      )
    }

    const warnings: string[] = []
    if (missingRequired.length > 0) {
      warnings.push(`Missing required packages: ${missingRequired.join(', ')}`)
    }

    return {
      compatible: missingRequired.length === 0,
      missingPackages: missingRequired,
      warnings,
      recommendations,
    }
  }

  /**
   * Get all dependencies (dev + prod)
   */
  private getAllDependencies(pkg: Record<string, unknown>): Record<string, string> {
    const deps: Record<string, string> = {}

    if ('dependencies' in pkg && typeof pkg.dependencies === 'object' && pkg.dependencies) {
      Object.assign(deps, pkg.dependencies)
    }

    if ('devDependencies' in pkg && typeof pkg.devDependencies === 'object' && pkg.devDependencies) {
      Object.assign(deps, pkg.devDependencies)
    }

    if ('peerDependencies' in pkg && typeof pkg.peerDependencies === 'object' && pkg.peerDependencies) {
      Object.assign(deps, pkg.peerDependencies)
    }

    return deps
  }

  /**
   * Suggest packages to add for app type
   */
  suggestPackagesToAdd(appType: string, pkg: Record<string, unknown>): { deps: Record<string, string>; devDeps: Record<string, string> } {
    const config = APP_TYPE_PACKAGES[appType]
    const deps: Record<string, string> = {}
    const devDeps: Record<string, string> = {}
    const existing = this.getAllDependencies(pkg)

    if (!config) return { deps, devDeps }

    // Add missing required packages
    for (const req of config.required) {
      if (!(req in existing)) {
        const version = this.getDefaultVersion(req)
        deps[req] = version
      }
    }

    // Add recommended as dev dependencies
    for (const rec of config.recommended) {
      if (!(rec in existing)) {
        const version = this.getDefaultVersion(rec)
        if (this.isDevDependency(rec)) {
          devDeps[rec] = version
        } else {
          deps[rec] = version
        }
      }
    }

    return { deps, devDeps }
  }

  /**
   * Get default version for package
   */
  private getDefaultVersion(packageName: string): string {
    const versionMap: Record<string, string> = {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'next': '^14.0.0',
      'vue': '^3.3.0',
      'vite': '^5.0.0',
      'tailwindcss': '^3.3.0',
      'lucide-react': '^latest',
      'framer-motion': '^10.0.0',
      'date-fns': '^2.30.0',
      '@tanstack/react-query': '^5.0.0',
      '@supabase/supabase-js': '^2.38.0',
      'stripe': '^14.0.0',
      'zod': '^3.22.0',
    }

    return versionMap[packageName] || 'latest'
  }

  /**
   * Check if package should be installed as dev dependency
   */
  private isDevDependency(packageName: string): boolean {
    const devPackages = ['tailwindcss', 'eslint', 'prettier', 'typescript', '@types/node', '@types/react', 'autoprefixer', 'postcss']
    return devPackages.includes(packageName)
  }

  /**
   * Generate compatibility report
   */
  generateReport(appType: string, result: CompatibilityCheck): string {
    const lines: string[] = []

    lines.push('=== PACKAGE COMPATIBILITY CHECK ===')
    lines.push(`App Type: ${appType}`)
    lines.push(`Status: ${result.compatible ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE'}`)
    lines.push('')

    if (result.missingPackages.length > 0) {
      lines.push('MISSING REQUIRED PACKAGES:')
      for (const pkg of result.missingPackages) {
        lines.push(`  - ${pkg}`)
      }
      lines.push('')
    }

    if (result.warnings.length > 0) {
      lines.push('WARNINGS:')
      for (const warning of result.warnings) {
        lines.push(`  ⚠️ ${warning}`)
      }
      lines.push('')
    }

    if (result.recommendations.length > 0) {
      lines.push('RECOMMENDATIONS:')
      for (const rec of result.recommendations) {
        lines.push(`  → ${rec}`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }
}

export const packageCompatibilityChecker = new PackageCompatibilityChecker()
