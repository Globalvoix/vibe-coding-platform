/**
 * Code Semantic Validator
 * 
 * Validates generated code before uploading to sandbox.
 * Checks syntax, imports, completeness, images, and quality standards.
 */

export interface ValidationError {
  file: string
  line?: number
  column?: number
  message: string
  severity: 'error' | 'warning'
  suggestion?: string
  code: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  summary: string
}

interface FileToValidate {
  path: string
  content: string
}

/**
 * Validate a batch of generated files
 */
export function validateGeneratedFiles(files: FileToValidate[]): ValidationResult {
  const allErrors: ValidationError[] = []
  const allWarnings: ValidationError[] = []

  for (const file of files) {
    const fileErrors = validateFile(file)
    allErrors.push(...fileErrors.errors)
    allWarnings.push(...fileErrors.warnings)
  }

  const isValid = allErrors.length === 0

  const summary = buildValidationSummary(allErrors, allWarnings, files.length)

  return {
    isValid,
    errors: allErrors,
    warnings: allWarnings,
    summary,
  }
}

function validateFile(file: FileToValidate): { errors: ValidationError[]; warnings: ValidationError[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Route to appropriate validator
  if (file.path.endsWith('.tsx') || file.path.endsWith('.ts')) {
    const result = validateTypeScript(file)
    errors.push(...result.errors)
    warnings.push(...result.warnings)
  } else if (file.path.endsWith('.json')) {
    const result = validateJSON(file)
    errors.push(...result.errors)
    warnings.push(...result.warnings)
  } else if (file.path.endsWith('.css')) {
    const result = validateCSS(file)
    errors.push(...result.errors)
    warnings.push(...result.warnings)
  }

  return { errors, warnings }
}

function validateTypeScript(file: FileToValidate): { errors: ValidationError[]; warnings: ValidationError[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const lines = file.content.split('\n')

  // Check for basic syntax issues
  errors.push(...checkTypescriptSyntax(file, lines))

  // Check for placeholders
  warnings.push(...checkPlaceholders(file, lines))

  // Check for imports
  errors.push(...checkImportValidity(file, lines))

  // Check for TODOs and incomplete code
  errors.push(...checkCompletion(file, lines))

  // Check for accessibility
  warnings.push(...checkAccessibility(file, lines))

  // Check for image usage
  errors.push(...checkImageUsage(file, lines))

  return { errors, warnings }
}

function checkTypescriptSyntax(file: FileToValidate, lines: string[]): ValidationError[] {
  const errors: ValidationError[] = []

  // Check for unmatched braces/brackets
  const openBraces = (file.content.match(/{/g) || []).length
  const closeBraces = (file.content.match(/}/g) || []).length
  if (openBraces !== closeBraces) {
    errors.push({
      file: file.path,
      message: `Unmatched braces: ${openBraces} open vs ${closeBraces} close`,
      severity: 'error',
      code: 'UNMATCHED_BRACES',
      suggestion: 'Check for missing or extra curly braces',
    })
  }

  // Check for unmatched parentheses
  const openParens = (file.content.match(/\(/g) || []).length
  const closeParens = (file.content.match(/\)/g) || []).length
  if (openParens !== closeParens) {
    errors.push({
      file: file.path,
      message: `Unmatched parentheses: ${openParens} open vs ${closeParens} close`,
      severity: 'error',
      code: 'UNMATCHED_PARENS',
      suggestion: 'Check for missing or extra parentheses',
    })
  }

  // Check for unmatched angle brackets (JSX)
  const openAngles = (file.content.match(/<(?!\/)/g) || []).length
  const closeAngles = (file.content.match(/\/>/g) || []).length + (file.content.match(/<\/\w+>/g) || []).length
  if (openAngles !== closeAngles && file.path.endsWith('.tsx')) {
    warnings.push({
      file: file.path,
      message: 'Possible unmatched JSX tags',
      severity: 'warning',
      code: 'POSSIBLY_UNMATCHED_JSX',
      suggestion: 'Check for unclosed JSX elements',
    })
  }

  // Check for syntax errors in function declarations
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for arrow functions without body
    if (/^[^=]*=>[^=>]/.test(line) && !line.includes('{') && !line.includes('return')) {
      if (line.trim().endsWith(';') || line.trim().endsWith(',')) {
        // Might be ok for simple arrow functions
      }
    }

    // Check for function keyword without implementation
    if (/function\s+\w+\s*\([^)]*\)\s*$/.test(line.trim())) {
      errors.push({
        file: file.path,
        line: i + 1,
        message: 'Function declaration incomplete - missing body',
        severity: 'error',
        code: 'INCOMPLETE_FUNCTION',
        suggestion: 'Add function body with { }',
      })
    }
  }

  return errors
}

