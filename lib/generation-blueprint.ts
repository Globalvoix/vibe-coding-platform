/**
 * Generation Blueprint System
 * 
 * Analyzes file paths and user context to build a detailed blueprint
 * before code generation. This ensures the LLM has all necessary context
 * for generating high-quality, institutional-grade code.
 */

import { identifyAppType, getRequiredAnimations, type AppType } from './app-intelligence'
import type { ImageAsset } from './asset-validation'

export interface GenerationBlueprint {
  appType: AppType | null
  paths: string[]
  requiredModels: {
    primary: string
    fallback: string
  }
  imageAudit: ImageAuditPlan
  animationRequirements: string[]
  componentStructure: ComponentStructurePlan
  libraryDependencies: LibraryDependencies
  dataModel: DataModelPlan
  validationRules: ValidationRule[]
  designTokens: DesignTokenPlan
  qualityCheckpoints: QualityCheckpoint[]
}

export interface ImageAuditPlan {
  contexts: ('hero' | 'thumbnail' | 'card' | 'background' | 'product' | 'avatar')[]
  altTextPatterns: Record<string, string>
  unsplashSearchTerms: string[]
  contextSpecificRules: Record<string, string>
  totalImagesNeeded: number
}

export interface ComponentStructurePlan {
  routes: string[]
  mainComponents: string[]
  layouts: string[]
  requiredPages: number
  navigationModel: string
  stateManagementNeeded: boolean
}

export interface LibraryDependencies {
  animation: string[]
  ui: string[]
  utilities: string[]
  data: string[]
  recommended: string[]
}

export interface DataModelPlan {
  entities: string[]
  mockDataLocation: string
  minimumItems: number
  requiredFields: Record<string, string[]>
  errorStates: string[]
  loadingStates: string[]
  emptyStates: string[]
}

export interface DesignTokenPlan {
  spacingScale: string
  typographyHierarchy: string[]
  colorPalette: string
  componentPatterns: string[]
  animationLibrary: string
}

export interface ValidationRule {
  category: 'syntax' | 'imports' | 'components' | 'images' | 'completeness' | 'accessibility'
  rule: string
  enforcementLevel: 'error' | 'warning'
}

export interface QualityCheckpoint {
  phase: 'pre-generation' | 'during-generation' | 'post-generation'
  checkpoint: string
  blockers: string[]
}

const APP_TYPE_IMAGE_CONTEXTS: Record<AppType, ImageAuditPlan['contexts']> = {
  streaming: ['hero', 'card', 'thumbnail'],
  ecommerce: ['product', 'hero', 'card'],
  saas: ['hero', 'card', 'thumbnail'],
  dashboard: ['card', 'thumbnail'],
  auth: ['hero', 'background'],
  calculator: ['hero'],
  blog: ['hero', 'card', 'thumbnail'],
  portfolio: ['hero', 'card', 'thumbnail'],
  landing: ['hero', 'card'],
  social: ['card', 'avatar', 'thumbnail'],
  music: ['card', 'thumbnail', 'hero'],
  news: ['hero', 'card', 'thumbnail'],
  banking: ['hero', 'card'],
  'real-estate': ['hero', 'card', 'product'],
}

