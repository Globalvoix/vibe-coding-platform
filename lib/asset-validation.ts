/**
 * Asset Validation Service
 * 
 * Enforces institutional-grade asset quality standards:
 * - Images must be contextually relevant to app niche
 * - All image URLs must be valid and high-resolution
 * - No broken or generic placeholder images
 * - Proper aspect ratios and dimensions
 */

interface AssetValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

interface ImageAsset {
  url: string
  alt: string
  width?: number
  height?: number
  context: 'hero' | 'thumbnail' | 'icon' | 'background' | 'product' | 'avatar'
  appType: AppType
}

type AppType =
  | 'streaming'
  | 'ecommerce'
  | 'saas'
  | 'dashboard'
  | 'auth'
  | 'calculator'
  | 'blog'
  | 'portfolio'
  | 'landing'
  | 'social'
  | 'music'
  | 'news'
  | 'banking'
  | 'real-estate'

/**
 * Forbidden image patterns by app type
 * Prevents out-of-context assets (e.g., shoes in movie app)
 */
const FORBIDDEN_PATTERNS: Record<AppType, RegExp[]> = {
  streaming: [
    /shoe|sneaker|footwear|pizza|food|kitchen|restaurant|shopping|clothes|fashion|jewelry/i,
  ],
  ecommerce: [/office|workspace|corporate|executive|suit|tie|presentation/i],
  saas: [
    /party|celebration|wedding|birthday|intimate|nude|adult|beer|wine|alcohol/i,
  ],
  dashboard: [
    /beach|vacation|travel|art|painting|music|concert|entertainment|luxury/i,
  ],
  auth: [/gaming|party|casual|funny|meme|joke|cartoon|animation|character/i],
  calculator: [/person|face|portrait|people|crowd|social|fashion|lifestyle/i],
  blog: [/commercial|product|brand|logo|advertisement|ad|sponsored/i],
  portfolio: [/watermark|generic|stock|placeholder|template|demo|sample/i],
  landing: [/outdated|old|vintage|retro|obsolete|broken|error|warning/i],
  social: [
    /explicit|inappropriate|offensive|violent|harmful|dangerous|weapons/i,
  ],
  music: [
    /office|corporate|business|serious|formal|professional|technical/i,
  ],
  news: [/unrelated|misleading|clickbait|irrelevant|distraction|sponsored/i],
  banking: [/casual|funny|entertainment|gaming|party|social|playful/i],
  'real-estate': [/person|face|portrait|human|people|crowd|social/i],
}

/**
 * Required image sources for each app type
 */
const REQUIRED_IMAGE_SOURCES: Record<AppType, string[]> = {
  streaming: ['movie', 'cinema', 'film', 'actor', 'dramatic', 'scene'],
  ecommerce: ['product', 'shopping', 'store', 'market', 'merchandise'],
  saas: ['technology', 'business', 'office', 'workspace', 'interface'],
  dashboard: ['chart', 'graph', 'data', 'analytics', 'business'],
  auth: ['security', 'lock', 'protection', 'trust', 'professional'],
  calculator: ['math', 'numbers', 'calculation', 'equation', 'technology'],
  blog: ['writing', 'article', 'reading', 'literature', 'knowledge'],
  portfolio: ['project', 'design', 'creative', 'work', 'showcase'],
  landing: ['product', 'hero', 'feature', 'demo', 'showcase'],
  social: ['people', 'community', 'conversation', 'connection', 'social'],
  music: ['music', 'audio', 'song', 'artist', 'performance', 'concert'],
  news: ['news', 'journalism', 'headline', 'breaking', 'report'],
  banking: ['finance', 'money', 'security', 'transaction', 'investment'],
  'real-estate': ['property', 'house', 'apartment', 'building', 'home'],
}

/**
 * Validate if image is from approved royalty-free sources
 */
const APPROVED_DOMAINS = [
  'unsplash.com',
  'images.unsplash.com',
  'pexels.com',
  'images.pexels.com',
  'pixabay.com',
  'cdn.pixabay.com',
  'imagedelivery.net', // Cloudflare Images
  'cdn.builder.io',
]

/**
 * Validate minimum dimensions for image contexts
 */
const MIN_DIMENSIONS: Record<ImageAsset['context'], [number, number]> = {
  hero: [1200, 400],
  thumbnail: [300, 200],
  icon: [24, 24],
  background: [1920, 1080],
  product: [400, 400],
  avatar: [64, 64],
}

