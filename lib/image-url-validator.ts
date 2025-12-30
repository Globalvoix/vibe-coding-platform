/**
 * Image URL Validator
 * 
 * Verifies that generated Unsplash image URLs are valid and accessible
 * before including them in generated code. Prevents broken image links.
 */

interface ImageUrlCheckResult {
  url: string
  isValid: boolean
  isAccessible: boolean
  statusCode?: number
  errorMessage?: string
}

interface BatchValidationResult {
  totalChecked: number
  validUrls: number
  invalidUrls: string[]
  passRate: number
}

/**
 * Validate single Unsplash URL format
 */
export function validateUnsplashUrlFormat(url: string): { isValid: boolean; error?: string } {
  try {
    const urlObj = new URL(url)

    // Check if it's from Unsplash
    if (!urlObj.hostname.includes('unsplash.com') && !urlObj.hostname.includes('images.unsplash.com')) {
      return {
        isValid: false,
        error: 'URL must be from Unsplash (images.unsplash.com)',
      }
    }

    // Check if it has required parameters
    const hasValidPath = urlObj.pathname.includes('/photo/') || urlObj.pathname.includes('/search/')
    if (!hasValidPath) {
      return {
        isValid: false,
        error: 'URL must contain /photo/ or /search/ path',
      }
    }

    return { isValid: true }
  } catch (error: unknown) {
    return {
      isValid: false,
      error: `Invalid URL format: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Check if Unsplash URL is accessible (HEAD request)
 */
export async function checkUrlAccessibility(url: string): Promise<ImageUrlCheckResult> {
  const formatCheck = validateUnsplashUrlFormat(url)

  if (!formatCheck.isValid) {
    return {
      url,
      isValid: false,
      isAccessible: false,
      errorMessage: formatCheck.error,
    }
  }

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
    })

    const isAccessible = response.ok
    const statusCode = response.status

    return {
      url,
      isValid: isAccessible,
      isAccessible,
      statusCode,
      errorMessage: isAccessible ? undefined : `HTTP ${statusCode}`,
    }
  } catch (error: unknown) {
    return {
      url,
      isValid: false,
      isAccessible: false,
      errorMessage: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Validate multiple URLs
 */
export async function validateMultipleUrls(urls: string[]): Promise<BatchValidationResult> {
  const results = await Promise.all(urls.map(url => checkUrlAccessibility(url)))

  const validUrls = results.filter(r => r.isValid)
  const invalidUrls = results
    .filter(r => !r.isValid)
    .map(r => `${r.url} (${r.errorMessage})`)

  return {
    totalChecked: urls.length,
    validUrls: validUrls.length,
    invalidUrls,
    passRate: urls.length > 0 ? (validUrls.length / urls.length) * 100 : 0,
  }
}

/**
 * Generate fallback URL if primary fails
 */
export function generateFallbackUrl(
  appType: string,
  context: 'hero' | 'thumbnail' | 'card' | 'background' | 'accent'
): string {
  // Use placeholder service as fallback
  const dimensions: Record<string, [number, number]> = {
    hero: [1200, 400],
    thumbnail: [300, 300],
    card: [400, 300],
    background: [1920, 1080],
    accent: [200, 200],
  }

  const [width, height] = dimensions[context] || [400, 300]

  // Use picsum.photos as lightweight fallback
  return `https://picsum.photos/${width}/${height}?random=1&blur=5`
}

/**
 * Extract all image URLs from generated code
 */
export function extractImageUrlsFromCode(code: string): string[] {
  const urls: string[] = []

  // Match pattern: generateImageUrl(...) or direct URL strings
  const urlPattern = /generateImageUrl\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g
  let match

  while ((match = urlPattern.exec(code)) !== null) {
    // This extracts app type and context, but we'd need the actual function call
    // For actual URLs, look for hardcoded strings
  }

  // Also extract hardcoded Unsplash URLs
  const hardcodedPattern = /https?:\/\/images?\.unsplash\.com\/[^\s'"]+/g
  const hardcodedMatches = code.match(hardcodedPattern) || []
  urls.push(...hardcodedMatches)

  return [...new Set(urls)]
}

/**
 * Audit generated code for image URLs
 */
export async function auditGeneratedCode(code: string): Promise<{
  foundUrls: string[]
  validationResult: BatchValidationResult
  recommendations: string[]
}> {
  const foundUrls = extractImageUrlsFromCode(code)
  const validationResult = await validateMultipleUrls(foundUrls)

  const recommendations: string[] = []

  if (validationResult.totalChecked === 0) {
    recommendations.push('No hardcoded image URLs found. Good! Using generateImageUrl() is preferred.')
  }

  if (validationResult.invalidUrls.length > 0) {
    recommendations.push(`${validationResult.invalidUrls.length} invalid URLs found. Replace with generateImageUrl()`)
  }

  if (validationResult.passRate < 100 && foundUrls.length > 0) {
    recommendations.push(
      `Image URL pass rate: ${validationResult.passRate.toFixed(1)}%. Consider using generateImageUrl() instead.`
    )
  }

  return {
    foundUrls,
    validationResult,
    recommendations,
  }
}

/**
 * Generate validation report for debugging
 */
export function generateValidationReport(result: BatchValidationResult): string {
  const lines = [
    '# Image URL Validation Report',
    `Total Checked: ${result.totalChecked}`,
    `Valid URLs: ${result.validUrls}`,
    `Invalid URLs: ${result.totalChecked - result.validUrls}`,
    `Pass Rate: ${result.passRate.toFixed(1)}%`,
    '',
  ]

  if (result.invalidUrls.length > 0) {
    lines.push('## Invalid URLs:')
    result.invalidUrls.forEach(url => {
      lines.push(`- ${url}`)
    })
  }

  return lines.join('\n')
}

/**
 * Create safe image config from validated URLs
 */
export function createSafeImageConfig(
  url: string,
  alt: string,
  width: number,
  height: number
): {
  primary: string
  fallback: string
  alt: string
  width: number
  height: number
} {
  return {
    primary: url,
    fallback: generateFallbackUrl('landing', 'card'),
    alt,
    width,
    height,
  }
}
