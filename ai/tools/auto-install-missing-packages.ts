import { Sandbox } from '@vercel/sandbox'
import { generationLogger } from './generation-logger'

interface PackageInstallResult {
  packageName: string
  installed: boolean
  reason?: string
  pm: 'pnpm' | 'yarn' | 'npm'
}

/**
 * Parse package names from common error messages
 */
function parsePackageNamesFromError(output: string): string[] {
  const packages = new Set<string>()

  // Pattern: Cannot find module 'lodash'
  const cantFindPattern = /Cannot find module ['"]([^'"]+)['"]/g
  let match
  while ((match = cantFindPattern.exec(output))) {
    const moduleName = match[1]
    // Only extract simple package names (filter out relative paths like './config')
    if (!moduleName.startsWith('.') && !moduleName.startsWith('/')) {
      // Handle scoped packages (@org/package)
      const basePackage = moduleName.split('/').slice(0, moduleName.startsWith('@') ? 2 : 1).join('/')
      if (basePackage && /^[@\w\-]+$/.test(basePackage)) {
        packages.add(basePackage)
      }
    }
  }

  // Pattern: MODULE_NOT_FOUND: Cannot find module 'package-name'
  const moduleNotFoundPattern = /MODULE_NOT_FOUND[:\s]*([^\s\n]+)/g
  while ((match = moduleNotFoundPattern.exec(output))) {
    const moduleName = match[1].replace(/^['"]|['"]$/g, '')
    if (!moduleName.startsWith('.') && !moduleName.startsWith('/')) {
      const basePackage = moduleName.split('/').slice(0, moduleName.startsWith('@') ? 2 : 1).join('/')
      if (basePackage && /^[@\w\-]+$/.test(basePackage)) {
        packages.add(basePackage)
      }
    }
  }

  // Pattern: "@org/package not found"
  const notFoundPattern = /['"]?(@?[\w\-]+(?:\/[\w\-]+)?)['"]?\s+not found/gi
  while ((match = notFoundPattern.exec(output))) {
    const moduleName = match[1]
    if (moduleName && /^[@\w\-]+(?:\/[\w\-]+)?$/.test(moduleName)) {
      packages.add(moduleName)
    }
  }

  return Array.from(packages)
}

/**
 * Validate package name format
 */
function isValidPackageName(name: string): boolean {
  // Simple validation: alphanumeric, hyphens, underscores, and @ for scoped packages
  return /^(@[\w\-]+\/)?[\w\-]+$/.test(name) && name.length < 214
}

/**
 * Attempt to install a missing package
 */
async function installPackage(
  sandbox: Sandbox,
  packageName: string,
  pm: 'pnpm' | 'yarn' | 'npm'
): Promise<PackageInstallResult> {
  try {
    if (!isValidPackageName(packageName)) {
      return {
        packageName,
        installed: false,
        reason: 'Invalid package name format',
        pm,
      }
    }

    generationLogger.progress('auto_install', `Attempting to install ${packageName} using ${pm}`)

    const result = await sandbox.runCommand({
      cmd: pm,
      args: ['add', packageName],
      detached: false,
    })

    if (result.exitCode === 0) {
      generationLogger.success('auto_install', `Successfully installed ${packageName}`)
      return {
        packageName,
        installed: true,
        pm,
      }
    } else {
      const stderr = await result.stderr()
      const reason = stderr ? `Exit code ${result.exitCode}: ${stderr.slice(0, 100)}` : `Exit code ${result.exitCode}`
      return {
        packageName,
        installed: false,
        reason,
        pm,
      }
    }
  } catch (error) {
    generationLogger.error(
      'auto_install',
      `Failed to install ${packageName}`,
      'INSTALL_ERROR',
      String(error)
    )
    return {
      packageName,
      installed: false,
      reason: String(error),
      pm,
    }
  }
}

/**
 * Auto-install missing packages extracted from error output
 * Uses fallback strategy: try pnpm → yarn → npm
 */
export async function autoInstallMissingPackages(
  sandbox: Sandbox,
  errorOutput: string,
  preferredPM: 'pnpm' | 'yarn' | 'npm' = 'pnpm'
): Promise<PackageInstallResult[]> {
  const packageNames = parsePackageNamesFromError(errorOutput)

  if (packageNames.length === 0) {
    return []
  }

  generationLogger.progress('auto_install', `Detected ${packageNames.length} missing packages: ${packageNames.join(', ')}`)

  const results: PackageInstallResult[] = []

  type PackageManager = 'pnpm' | 'yarn' | 'npm'
  const allPMs: PackageManager[] = ['pnpm', 'yarn', 'npm']
  const pmSequence: PackageManager[] = [preferredPM, ...allPMs.filter((pm) => pm !== preferredPM)]

  for (const packageName of packageNames) {
    let installed = false

    for (const pm of pmSequence) {
      const result = await installPackage(sandbox, packageName, pm)
      results.push(result)

      if (result.installed) {
        installed = true
        break
      }
    }

    if (!installed) {
      generationLogger.progress('auto_install', `Failed to install ${packageName} with all package managers`)
    }
  }

  const successCount = results.filter((r) => r.installed).length
  generationLogger.success(
    'auto_install',
    `Auto-install completed: ${successCount}/${results.length} packages installed`
  )

  return results
}

export const autoInstallMissingPackagesModule = {
  parsePackageNamesFromError,
  isValidPackageName,
  installPackage,
  autoInstallMissingPackages,
}