/**
 * Check if URL is from an approved source
 */
function isApprovedSource(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase()
    return APPROVED_DOMAINS.some((approved) => domain.includes(approved))
  } catch {
    return false
  }
}

/**
 * Check if image matches forbidden patterns for app type
 */
function hasForbiddenContent(alt: string, appType: AppType): string[] {
  const patterns = FORBIDDEN_PATTERNS[appType] || []
  const errors: string[] = []

  for (const pattern of patterns) {
    if (pattern.test(alt)) {
      errors.push(
        `Image alt text "${alt}" contains forbidden pattern for ${appType} app`
      )
    }
  }

  return errors
}

/**
 * Check if image dimensions are acceptable
 */
function validateDimensions(
  width: number | undefined,
  height: number | undefined,
  context: ImageAsset['context']
): string[] {
  const errors: string[] = []
  const [minWidth, minHeight] = MIN_DIMENSIONS[context]

  if (!width || !height) {
    return errors // Warnings only if dimensions missing
  }

  if (width < minWidth || height < minHeight) {
    errors.push(
      `Image dimensions (${width}x${height}) below recommended for ${context} (${minWidth}x${minHeight})`
    )
  }

  return errors
}

/**
 * Main validation function
 */
export function validateAsset(asset: ImageAsset): AssetValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Check if from approved source
  if (!isApprovedSource(asset.url)) {
    errors.push(
      `Image URL from unapproved domain. Use Unsplash, Pexels, Pixabay, or similar. Got: ${asset.url}`
    )
  }

  // 2. Check for forbidden patterns
  const forbiddenErrors = hasForbiddenContent(asset.alt, asset.appType)
  errors.push(...forbiddenErrors)

  // 3. Check dimensions if provided
  if (asset.width || asset.height) {
    const dimErrors = validateDimensions(
      asset.width,
      asset.height,
      asset.context
    )
    errors.push(...dimErrors)
  }

  // 4. Check if URL is valid format
  try {
    new URL(asset.url)
  } catch {
    errors.push(`Invalid image URL format: ${asset.url}`)
  }

  // 5. Warn if alt text is generic
  if (
    /image|photo|picture|screenshot|placeholder|image description/i.test(
      asset.alt
    )
  ) {
    warnings.push(`Alt text is generic. Be specific: "${asset.alt}"`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate multiple assets
 */
export function validateAssets(
  assets: ImageAsset[]
): Record<string, AssetValidationResult> {
  const results: Record<string, AssetValidationResult> = {}

  for (const asset of assets) {
    results[asset.url] = validateAsset(asset)
  }

  return results
}

/**
 * Get validation summary
 */
export function getValidationSummary(results: Record<string, AssetValidationResult>) {
  const validAssets = Object.values(results).filter((r) => r.isValid).length
  const totalAssets = Object.keys(results).length
  const totalErrors = Object.values(results).reduce(
    (sum, r) => sum + r.errors.length,
    0
  )

  return {
    validAssets,
    totalAssets,
    totalErrors,
    passRate: ((validAssets / totalAssets) * 100).toFixed(1),
  }
}

/**
 * Asset audit report for debugging
 */
export function generateAuditReport(
  results: Record<string, AssetValidationResult>
): string {
  const lines: string[] = ['# Asset Validation Audit Report\n']

  for (const [url, result] of Object.entries(results)) {
    lines.push(`## ${url}`)
    lines.push(`Status: ${result.isValid ? '✅ Valid' : '❌ Invalid'}`)

    if (result.errors.length > 0) {
      lines.push('### Errors:')
      for (const error of result.errors) {
        lines.push(`- ${error}`)
      }
    }

    if (result.warnings.length > 0) {
      lines.push('### Warnings:')
      for (const warning of result.warnings) {
        lines.push(`- ${warning}`)
      }
    }

    lines.push('')
  }

  const summary = getValidationSummary(results)
  lines.push('## Summary')
  lines.push(`Valid Assets: ${summary.validAssets}/${summary.totalAssets}`)
  lines.push(`Pass Rate: ${summary.passRate}%`)
  lines.push(`Total Errors: ${summary.totalErrors}`)

  return lines.join('\n')
}

export type { ImageAsset, AssetValidationResult, AppType }
