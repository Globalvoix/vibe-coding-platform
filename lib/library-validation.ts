/**
 * Library Import Validation
 * 
 * Ensures that all used libraries are properly declared in package.json
 * and imported in the code. Prevents missing dependencies.
 */

interface LibraryRequirement {
  name: string
  version: string
  required: boolean
  reason: string
  imports?: string[]
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  missingLibraries: string[]
}

/**
 * Library requirements by app type and feature
 */
const LIBRARY_REQUIREMENTS: Record<string, LibraryRequirement> = {
  'framer-motion': {
    name: 'framer-motion',
    version: '^10.0.0',
    required: true,
    reason: 'Required for animations on streaming, landing, ecommerce, saas, dashboard, social, blog, portfolio, music, news, real-estate',
    imports: ['motion', 'AnimatePresence', 'useScroll', 'useTransform', 'useMotionValue'],
  },
  'lucide-react': {
    name: 'lucide-react',
    version: '^latest',
    required: false,
    reason: 'Recommended for icons in all app types',
    imports: ['Home', 'Menu', 'Settings', 'X', 'Search'],
  },
  'next/image': {
    name: 'next/image',
    version: 'built-in',
    required: true,
    reason: 'Required for all images to prevent layout shift and optimize loading',
    imports: ['Image'],
  },
  'next/link': {
    name: 'next/link',
    version: 'built-in',
    required: true,
    reason: 'Required for navigation between pages',
    imports: ['Link'],
  },
  'date-fns': {
    name: 'date-fns',
    version: '^2.30.0',
    required: false,
    reason: 'Recommended for date formatting in blog, news, banking, ecommerce',
    imports: ['format', 'parseISO', 'distanceInWords'],
  },
  'react-query': {
    name: '@tanstack/react-query',
    version: '^4.0.0',
    required: false,
    reason: 'Recommended for data fetching in saas, dashboard, ecommerce',
    imports: ['useQuery', 'useMutation', 'QueryClient'],
  },
  'tailwindcss': {
    name: 'tailwindcss',
    version: '^3.0.0',
    required: true,
    reason: 'Required for styling in all projects',
    imports: [],
  },
}

/**
 * Required libraries by app type
 */
const APP_TYPE_REQUIREMENTS: Record<string, string[]> = {
  streaming: ['framer-motion', 'lucide-react', 'next/image', 'next/link'],
  ecommerce: ['framer-motion', 'lucide-react', 'next/image', 'next/link'],
  saas: ['framer-motion', 'lucide-react', 'next/image', 'next/link'],
  dashboard: ['framer-motion', 'lucide-react', 'next/image', 'next/link'],
  auth: ['framer-motion', 'next/image', 'next/link'],
  calculator: ['next/image', 'next/link'],
  blog: ['framer-motion', 'lucide-react', 'next/image', 'next/link', 'date-fns'],
  portfolio: ['framer-motion', 'lucide-react', 'next/image', 'next/link'],
  landing: ['framer-motion', 'lucide-react', 'next/image', 'next/link'],
  social: ['framer-motion', 'lucide-react', 'next/image', 'next/link'],
  music: ['framer-motion', 'lucide-react', 'next/image', 'next/link'],
  news: ['framer-motion', 'lucide-react', 'next/image', 'next/link', 'date-fns'],
  banking: ['framer-motion', 'lucide-react', 'next/image', 'next/link'],
  'real-estate': ['framer-motion', 'lucide-react', 'next/image', 'next/link'],
}

/**
 * Get required libraries for app type
 */
export function getRequiredLibraries(appType: string): LibraryRequirement[] {
  const libraryNames = APP_TYPE_REQUIREMENTS[appType] || []
  return libraryNames
    .map(name => LIBRARY_REQUIREMENTS[name])
    .filter(Boolean as unknown as (lib: LibraryRequirement | undefined) => lib is LibraryRequirement)
}

/**
 * Check if library is imported in code
 */
