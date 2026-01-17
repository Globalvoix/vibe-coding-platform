/**
 * Missing Dependencies Detector
 * 
 * Scans generated code to find import statements and detects
 * which packages are used but not installed in package.json
 */

export interface DetectedDependency {
  name: string
  type: 'default' | 'named' | 'side-effect'
  usedIn: string[]
  isInstalled: boolean
}

export interface MissingDependencyReport {
  missingPackages: string[]
  detectedDependencies: DetectedDependency[]
  summary: string
}

/**
 * Extract package names from import statements in code
 */
export function extractImportsFromCode(fileContent: string): string[] {
  const imports = new Set<string>()

  // Pattern: import ... from 'package-name'
  const importPattern = /import\s+(?:{[^}]*}|[^'";]+)\s+from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = importPattern.exec(fileContent))) {
    const moduleName = match[1]
    const packageName = extractPackageName(moduleName)
    if (packageName && !isLocalPath(moduleName)) {
      imports.add(packageName)
    }
  }

  // Pattern: import 'package-name' (side effects)
  const sideEffectPattern = /import\s+['"]([^'"]+)['"]/g
  while ((match = sideEffectPattern.exec(fileContent))) {
    const moduleName = match[1]
    const packageName = extractPackageName(moduleName)
    if (packageName && !isLocalPath(moduleName)) {
      imports.add(packageName)
    }
  }

  // Pattern: require('package-name')
  const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((match = requirePattern.exec(fileContent))) {
    const moduleName = match[1]
    const packageName = extractPackageName(moduleName)
    if (packageName && !isLocalPath(moduleName)) {
      imports.add(packageName)
    }
  }

  // Pattern: import type { ... } from 'package'
  const typeImportPattern = /import\s+type\s+{[^}]*}\s+from\s+['"]([^'"]+)['"]/g
  while ((match = typeImportPattern.exec(fileContent))) {
    const moduleName = match[1]
    const packageName = extractPackageName(moduleName)
    if (packageName && !isLocalPath(moduleName)) {
      imports.add(packageName)
    }
  }

  return Array.from(imports)
}

/**
 * Extract the base package name from a module path
 * e.g., '@org/package/submodule' -> '@org/package'
 */
function extractPackageName(modulePath: string): string | null {
  if (!modulePath || modulePath.length === 0) {
    return null
  }

  // Handle scoped packages (@org/package)
  if (modulePath.startsWith('@')) {
    const parts = modulePath.split('/')
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`
    }
  }

  // Handle regular packages
  const parts = modulePath.split('/')
  return parts[0] || null
}

/**
 * Check if a module path is a local import
 */
function isLocalPath(modulePath: string): boolean {
  return modulePath.startsWith('.') || modulePath.startsWith('/')
}

/**
 * Get list of installed packages from package.json content
 */
export function getInstalledPackages(packageJsonContent: string): Set<string> {
  const packages = new Set<string>()

  try {
    const packageJson = JSON.parse(packageJsonContent)

    // Add dependencies
    if (packageJson.dependencies) {
      Object.keys(packageJson.dependencies).forEach((pkg) => packages.add(pkg))
    }

    // Add devDependencies
    if (packageJson.devDependencies) {
      Object.keys(packageJson.devDependencies).forEach((pkg) => packages.add(pkg))
    }

    // Add peerDependencies
    if (packageJson.peerDependencies) {
      Object.keys(packageJson.peerDependencies).forEach((pkg) => packages.add(pkg))
    }

    // Add optionalDependencies
    if (packageJson.optionalDependencies) {
      Object.keys(packageJson.optionalDependencies).forEach((pkg) => packages.add(pkg))
    }
  } catch (error) {
    console.error('Failed to parse package.json:', error)
  }

  return packages
}

/**
 * Analyze generated files and detect missing dependencies
 */
export function detectMissingDependencies(
  files: Array<{ path: string; content: string }>,
  packageJsonContent: string
): MissingDependencyReport {
  const importsByFile = new Map<string, Set<string>>()
  const allImports = new Set<string>()
  const installedPackages = getInstalledPackages(packageJsonContent)

  // Extract imports from each file
  for (const file of files) {
    // Only scan source files
    if (!file.path.endsWith('.tsx') && !file.path.endsWith('.ts') && !file.path.endsWith('.jsx') && !file.path.endsWith('.js')) {
      continue
    }

    const imports = extractImportsFromCode(file.content)
    if (imports.length > 0) {
      importsByFile.set(file.path, new Set(imports))
      imports.forEach((imp) => allImports.add(imp))
    }
  }

  // Determine which packages are missing
  const missingPackages: string[] = []
  const detectedDependencies: DetectedDependency[] = []

  for (const importedPackage of allImports) {
    const isInstalled = installedPackages.has(importedPackage)
    const usedIn: string[] = []

    // Find which files use this package
    for (const [filePath, imports] of importsByFile) {
      if (imports.has(importedPackage)) {
        usedIn.push(filePath)
      }
    }

    detectedDependencies.push({
      name: importedPackage,
      type: 'default', // Could be enhanced to detect type
      usedIn,
      isInstalled,
    })

    if (!isInstalled) {
      missingPackages.push(importedPackage)
    }
  }

  // Build summary
  const summary = buildMissingSummary(missingPackages, detectedDependencies)

  return {
    missingPackages: Array.from(new Set(missingPackages)),
    detectedDependencies: detectedDependencies.sort((a, b) => a.name.localeCompare(b.name)),
    summary,
  }
}

/**
 * Build a human-readable summary of missing dependencies
 */
function buildMissingSummary(missingPackages: string[], detected: DetectedDependency[]): string {
  const totalDetected = detected.length
  const installed = detected.filter((d) => d.isInstalled).length
  const missing = missingPackages.length

  if (missing === 0) {
    return `✅ All ${installed} dependencies are installed.`
  }

  return `⚠️  ${missing} missing package(s): ${missingPackages.join(', ')}\n📦 ${installed}/${totalDetected} dependencies installed`
}

/**
 * Generate install command for missing packages
 */
export function generateInstallCommand(
  missingPackages: string[],
  packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm'
): string {
  if (missingPackages.length === 0) {
    return ''
  }

  const packagesStr = missingPackages.join(' ')

  switch (packageManager) {
    case 'yarn':
      return `yarn add ${packagesStr}`
    case 'pnpm':
      return `pnpm add ${packagesStr}`
    case 'npm':
    default:
      return `npm install ${packagesStr}`
  }
}