function checkPlaceholders(file: FileToValidate, lines: string[]): ValidationError[] {
  const warnings: ValidationError[] = []
  const placeholderPatterns = [
    /\bplaceholder\b/gi,
    /\b(lorem|ipsum|dolor|sit|amet)\b/gi,
    /\[\s*\.\.\.\s*\]/gi,
    /\{?\s*\/\*\s*(.*?)\*\/\s*\}?/g,
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const pattern of placeholderPatterns) {
      if (pattern.test(line)) {
        const match = line.match(pattern)
        warnings.push({
          file: file.path,
          line: i + 1,
          message: `Placeholder text or pattern found: "${match?.[0]}"`,
          severity: 'warning',
          code: 'PLACEHOLDER_TEXT',
          suggestion: 'Replace with actual content',
        })
      }
    }
  }

  return warnings
}

function checkImportValidity(file: FileToValidate, lines: string[]): ValidationError[] {
  const errors: ValidationError[] = []

  // Check import statements
  const importRegex = /^import\s+(?:{[^}]+}|[^,\s]+(?:\s*,\s*{[^}]+})?)\s+from\s+['"]([^'"]+)['"]/gm
  let match

  while ((match = importRegex.exec(file.content)) !== null) {
    const importPath = match[1]

    // Check for absolute imports without proper path
    if (importPath.startsWith('.') && !importPath.includes('/')) {
      errors.push({
        file: file.path,
        message: `Suspicious import path: "${importPath}" - relative imports should include full path`,
        severity: 'warning',
        code: 'SUSPICIOUS_IMPORT',
        suggestion: 'Use full relative paths like ./components/Button or ../lib/utils',
      })
    }

    // Check for imports from non-existent packages
    const nonExistentPackages = ['@components', '@pages', '@app', '@server']
    if (nonExistentPackages.some((p) => importPath.startsWith(p))) {
      errors.push({
        file: file.path,
        message: `Import from unknown alias: "${importPath}" - check package.json paths configuration`,
        severity: 'warning',
        code: 'UNKNOWN_IMPORT_ALIAS',
        suggestion: 'Use relative imports (../../components) or configure path aliases',
      })
    }
  }

  // Check for named imports that might not exist
  const namedImportRegex = /import\s*{\s*([^}]+)\s*}\s*from/gm
  while ((match = namedImportRegex.exec(file.content)) !== null) {
    const imports = match[1].split(',').map((s) => s.trim())
    for (const imp of imports) {
      if (imp.includes(' as ')) {
        const [original] = imp.split(' as ')
        if (!original.trim()) {
          errors.push({
            file: file.path,
            message: `Invalid named import: "${imp}"`,
            severity: 'error',
            code: 'INVALID_NAMED_IMPORT',
            suggestion: 'Check import syntax: import { name } from "package"',
          })
        }
      }
    }
  }

  return errors
}