const APP_TYPE_LIBRARIES: Record<AppType, Partial<LibraryDependencies>> = {
  streaming: {
    animation: ['framer-motion'],
    ui: ['lucide-react'],
    utilities: ['clsx'],
    data: [],
    recommended: ['swiper'],
  },
  ecommerce: {
    animation: ['framer-motion'],
    ui: ['lucide-react'],
    utilities: ['clsx', 'zustand'],
    data: [],
    recommended: ['react-hot-toast'],
  },
  saas: {
    animation: ['framer-motion'],
    ui: ['lucide-react'],
    utilities: ['clsx', 'zustand'],
    data: [],
    recommended: ['react-hook-form', 'zod'],
  },
  dashboard: {
    animation: [],
    ui: ['lucide-react'],
    utilities: ['clsx'],
    data: [],
    recommended: ['recharts'],
  },
  auth: {
    animation: [],
    ui: ['lucide-react'],
    utilities: ['clsx'],
    data: [],
    recommended: [],
  },
  calculator: {
    animation: [],
    ui: ['lucide-react'],
    utilities: [],
    data: [],
    recommended: [],
  },
  blog: {
    animation: ['framer-motion'],
    ui: ['lucide-react'],
    utilities: ['clsx'],
    data: [],
    recommended: [],
  },
  portfolio: {
    animation: ['framer-motion'],
    ui: ['lucide-react'],
    utilities: ['clsx'],
    data: [],
    recommended: [],
  },
  landing: {
    animation: ['framer-motion'],
    ui: ['lucide-react'],
    utilities: ['clsx'],
    data: [],
    recommended: ['react-scroll'],
  },
  social: {
    animation: ['framer-motion'],
    ui: ['lucide-react'],
    utilities: ['clsx', 'zustand'],
    data: [],
    recommended: [],
  },
  music: {
    animation: ['framer-motion'],
    ui: ['lucide-react'],
    utilities: ['clsx'],
    data: [],
    recommended: [],
  },
  news: {
    animation: ['framer-motion'],
    ui: ['lucide-react'],
    utilities: ['clsx'],
    data: [],
    recommended: [],
  },
  banking: {
    animation: [],
    ui: ['lucide-react'],
    utilities: ['clsx'],
    data: [],
    recommended: ['react-hook-form'],
  },
  'real-estate': {
    animation: ['framer-motion'],
    ui: ['lucide-react'],
    utilities: ['clsx'],
    data: [],
    recommended: [],
  },
}

/**
 * Analyze generation request and build detailed blueprint
 */
export function buildGenerationBlueprint(params: {
  paths: string[]
  userRequest?: string
  conversationHistory?: string
}): GenerationBlueprint {
  const { paths, userRequest = '', conversationHistory = '' } = params

  // Detect app type from paths and request
  const appType = detectAppTypeFromPaths(paths) || identifyAppType(userRequest) || identifyAppType(conversationHistory)

  // Extract route structure
  const routes = extractRoutes(paths)

  // Determine main components needed
  const mainComponents = extractComponentNames(paths)

  // Determine animations needed
  const animationRequirements = appType ? getRequiredAnimations(appType) : []

  // Plan image audit
  const imageAudit = planImageAudit(appType, paths)

  // Gather library dependencies
  const libraryDependencies = gatherLibraryDependencies(appType, paths, animationRequirements)

  // Plan data model
  const dataModel = planDataModel(appType)

  // Design tokens
  const designTokens = planDesignTokens(appType)

  // Validation rules
  const validationRules = generateValidationRules(appType, paths)

  // Quality checkpoints
  const qualityCheckpoints = generateQualityCheckpoints(appType, routes.length)

  // Select optimal models
  const requiredModels = selectModelsForPaths(paths, appType)

  return {
    appType,
    paths,
    requiredModels,
    imageAudit,
    animationRequirements,
    componentStructure: {
      routes,
      mainComponents,
      layouts: extractLayouts(paths),
      requiredPages: routes.length,
      navigationModel: routes.length > 1 ? 'navigation-required' : 'single-page',
      stateManagementNeeded: animationRequirements.length > 0 || routes.length > 2,
    },
    libraryDependencies,
    dataModel,
    validationRules,
    designTokens,
    qualityCheckpoints,
  }
}

function detectAppTypeFromPaths(paths: string[]): AppType | null {
  const pathString = paths.join(' ').toLowerCase()

  if (pathString.includes('netflix') || pathString.includes('streaming') || pathString.includes('watch')) {
    return 'streaming'
  }
  if (pathString.includes('shop') || pathString.includes('ecommerce') || pathString.includes('product')) {
    return 'ecommerce'
  }
  if (pathString.includes('dashboard') || pathString.includes('analytics')) {
    return 'dashboard'
  }
  if (pathString.includes('auth') || pathString.includes('login')) {
    return 'auth'
  }
  if (pathString.includes('blog') || pathString.includes('article')) {
    return 'blog'
  }

  return null
}

function extractRoutes(paths: string[]): string[] {
  const routes = new Set<string>()

  for (const path of paths) {
    const match = path.match(/app\/\(([^/]+)\)\/page\.(tsx?|jsx?)$/)
    if (match) {
      routes.add(match[1])
    }

    const simpleMatch = path.match(/app\/([^/]+)\/page\.(tsx?|jsx?)$/)
    if (simpleMatch && simpleMatch[1] !== 'page') {
      routes.add(simpleMatch[1])
    }
  }

  if (routes.size === 0) {
    routes.add('/')
  }

  return Array.from(routes).sort()
}

