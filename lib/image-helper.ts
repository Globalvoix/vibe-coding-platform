/**
 * Image Helper Utility
 * 
 * Generates contextually accurate image URLs from Unsplash
 * based on app type, purpose, and usage context.
 * 
 * Philosophy: Every image must serve the app's purpose and be visually coherent.
 */

import type { AppType } from './asset-validation'

interface ImageConfig {
  width?: number
  height?: number
  quality?: number
  format?: 'auto' | 'webp' | 'jpg' | 'png'
}

interface UnsplashImageResult {
  url: string
  alt: string
  photographer: string
  photographerUrl: string
  dimensions: {
    width: number
    height: number
  }
}

/**
 * Search terms by app type and context
 * Ensures images are relevant and high-quality for each app category
 */
const IMAGE_SEARCH_TERMS: Record<
  AppType,
  Record<
    'hero' | 'thumbnail' | 'card' | 'background' | 'accent',
    string[]
  >
> = {
  streaming: {
    hero: [
      'cinema',
      'film noir',
      'movie scenes',
      'dramatic lighting',
      'theaters',
    ],
    thumbnail: ['posters', 'film frames', 'dramatic portraits', 'cinema art'],
    card: ['movie stills', 'actors', 'film scenes'],
    background: ['cinematic', 'dark moody', 'film texture'],
    accent: ['red curtains', 'movie theater', 'spotlight'],
  },
  ecommerce: {
    hero: [
      'shopping',
      'storefront',
      'retail',
      'marketplace',
      'product showcase',
    ],
    thumbnail: ['product', 'merchandise', 'items for sale'],
    card: ['product display', 'shopping bags', 'retail'],
    background: ['market', 'store interior', 'clean shelves'],
    accent: ['color swatches', 'product detail', 'texture'],
  },
  saas: {
    hero: [
      'technology',
      'office workspace',
      'software',
      'digital interface',
      'business',
    ],
    thumbnail: ['software interface', 'dashboard', 'analytics', 'tech'],
    card: ['laptop', 'monitor', 'workspace', 'business'],
    background: ['clean workspace', 'minimal office', 'technology'],
    accent: ['code', 'data visualization', 'digital art'],
  },
  dashboard: {
    hero: [
      'analytics',
      'charts',
      'data visualization',
      'business metrics',
      'performance',
    ],
    thumbnail: ['graph', 'chart', 'statistics', 'analytics dashboard'],
    card: ['data', 'metrics', 'analysis', 'reporting'],
    background: ['clean professional', 'minimalist', 'technical'],
    accent: ['colorful charts', 'graph visualization', 'data'],
  },
  auth: {
    hero: [
      'security',
      'protection',
      'trust',
      'professional',
      'secure technology',
    ],
    thumbnail: ['padlock', 'security', 'technology', 'trust'],
    card: ['professional background', 'secure network', 'protection'],
    background: ['clean professional', 'secure', 'minimalist'],
    accent: ['security symbols', 'lock', 'shield'],
  },
  calculator: {
    hero: ['mathematics', 'numbers', 'calculation', 'technology', 'education'],
    thumbnail: ['math', 'numbers', 'equation', 'calculator'],
    card: ['educational', 'technology', 'mathematics'],
    background: ['clean minimal', 'technical', 'white space'],
    accent: ['numbers', 'mathematical symbols', 'digital'],
  },
  blog: {
    hero: [
      'writing',
      'articles',
      'reading',
      'literature',
      'knowledge',
      'learning',
    ],
    thumbnail: ['book', 'writing', 'article', 'reading'],
    card: ['blog post', 'article', 'writing desk'],
    background: ['library', 'books', 'writing space'],
    accent: ['typography', 'text', 'pages'],
  },
  portfolio: {
    hero: [
      'creative work',
      'design',
      'projects',
      'creativity',
      'innovation',
      'showcase',
    ],
    thumbnail: ['design work', 'creative', 'portfolio', 'projects'],
    card: ['artwork', 'design', 'creative'],
    background: ['creative studio', 'artistic', 'minimal'],
    accent: ['color palette', 'design element', 'creative'],
  },
  landing: {
    hero: [
      'product launch',
      'hero image',
      'feature showcase',
      'product demo',
      'startup',
    ],
    thumbnail: ['product mockup', 'feature', 'showcase'],
    card: ['feature', 'benefit', 'advantage'],
    background: ['modern startup', 'innovation', 'technology'],
    accent: ['product detail', 'feature highlight', 'showcase'],
  },
  social: {
    hero: [
      'people',
      'community',
      'conversation',
      'connection',
      'social interaction',
    ],
    thumbnail: [
      'portrait',
      'people',
      'community',
      'group',
      'social gathering',
    ],
    card: ['people', 'portrait', 'connection'],
    background: ['social event', 'community', 'gathering'],
    accent: ['faces', 'expressions', 'people'],
  },
  music: {
    hero: [
      'music',
      'audio',
      'concert',
      'performance',
      'musician',
      'sound',
    ],
    thumbnail: [
      'musician',
      'instrument',
      'concert',
      'album art',
      'speaker',
    ],
    card: ['artist', 'musician', 'performance'],
    background: ['concert', 'music venue', 'stage'],
    accent: ['instrument', 'headphones', 'audio equipment'],
  },
  news: {
    hero: [
      'journalism',
      'news',
      'breaking news',
      'reporting',
      'newspaper',
      'media',
    ],
    thumbnail: ['news broadcast', 'journalism', 'reporting', 'headline'],
    card: ['news story', 'journalism', 'report'],
    background: ['news desk', 'journalism', 'professional'],
    accent: ['headline', 'breaking news', 'report'],
  },
  banking: {
    hero: [
      'finance',
      'money',
      'banking',
      'investment',
      'security',
      'trust',
    ],
    thumbnail: ['money', 'banking', 'financial', 'secure'],
    card: ['financial', 'transaction', 'investment'],
    background: ['professional financial', 'secure', 'trust'],
    accent: ['coins', 'money', 'financial chart'],
  },
  'real-estate': {
    hero: [
      'property',
      'house',
      'apartment',
      'real estate',
      'modern home',
      'interior',
    ],
    thumbnail: ['house', 'apartment', 'property', 'home'],
    card: ['property', 'real estate', 'interior'],
    background: ['home interior', 'architecture', 'modern'],
    accent: ['interior design', 'home decor', 'property detail'],
  },
}