export function checkLibraryImport(
  code: string,
  libraryName: string
): boolean {
  const patterns: Record<string, RegExp> = {
    'framer-motion': /import\s*{[^}]*motion[^}]*}\s*from\s*['"]framer-motion['"]/,
    'lucide-react': /import\s*{[^}]*}\s*from\s*['"]lucide-react['"]/,
    'next/image': /import\s+Image\s+from\s+['"]next\/image['"]/,
    'next/link': /import\s+Link\s+from\s+['"]next\/link['"]/,
    'date-fns': /import\s*{[^}]*}\s*from\s*['"]date-fns['"]/,
    'react-query': /import\s*{[^}]*}\s*from\s*['"]@tanstack\/react-query['"]/,
  }

  const pattern = patterns[libraryName]
  if (!pattern) return true // Unknown library, assume it's present

  return pattern.test(code)
}

/**
 * Validate package.json includes all required libraries
 */
export function validatePackageJson(
  appType: string,
  packageJson: string
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const missingLibraries: string[] = []

  try {
    const pkg = JSON.parse(packageJson) as { dependencies?: Record<string, string> }
    const dependencies = pkg.dependencies || {}

    const required = getRequiredLibraries(appType)

    for (const lib of required) {
      if (!dependencies[lib.name]) {
        errors.push(`Missing required library: ${lib.name} (${lib.reason})`)
        missingLibraries.push(lib.name)
      }
    }
  } catch (error: unknown) {
    errors.push(`Invalid package.json: ${error instanceof Error ? error.message : String(error)}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingLibraries,
  }
}

/**
 * Validate code includes imports for used libraries
 */
export function validateLibraryImports(
  appType: string,
  code: string,
  usedLibraries: string[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  for (const lib of usedLibraries) {
    if (!checkLibraryImport(code, lib)) {
      errors.push(`Library "${lib}" used but not imported`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingLibraries: [],
  }
}

/**
 * Generate package.json update with required libraries
 */
export function generatePackageJsonUpdate(appType: string): Record<string, string> {
  const required = getRequiredLibraries(appType)
  const updates: Record<string, string> = {}

  for (const lib of required) {
    updates[lib.name] = lib.version
  }

  return updates
}

/**
 * Audit all code for missing imports
 */
export function auditCodeImports(
  code: string,
): { detectedLibraries: string[]; missingImports: string[] } {
  const detectedLibraries: string[] = []
  const missingImports: string[] = []

  const patterns: Record<string, { pattern: RegExp; import: string }[]> = {
    'framer-motion': [
      { pattern: /motion\./g, import: 'motion' },
      { pattern: /AnimatePresence/g, import: 'AnimatePresence' },
      { pattern: /useScroll/g, import: 'useScroll' },
    ],
    'lucide-react': [
      { pattern: /Menu/g, import: 'Menu' },
      { pattern: /Search/g, import: 'Search' },
      { pattern: /Settings/g, import: 'Settings' },
    ],
    'next/image': [
      { pattern: /<Image/g, import: 'Image' },
    ],
    'date-fns': [
      { pattern: /format\(/g, import: 'format' },
      { pattern: /parseISO/g, import: 'parseISO' },
    ],
  }

  for (const [lib, checks] of Object.entries(patterns)) {
    for (const { pattern, import: importName } of checks) {
      if (pattern.test(code)) {
        detectedLibraries.push(lib)

        if (!checkLibraryImport(code, lib)) {
          missingImports.push(`${importName} from ${lib}`)
        }
        break
      }
    }
  }

  return {
    detectedLibraries: [...new Set(detectedLibraries)],
    missingImports,
  }
}

/**
 * Generate import statements for library
 */
export function generateImportStatement(libraryName: string, items: string[]): string {
  if (libraryName === 'next/image') {
    return "import Image from 'next/image'"
  }
  if (libraryName === 'next/link') {
    return "import Link from 'next/link'"
  }
  if (libraryName === 'framer-motion') {
    return `import { ${items.join(', ')} } from 'framer-motion'`
  }
  if (libraryName === 'lucide-react') {
    return `import { ${items.join(', ')} } from 'lucide-react'`
  }

  return `import { ${items.join(', ')} } from '${libraryName}'`
}

export type { LibraryRequirement, ValidationResult }