function extractComponentNames(paths: string[]): string[] {
  const components = new Set<string>()

  for (const path of paths) {
    const match = path.match(/components\/([A-Z][a-zA-Z]+)\.(tsx?|jsx?)$/)
    if (match) {
      components.add(match[1])
    }
  }

  return Array.from(components).sort()
}

function extractLayouts(paths: string[]): string[] {
  const layouts = new Set<string>()

  for (const path of paths) {
    if (path.includes('layout.tsx') || path.includes('layout.jsx')) {
      layouts.add(path)
    }
  }

  return Array.from(layouts)
}

function planImageAudit(appType: AppType | null, paths: string[]): ImageAuditPlan {
  if (!appType) {
    return {
      contexts: ['hero'],
      altTextPatterns: { hero: 'Hero image for the application' },
      unsplashSearchTerms: [],
      contextSpecificRules: {},
      totalImagesNeeded: 0,
    }
  }

  const contexts = APP_TYPE_IMAGE_CONTEXTS[appType] || ['hero']
  const imageCount = contexts.length

  return {
    contexts,
    altTextPatterns: generateAltTextPatterns(appType),
    unsplashSearchTerms: generateUnsplashTerms(appType),
    contextSpecificRules: generateImageContextRules(appType),
    totalImagesNeeded: imageCount,
  }
}

function generateAltTextPatterns(appType: AppType): Record<string, string> {
  const patterns: Record<AppType, Record<string, string>> = {
    streaming: {
      hero: 'Featured movie or TV series',
      card: 'Movie or series thumbnail',
      thumbnail: 'Content thumbnail image',
    },
    ecommerce: {
      product: 'Product image showing details',
      hero: 'Featured product or promotion',
      card: 'Product in collection',
    },
    saas: {
      hero: 'Product interface screenshot',
      card: 'Feature demonstration',
      thumbnail: 'App interface detail',
    },
    dashboard: {
      card: 'Data visualization or metric',
      thumbnail: 'Chart or graph',
    },
    auth: {
      hero: 'Authentication interface',
      background: 'Security or trust imagery',
    },
    calculator: {
      hero: 'Calculator interface',
    },
    blog: {
      hero: 'Article header image',
      card: 'Article thumbnail',
      thumbnail: 'Post preview image',
    },
    portfolio: {
      hero: 'Portfolio showcase',
      card: 'Project thumbnail',
      thumbnail: 'Work sample',
    },
    landing: {
      hero: 'Product hero image',
      card: 'Feature highlight',
    },
    social: {
      card: 'User post or content',
      avatar: 'User profile picture',
      thumbnail: 'Content preview',
    },
    music: {
      card: 'Album or playlist cover',
      thumbnail: 'Artist or album art',
      hero: 'Featured music content',
    },
    news: {
      hero: 'Featured news story',
      card: 'Article thumbnail',
      thumbnail: 'News preview image',
    },
    banking: {
      hero: 'Financial interface',
      card: 'Transaction or account preview',
    },
    'real-estate': {
      hero: 'Featured property',
      card: 'Property listing',
      product: 'Property image',
    },
  }

  return patterns[appType] || { hero: 'Application header image' }
}

function generateUnsplashTerms(appType: AppType): string[] {
  const terms: Record<AppType, string[]> = {
    streaming: ['cinema', 'movie stills', 'film scenes', 'actor portraits', 'dramatic landscape'],
    ecommerce: ['product photography', 'shopping', 'retail', 'luxury items', 'store'],
    saas: ['technology interface', 'workspace', 'collaboration', 'business meeting', 'office'],
    dashboard: ['data visualization', 'charts', 'graphs', 'analytics', 'business intelligence'],
    auth: ['security', 'lock', 'authentication', 'privacy', 'trust'],
    calculator: ['mathematics', 'calculator', 'numbers', 'computation'],
    blog: ['writing', 'content', 'journalism', 'article', 'story'],
    portfolio: ['creative work', 'design', 'art', 'portfolio', 'showcase'],
    landing: ['product launch', 'startup', 'hero', 'innovation', 'technology'],
    social: ['community', 'people', 'social', 'connection', 'network'],
    music: ['music', 'spotify', 'playlist', 'artist', 'audio equipment'],
    news: ['journalism', 'news', 'breaking news', 'media', 'reporting'],
    banking: ['finance', 'money', 'payment', 'credit card', 'banking'],
    'real-estate': ['property', 'house', 'apartment', 'real estate', 'home interior'],
  }

  return terms[appType] || ['technology', 'interface', 'design']
}