/**
 * Recommended Unsplash search queries by app type
 * Returns 2-3 best search terms for each context
 */
export function getUnsplashSearchTerms(
  appType: AppType,
  context: 'hero' | 'thumbnail' | 'card' | 'background' | 'accent'
): string[] {
  const terms = IMAGE_SEARCH_TERMS[appType]?.[context] || []
  // Return top 2-3 most relevant terms
  return terms.slice(0, 3)
}

/**
 * Build Unsplash API URL with proper parameters
 */
export function buildUnsplashUrl(
  searchTerm: string,
  config?: ImageConfig
): string {
  const params = new URLSearchParams()
  params.set('query', searchTerm)
  params.set('w', String(config?.width || 1200))
  params.set('h', String(config?.height || 400))
  params.set('fit', 'crop')
  params.set('crop', 'entropy') // Focus on interesting areas
  params.set('q', String(config?.quality || 80))
  params.set('fm', config?.format || 'auto')

  return `https://images.unsplash.com/search/${params.toString()}`
}

/**
 * Generate appropriate image URLs for different app contexts
 * Based on app type and usage purpose
 */
export function generateImageUrl(
  appType: AppType,
  context: 'hero' | 'thumbnail' | 'card' | 'background' | 'accent',
  options?: ImageConfig
): string {
  const searchTerms = getUnsplashSearchTerms(appType, context)
  const searchTerm = searchTerms[0] || 'placeholder'

  // Default dimensions by context
  const defaultDimensions: Record<
    'hero' | 'thumbnail' | 'card' | 'background' | 'accent',
    [number, number]
  > = {
    hero: [1200, 400],
    thumbnail: [300, 300],
    card: [400, 300],
    background: [1920, 1080],
    accent: [200, 200],
  }

  const [defaultWidth, defaultHeight] = defaultDimensions[context]

  const config: ImageConfig = {
    width: options?.width || defaultWidth,
    height: options?.height || defaultHeight,
    quality: options?.quality || 85,
    format: options?.format || 'auto',
  }

  return buildUnsplashUrl(searchTerm, config)
}

/**
 * Generate alt text for images based on app type and context
 */