function checkCompletion(file: FileToValidate, lines: string[]): ValidationError[] {
  const errors: ValidationError[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for TODO comments
    if (/\/\/\s*TODO|\/\*\s*TODO/.test(line)) {
      errors.push({
        file: file.path,
        line: i + 1,
        message: 'Code contains TODO comment - implementation incomplete',
        severity: 'error',
        code: 'TODO_COMMENT',
        suggestion: 'Complete the implementation or remove the TODO',
      })
    }

    // Check for FIXME comments
    if (/\/\/\s*FIXME|\/\*\s*FIXME/.test(line)) {
      errors.push({
        file: file.path,
        line: i + 1,
        message: 'Code contains FIXME comment - known issue unresolved',
        severity: 'warning',
        code: 'FIXME_COMMENT',
        suggestion: 'Fix the issue or remove the FIXME',
      })
    }

    // Check for incomplete function implementations
    if (line.includes('{') && i + 1 < lines.length) {
      const nextLine = lines[i + 1]
      if (nextLine.trim() === '' || nextLine.includes('}')) {
        if (/function|const.*=>|async\s+\w+/.test(line) && !line.includes('return')) {
          // Might be incomplete
        }
      }
    }
  }

  // Check for file that's too short (incomplete)
  if (lines.length < 2 && !file.path.endsWith('.css')) {
    errors.push({
      file: file.path,
      message: 'File is suspiciously short - may be incomplete',
      severity: 'warning',
      code: 'SUSPICIOUSLY_SHORT_FILE',
      suggestion: 'Verify the file content is complete',
    })
  }

  return errors
}

function checkAccessibility(file: FileToValidate, lines: string[]): ValidationError[] {
  const warnings: ValidationError[] = []

  if (!file.path.endsWith('.tsx')) {
    return warnings
  }

  // Check for images without alt text
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/<img\s/.test(line) && !/alt\s*=\s*["']/.test(line)) {
      warnings.push({
        file: file.path,
        line: i + 1,
        message: 'Image tag missing alt text for accessibility',
        severity: 'warning',
        code: 'MISSING_ALT_TEXT',
        suggestion: 'Add alt="description" to image tags',
      })
    }

    // Check for next/image imports when <img> is used
    if (/<img\s/.test(line) && !file.content.includes("from 'next/image'")) {
      warnings.push({
        file: file.path,
        line: i + 1,
        message: 'Using <img> instead of next/image - performance issue',
        severity: 'warning',
        code: 'USE_NEXT_IMAGE',
        suggestion: 'Import Image from "next/image" and use <Image> component',
      })
    }

    // Check for prefers-reduced-motion in animations
    if (/(framer-motion|animate|transition)/.test(line) && !file.content.includes('prefers-reduced-motion')) {
      warnings.push({
        file: file.path,
        line: i + 1,
        message: 'Animations used without checking prefers-reduced-motion',
        severity: 'warning',
        code: 'NO_REDUCED_MOTION_CHECK',
        suggestion: 'Check @media (prefers-reduced-motion: reduce) or useReducedMotion hook',
      })
    }
  }

  return warnings
}

function checkImageUsage(file: FileToValidate, lines: string[]): ValidationError[] {
  const errors: ValidationError[] = []

  if (!file.path.endsWith('.tsx')) {
    return errors
  }

  // Check for image URL validation
  const imageUrlRegex = /(?:src|href|url)\s*=\s*["']([^"']+)["']/g
  let match

  while ((match = imageUrlRegex.exec(file.content)) !== null) {
    const url = match[1]

    // Check for placeholder URLs
    if (
      /placeholder|dummy|temp|test|mock|fake|invalid|broken/.test(url) &&
      !url.includes('unsplash.com') &&
      !url.includes('pexels.com')
    ) {
      errors.push({
        file: file.path,
        message: `Placeholder or invalid image URL: "${url}"`,
        severity: 'error',
        code: 'INVALID_IMAGE_URL',
        suggestion: 'Use real Unsplash or Pexels URLs from lib/image-helper.ts',
      })
    }

    // Check for broken/incomplete URLs
    if (!url.startsWith('http') && !url.startsWith('/') && !url.startsWith('@')) {
      if (!url.includes('generateImageUrl') && !url.includes('getImageUrl')) {
        errors.push({
          file: file.path,
          message: `Image URL might be incomplete or invalid: "${url}"`,
          severity: 'warning',
          code: 'POSSIBLY_INVALID_URL',
          suggestion: 'Verify image URLs are fully formed or use image helper functions',
        })
      }
    }
  }

  return errors
}