function generateImageContextRules(appType: AppType): Record<string, string> {
  return {
    general:
      'All images must be contextually appropriate to the app type. No mismatched or irrelevant images.',
    hero: 'Must be high-quality, professional, 1200x400px minimum, compelling visual anchor',
    card: 'Consistent aspect ratio, 400x300px or 300x300px, readable when small',
    product: 'High-quality product photo, white/clean background, multiple angles if possible',
    avatar: 'Portrait-oriented, 100x100px minimum, clear face or identity',
  }
}

function gatherLibraryDependencies(
  appType: AppType | null,
  paths: string[],
  animations: string[]
): LibraryDependencies {
  const baseLibs: LibraryDependencies = {
    animation: [],
    ui: ['lucide-react'],
    utilities: ['clsx'],
    data: [],
    recommended: [],
  }

  if (!appType) {
    return baseLibs
  }

  const appTypeLibs = APP_TYPE_LIBRARIES[appType] || {}

  // Merge with base
  const merged: LibraryDependencies = {
    animation: [...baseLibs.animation, ...(appTypeLibs.animation || [])],
    ui: [...baseLibs.ui, ...(appTypeLibs.ui || [])],
    utilities: [...baseLibs.utilities, ...(appTypeLibs.utilities || [])],
    data: [...baseLibs.data, ...(appTypeLibs.data || [])],
    recommended: appTypeLibs.recommended || [],
  }

  // Always include next/image for image support
  if (!merged.ui.includes('next/image')) {
    merged.recommended.push('next/image (built-in)')
  }

  // Remove duplicates
  merged.animation = [...new Set(merged.animation)]
  merged.ui = [...new Set(merged.ui)]
  merged.utilities = [...new Set(merged.utilities)]
  merged.data = [...new Set(merged.data)]
  merged.recommended = [...new Set(merged.recommended)]

  return merged
}