export function generateAltText(
  appType: AppType,
  context: 'hero' | 'thumbnail' | 'card' | 'background' | 'accent'
): string {
  const altTexts: Record<AppType, Record<string, string>> = {
    streaming: {
      hero: 'Cinematic film scene showcasing dramatic storytelling',
      thumbnail: 'Movie poster with dramatic lighting',
      card: 'Film scene frame',
      background: 'Dark cinematic texture',
      accent: 'Theater spotlight and red curtains',
    },
    ecommerce: {
      hero: 'Modern retail storefront with quality merchandise',
      thumbnail: 'Product showcase display',
      card: 'Individual product item',
      background: 'Clean retail market interior',
      accent: 'Product detail and color variations',
    },
    saas: {
      hero: 'Professional technology workspace with monitors',
      thumbnail: 'Software dashboard interface',
      card: 'Business technology setup',
      background: 'Minimalist professional office',
      accent: 'Code or data visualization',
    },
    dashboard: {
      hero: 'Analytics dashboard with performance metrics',
      thumbnail: 'Charts and statistical graphs',
      card: 'Data visualization card',
      background: 'Technical professional background',
      accent: 'Colorful data visualization',
    },
    auth: {
      hero: 'Secure technology and trust concept',
      thumbnail: 'Security and protection symbols',
      card: 'Professional secure environment',
      background: 'Clean secure background',
      accent: 'Lock and security elements',
    },
    calculator: {
      hero: 'Mathematical calculations and numbers',
      thumbnail: 'Calculator and mathematical concepts',
      card: 'Educational mathematics',
      background: 'Clean minimal white space',
      accent: 'Numerical and mathematical symbols',
    },
    blog: {
      hero: 'Writing and literature composition',
      thumbnail: 'Blog article and reading materials',
      card: 'Article content display',
      background: 'Literary and knowledge focused',
      accent: 'Typography and text design',
    },
    portfolio: {
      hero: 'Creative work showcase and design portfolio',
      thumbnail: 'Design project mockup',
      card: 'Creative portfolio piece',
      background: 'Artistic creative studio',
      accent: 'Design color palette and elements',
    },
    landing: {
      hero: 'Product feature showcase and demonstration',
      thumbnail: 'Product mockup and showcase',
      card: 'Feature highlight display',
      background: 'Modern technology startup',
      accent: 'Product detail close-up',
    },
    social: {
      hero: 'Community connection and social interaction',
      thumbnail: 'People and community gathering',
      card: 'Portrait and person profile',
      background: 'Social event and gathering',
      accent: 'Faces and human expressions',
    },
    music: {
      hero: 'Concert performance and musical atmosphere',
      thumbnail: 'Musician and instrument showcase',
      card: 'Musical artist portrait',
      background: 'Concert stage and venue',
      accent: 'Music instruments and equipment',
    },
    news: {
      hero: 'Journalism and news reporting',
      thumbnail: 'News broadcast and reporting',
      card: 'News story presentation',
      background: 'Professional news environment',
      accent: 'Breaking news and headlines',
    },
    banking: {
      hero: 'Financial security and trust',
      thumbnail: 'Banking and financial services',
      card: 'Financial transaction concept',
      background: 'Professional financial environment',
      accent: 'Money and financial visualization',
    },
    'real-estate': {
      hero: 'Modern property and home showcase',
      thumbnail: 'Real estate property display',
      card: 'Individual property listing',
      background: 'Modern home interior',
      accent: 'Interior design and home details',
    },
  }

  return altTexts[appType]?.[context] || `${appType} related image`
}

/**
 * Validate image URL is working and accessible
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Generate a complete image configuration for templates
 */
export function generateImageConfig(
  appType: AppType,
  context: 'hero' | 'thumbnail' | 'card' | 'background' | 'accent'
): {
  url: string
  alt: string
  width: number
  height: number
  context: string
} {
  const contextDimensions = {
    hero: { width: 1200, height: 400 },
    thumbnail: { width: 300, height: 300 },
    card: { width: 400, height: 300 },
    background: { width: 1920, height: 1080 },
    accent: { width: 200, height: 200 },
  }

  const dimensions = contextDimensions[context]

  return {
    url: generateImageUrl(appType, context, dimensions),
    alt: generateAltText(appType, context),
    ...dimensions,
    context,
  }
}

export type { ImageConfig }