function validateJSON(file: FileToValidate): { errors: ValidationError[]; warnings: ValidationError[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  try {
    JSON.parse(file.content)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown JSON error'
    errors.push({
      file: file.path,
      message: `Invalid JSON: ${errorMsg}`,
      severity: 'error',
      code: 'INVALID_JSON',
      suggestion: 'Fix JSON syntax (check for trailing commas, missing quotes)',
    })
  }

  // Check for common JSON issues
  if (file.path.endsWith('package.json')) {
    if (!file.content.includes('"name"')) {
      errors.push({
        file: file.path,
        message: 'package.json missing required "name" field',
        severity: 'error',
        code: 'MISSING_PACKAGE_NAME',
        suggestion: 'Add "name": "your-app-name" to package.json',
      })
    }

    if (!file.content.includes('"version"')) {
      warnings.push({
        file: file.path,
        message: 'package.json missing "version" field',
        severity: 'warning',
        code: 'MISSING_VERSION',
        suggestion: 'Add "version": "1.0.0" to package.json',
      })
    }

    // Check for next in dependencies
    if (!file.content.includes('next') && file.path.includes('package.json')) {
      warnings.push({
        file: file.path,
        message: 'Next.js not in dependencies',
        severity: 'warning',
        code: 'MISSING_NEXT',
        suggestion: 'Ensure Next.js is in dependencies',
      })
    }

    // Check for react in dependencies
    if (!file.content.includes('react') && file.path.includes('package.json')) {
      errors.push({
        file: file.path,
        message: 'React not in dependencies',
        severity: 'error',
        code: 'MISSING_REACT',
        suggestion: 'Add React to dependencies: npm install react',
      })
    }
  }

  return { errors, warnings }
}

function validateCSS(file: FileToValidate): { errors: ValidationError[]; warnings: ValidationError[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  const lines = file.content.split('\n')

  // Check for unmatched braces in CSS
  const openBraces = (file.content.match(/{/g) || []).length
  const closeBraces = (file.content.match(/}/g) || []).length
  if (openBraces !== closeBraces) {
    errors.push({
      file: file.path,
      message: `Unmatched braces in CSS: ${openBraces} open vs ${closeBraces} close`,
      severity: 'error',
      code: 'UNMATCHED_BRACES',
      suggestion: 'Check for missing or extra curly braces',
    })
  }

  // Check for common CSS issues
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for missing semicolons in property values
    if (/:\s*[^:;]+$/.test(line.trim()) && line.trim() && !line.includes('{') && !line.includes('}')) {
      if (!line.trim().endsWith(';') && !line.trim().endsWith(',')) {
        warnings.push({
          file: file.path,
          line: i + 1,
          message: 'CSS property might be missing semicolon',
          severity: 'warning',
          code: 'MISSING_SEMICOLON',
          suggestion: 'Add semicolon to CSS property values',
        })
      }
    }
  }

  return { errors, warnings }
}

function buildValidationSummary(errors: ValidationError[], warnings: ValidationError[], fileCount: number): string {
  const lines: string[] = []

  lines.push(`Validation Summary: ${fileCount} files checked`)
  lines.push(`Errors: ${errors.length} | Warnings: ${warnings.length}`)

  if (errors.length > 0) {
    lines.push('\nErrors:')
    for (const error of errors.slice(0, 5)) {
      lines.push(
        `  - [${error.code}] ${error.file}${error.line ? `:${error.line}` : ''}: ${error.message}`
      )
    }
    if (errors.length > 5) {
      lines.push(`  ... and ${errors.length - 5} more errors`)
    }
  }

  if (warnings.length > 0) {
    lines.push('\nWarnings:')
    for (const warning of warnings.slice(0, 3)) {
      lines.push(
        `  - [${warning.code}] ${warning.file}${warning.line ? `:${warning.line}` : ''}: ${warning.message}`
      )
    }
    if (warnings.length > 3) {
      lines.push(`  ... and ${warnings.length - 3} more warnings`)
    }
  }

  return lines.join('\n')
}