function planDataModel(appType: AppType | null): DataModelPlan {
  const plans: Record<AppType, DataModelPlan> = {
    streaming: {
      entities: ['Movie', 'Series', 'Genre', 'User', 'WatchList'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 20,
      requiredFields: {
        Movie: ['id', 'title', 'description', 'posterUrl', 'rating', 'year'],
        Genre: ['id', 'name'],
      },
      errorStates: ['no-results', 'playback-error', 'network-error'],
      loadingStates: ['grid-skeleton', 'detail-skeleton'],
      emptyStates: ['no-favorites', 'no-watchlist'],
    },
    ecommerce: {
      entities: ['Product', 'Category', 'Cart', 'Order', 'Review'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 15,
      requiredFields: {
        Product: ['id', 'name', 'price', 'imageUrl', 'description', 'category'],
        Cart: ['items', 'total'],
      },
      errorStates: ['out-of-stock', 'payment-error', 'cart-error'],
      loadingStates: ['product-skeleton', 'cart-skeleton'],
      emptyStates: ['empty-cart', 'no-products'],
    },
    saas: {
      entities: ['User', 'Project', 'Task', 'Team', 'Settings'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 10,
      requiredFields: {
        Project: ['id', 'name', 'description', 'status'],
        Task: ['id', 'title', 'description', 'assignee', 'status'],
      },
      errorStates: ['load-error', 'save-error', 'auth-error'],
      loadingStates: ['project-skeleton', 'task-skeleton'],
      emptyStates: ['no-projects', 'no-tasks'],
    },
    dashboard: {
      entities: ['Metric', 'Chart', 'Report', 'Filter'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 8,
      requiredFields: {
        Metric: ['id', 'name', 'value', 'trend'],
        Chart: ['id', 'title', 'data', 'type'],
      },
      errorStates: ['data-error', 'load-error'],
      loadingStates: ['metric-skeleton', 'chart-skeleton'],
      emptyStates: ['no-data'],
    },
    auth: {
      entities: ['User', 'Session', 'Password'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 0,
      requiredFields: {
        User: ['email', 'password', 'displayName'],
      },
      errorStates: ['invalid-credentials', 'server-error', 'email-exists'],
      loadingStates: ['form-submitting'],
      emptyStates: [],
    },
    calculator: {
      entities: ['Operation', 'History'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 0,
      requiredFields: {},
      errorStates: ['math-error'],
      loadingStates: [],
      emptyStates: ['empty-history'],
    },
    blog: {
      entities: ['Article', 'Category', 'Tag', 'Comment'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 12,
      requiredFields: {
        Article: ['id', 'title', 'content', 'author', 'date', 'imageUrl'],
      },
      errorStates: ['load-error', 'not-found'],
      loadingStates: ['article-skeleton'],
      emptyStates: ['no-articles'],
    },
    portfolio: {
      entities: ['Project', 'Skill', 'Experience'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 8,
      requiredFields: {
        Project: ['id', 'title', 'description', 'imageUrl', 'link', 'tech'],
      },
      errorStates: [],
      loadingStates: ['project-skeleton'],
      emptyStates: ['no-projects'],
    },
    landing: {
      entities: ['Feature', 'Testimonial', 'Pricing'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 6,
      requiredFields: {
        Feature: ['id', 'title', 'description', 'icon'],
      },
      errorStates: [],
      loadingStates: [],
      emptyStates: [],
    },
    social: {
      entities: ['Post', 'User', 'Comment', 'Like', 'Follow'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 20,
      requiredFields: {
        Post: ['id', 'author', 'content', 'timestamp', 'likes'],
        User: ['id', 'name', 'avatar', 'followers'],
      },
      errorStates: ['load-error', 'post-error'],
      loadingStates: ['post-skeleton', 'user-skeleton'],
      emptyStates: ['no-posts', 'no-followers'],
    },
    music: {
      entities: ['Track', 'Playlist', 'Artist', 'Album'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 50,
      requiredFields: {
        Track: ['id', 'title', 'artist', 'album', 'duration', 'cover'],
      },
      errorStates: ['playback-error', 'load-error'],
      loadingStates: ['track-skeleton', 'playlist-skeleton'],
      emptyStates: ['no-playlists', 'empty-playlist'],
    },
    news: {
      entities: ['Article', 'Category', 'Author', 'Source'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 25,
      requiredFields: {
        Article: ['id', 'title', 'content', 'author', 'date', 'imageUrl', 'category'],
      },
      errorStates: ['load-error', 'not-found'],
      loadingStates: ['article-skeleton'],
      emptyStates: ['no-articles'],
    },
    banking: {
      entities: ['Account', 'Transaction', 'Card', 'Budget'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 10,
      requiredFields: {
        Account: ['id', 'name', 'balance', 'type'],
        Transaction: ['id', 'type', 'amount', 'date', 'description'],
      },
      errorStates: ['payment-error', 'load-error', 'auth-error'],
      loadingStates: ['account-skeleton', 'transaction-skeleton'],
      emptyStates: ['no-transactions'],
    },
    'real-estate': {
      entities: ['Property', 'Agent', 'Listing', 'Favorite'],
      mockDataLocation: 'lib/data.ts',
      minimumItems: 16,
      requiredFields: {
        Property: ['id', 'address', 'price', 'imageUrl', 'beds', 'baths', 'sqft'],
      },
      errorStates: ['load-error', 'not-found'],
      loadingStates: ['property-skeleton'],
      emptyStates: ['no-properties', 'no-favorites'],
    },
  }

  return plans[appType] || {
    entities: [],
    mockDataLocation: 'lib/data.ts',
    minimumItems: 5,
    requiredFields: {},
    errorStates: ['error'],
    loadingStates: ['loading'],
    emptyStates: ['empty'],
  }
}

function planDesignTokens(appType: AppType | null): DesignTokenPlan {
  return {
    spacingScale: '4px/8px grid (SPACING tokens from lib/design-system.ts)',
    typographyHierarchy: [
      'displayLg/displayMd for heroes',
      'headingLg/headingMd for sections',
      'bodyLg/bodyMd for content',
      'captionSm/captionXs for details',
    ],
    colorPalette: appType ? `Institutional palette for ${appType}` : 'Professional neutral with accent',
    componentPatterns: [
      'Cards with consistent spacing',
      'Buttons with hover/focus/active states',
      'Forms with proper validation',
      'Navigation with active indicators',
      'Error/loading/empty state components',
    ],
    animationLibrary: 'framer-motion for smooth transitions (prefers-reduced-motion aware)',
  }
}

function generateValidationRules(appType: AppType | null, paths: string[]): ValidationRule[] {
  return [
    {
      category: 'syntax',
      rule: 'All TypeScript/JSX must be syntactically valid',
      enforcementLevel: 'error',
    },
    {
      category: 'syntax',
      rule: 'No placeholder comments or TODO markers in final code',
      enforcementLevel: 'error',
    },
    {
      category: 'imports',
      rule: 'All imports must reference existing files or installed packages',
      enforcementLevel: 'error',
    },
    {
      category: 'components',
      rule: 'All components must be exported and properly typed',
      enforcementLevel: 'error',
    },
    {
      category: 'components',
      rule: 'Complex UI must use error boundaries for resilience',
      enforcementLevel: 'warning',
    },
    {
      category: 'images',
      rule: 'All images must use next/image with proper alt text',
      enforcementLevel: 'error',
    },
    {
      category: 'images',
      rule: 'Image URLs must be valid and contextually appropriate',
      enforcementLevel: 'error',
    },
    {
      category: 'completeness',
      rule: 'Multi-route apps must have working navigation',
      enforcementLevel: 'error',
    },
    {
      category: 'completeness',
      rule: 'Loading/empty/error states must be implemented',
      enforcementLevel: 'warning',
    },
    {
      category: 'accessibility',
      rule: 'Elements must respect prefers-reduced-motion',
      enforcementLevel: 'warning',
    },
  ]
}

function generateQualityCheckpoints(appType: AppType | null, routeCount: number): QualityCheckpoint[] {
  const checkpoints: QualityCheckpoint[] = [
    {
      phase: 'pre-generation',
      checkpoint: 'App type identified and blueprinted',
      blockers: ['Unknown app type should not block, but requires fallback'],
    },
    {
      phase: 'pre-generation',
      checkpoint: 'All required images planned and sourced',
      blockers: ['Image URLs cannot be broken or placeholders'],
    },
    {
      phase: 'during-generation',
      checkpoint: 'Code is generated with correct model selection',
      blockers: ['Wrong model selection for file type should alert'],
    },
    {
      phase: 'post-generation',
      checkpoint: 'All syntax is valid (TypeScript parser)',
      blockers: ['Syntax errors are blocking - must be fixed by LLM'],
    },
    {
      phase: 'post-generation',
      checkpoint: 'All imports resolve correctly',
      blockers: ['Unresolved imports are blocking'],
    },
    {
      phase: 'post-generation',
      checkpoint: 'No placeholder text or TODO comments',
      blockers: ['Placeholder text is blocking'],
    },
  ]

  if (routeCount > 1) {
    checkpoints.push({
      phase: 'post-generation',
      checkpoint: 'Navigation works between all routes',
      blockers: ['Broken navigation is blocking'],
    })
  }

  if (appType && appType !== 'calculator' && appType !== 'auth') {
    checkpoints.push({
      phase: 'post-generation',
      checkpoint: 'Loading and empty states are implemented',
      blockers: ['Missing error states are warnings, not blockers'],
    })
  }

  return checkpoints
}

function selectModelsForPaths(paths: string[], appType: AppType | null): { primary: string; fallback: string } {
  const hasUIFiles = paths.some(
    (p) =>
      p.endsWith('.tsx') &&
      (p.includes('components/') || p.includes('app/') || p.includes('/page.tsx'))
  )
  const hasBackendFiles = paths.some((p) => p.includes('lib/') && p.endsWith('.ts') && !p.includes('.tsx'))

  if (hasUIFiles && !hasBackendFiles) {
    return {
      primary: 'google/gemini-2.5-flash',
      fallback: 'openai/gpt-5-mini',
    }
  }

  if (hasBackendFiles && !hasUIFiles) {
    return {
      primary: 'openai/gpt-5.1-codex-max',
      fallback: 'openai/gpt-5',
    }
  }

  return {
    primary: 'google/gemini-2.5-flash',
    fallback: 'openai/gpt-5.1-codex-max',
  }
}
