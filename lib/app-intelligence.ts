/**
 * App Intelligence System
 * 
 * Analyzes user requests to identify app type, required features,
 * animations, and data models for institutional-grade generation.
 */

import type { StyleProfileId } from './style-profiles'
import { identifyStyleProfileId } from './style-profiles'

export type AppType =
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
 * Identifies app type from user request
 */
export function identifyAppType(userRequest: string): AppType | null {
  const request = userRequest.toLowerCase()

  const patterns: Record<AppType, string[]> = {
    streaming: ['netflix', 'movie', 'film', 'series', 'watch', 'video', 'stream', 'hulu', 'disney'],
    ecommerce: ['shop', 'store', 'product', 'cart', 'buy', 'sell', 'shopping', 'amazon', 'commerce', 'checkout'],
    saas: ['saas', 'app', 'software', 'tool', 'dashboard', 'analytics', 'management', 'workspace', 'collaboration'],
    dashboard: ['dashboard', 'analytics', 'chart', 'graph', 'report', 'metric', 'admin', 'panel'],
    auth: ['login', 'signin', 'signup', 'register', 'auth', 'authentication', 'password'],
    calculator: ['calculator', 'calculate', 'compute', 'math', 'formula', 'tool'],
    blog: ['blog', 'article', 'post', 'content', 'publish', 'writing', 'story'],
    portfolio: ['portfolio', 'showcase', 'work', 'project', 'designer', 'creator', 'artist'],
    landing: ['landing', 'hero', 'launch', 'marketing', 'product', 'feature', 'homepage'],
    social: ['social', 'community', 'chat', 'message', 'social network', 'forum', 'discussion'],
    music: ['music', 'spotify', 'playlist', 'song', 'artist', 'album', 'audio'],
    news: ['news', 'article', 'journalism', 'breaking', 'report', 'headline', 'media'],
    banking: ['bank', 'finance', 'payment', 'money', 'transaction', 'wallet', 'crypto'],
    'real-estate': ['property', 'house', 'apartment', 'real estate', 'listing', 'home'],
  }

  for (const [appType, keywords] of Object.entries(patterns)) {
    if (keywords.some(keyword => request.includes(keyword))) {
      return appType as AppType
    }
  }

  return null
}

/**
 * Determines required animations by app type
 */
export function getRequiredAnimations(appType: AppType): string[] {
  const animationsByType: Record<AppType, string[]> = {
    streaming: ['NetflixIntro', 'StaggeredGrid', 'CardHover', 'PageTransition'],
    ecommerce: ['StaggeredGrid', 'CardHover', 'ButtonPress', 'Toast'],
    saas: ['ButtonPress', 'InputFocus', 'TabSwitch', 'Modal', 'ScrollReveal'],
    dashboard: ['CardHover', 'ButtonPress', 'TabSwitch'],
    auth: ['ButtonPress', 'InputFocus'],
    calculator: ['ButtonPress'],
    blog: ['ScrollReveal', 'ImageZoom'],
    portfolio: ['ScrollReveal', 'CardHover', 'ImageZoom'],
    landing: ['ScrollReveal', 'TypedText', 'ButtonPress', 'CardHover'],
    social: ['StaggeredGrid', 'CardHover', 'Modal', 'Toast'],
    music: ['CardHover', 'ButtonPress', 'PlayButton'],
    news: ['ScrollReveal', 'CardHover'],
    banking: ['ButtonPress', 'InputFocus', 'Modal'],
    'real-estate': ['CardHover', 'ImageZoom', 'ScrollReveal'],
  }

  return animationsByType[appType] || []
}

/**
 * Determines if framer-motion is required
 */
export function requiresFramerMotion(appType: AppType): boolean {
  const motionRequired = [
    'streaming',
    'ecommerce',
    'saas',
    'dashboard',
    'blog',
    'portfolio',
    'landing',
    'social',
    'music',
    'news',
    'real-estate',
  ]
  return motionRequired.includes(appType)
}

/**
 * Determines minimum number of routes required
 */
export function getMinimumRoutes(appType: AppType): number {
  const routesByType: Record<AppType, number> = {
    streaming: 2, // home + details
    ecommerce: 3, // home + products + product details
    saas: 3, // home + dashboard + settings
    dashboard: 2, // home + details
    auth: 2, // login + dashboard (or signup + login)
    calculator: 1, // single functional page (exception)
    blog: 2, // home + post
    portfolio: 2, // home + project
    landing: 1, // single marketing page (exception)
    social: 2, // home + profile
    music: 2, // home + playlist
    news: 2, // home + article
    banking: 2, // home + transaction
    'real-estate': 2, // home + property
  }

  return routesByType[appType] || 2
}

/**
 * Suggests example routes for app type
 */
export function getSuggestedRoutes(appType: AppType): string[] {
  const routesByType: Record<AppType, string[]> = {
    streaming: ['/pages', '/pages/details/[id]'],
    ecommerce: ['/pages', '/pages/products', '/pages/product/[id]', '/pages/cart'],
    saas: ['/pages', '/pages/dashboard', '/pages/settings'],
    dashboard: ['/pages', '/pages/details/[id]'],
    auth: ['/pages/login', '/pages/dashboard'],
    calculator: ['/pages'],
    blog: ['/pages', '/pages/post/[id]'],
    portfolio: ['/pages', '/pages/project/[id]'],
    landing: ['/pages'],
    social: ['/pages', '/pages/profile/[id]'],
    music: ['/pages', '/pages/playlist/[id]'],
    news: ['/pages', '/pages/article/[id]'],
    banking: ['/pages', '/pages/transactions'],
    'real-estate': ['/pages', '/pages/property/[id]'],
  }

  return routesByType[appType] || ['/pages']
}

/**
 * Determines primary data entity for app type
 */
export function getPrimaryDataEntity(appType: AppType): string {
  const entityMap: Record<AppType, string> = {
    streaming: 'Movie',
    ecommerce: 'Product',
    saas: 'Workspace',
    dashboard: 'Metric',
    auth: 'User',
    calculator: 'Calculation',
    blog: 'Post',
    portfolio: 'Project',
    landing: 'Feature',
    social: 'Post',
    music: 'Track',
    news: 'Article',
    banking: 'Transaction',
    'real-estate': 'Property',
  }

  return entityMap[appType]
}

/**
 * Suggests image contexts needed for app type
 */
export function getSuggestedImageContexts(appType: AppType): Array<'hero' | 'thumbnail' | 'card' | 'background' | 'accent'> {
  const contextsByType: Record<
    AppType,
    Array<'hero' | 'thumbnail' | 'card' | 'background' | 'accent'>
  > = {
    streaming: ['hero', 'thumbnail', 'card', 'background'],
    ecommerce: ['hero', 'thumbnail', 'card', 'background'],
    saas: ['hero', 'card', 'background'],
    dashboard: ['card', 'accent', 'background'],
    auth: ['hero', 'background'],
    calculator: ['background', 'accent'],
    blog: ['hero', 'card', 'background'],
    portfolio: ['hero', 'thumbnail', 'card', 'accent'],
    landing: ['hero', 'card', 'background', 'accent'],
    social: ['card', 'thumbnail', 'background'],
    music: ['card', 'thumbnail', 'hero'],
    news: ['card', 'hero', 'background'],
    banking: ['hero', 'background', 'accent'],
    'real-estate': ['hero', 'thumbnail', 'card', 'background'],
  }

  return contextsByType[appType] || ['hero', 'card']
}

/**
 * Analyzes user request and returns comprehensive blueprint
 */
export function analyzeAppRequest(userRequest: string): {
  appType: AppType | null
  styleProfile: StyleProfileId
  requiredAnimations: string[]
  needsFramerMotion: boolean
  minimumRoutes: number
  suggestedRoutes: string[]
  primaryEntity: string
  imageContexts: Array<'hero' | 'thumbnail' | 'card' | 'background' | 'accent'>
  isException: boolean // calculator, landing (can be single page)
} {
  const appType = identifyAppType(userRequest)
  const styleProfile = identifyStyleProfileId(userRequest)

  if (!appType) {
    return {
      appType: null,
      styleProfile,
      requiredAnimations: [],
      needsFramerMotion: false,
      minimumRoutes: 2,
      suggestedRoutes: ['/pages'],
      primaryEntity: 'Item',
      imageContexts: ['hero', 'card'],
      isException: false,
    }
  }

  const isException = appType === 'calculator' || appType === 'landing'

  return {
    appType,
    styleProfile,
    requiredAnimations: getRequiredAnimations(appType),
    needsFramerMotion: requiresFramerMotion(appType),
    minimumRoutes: getMinimumRoutes(appType),
    suggestedRoutes: getSuggestedRoutes(appType),
    primaryEntity: getPrimaryDataEntity(appType),
    imageContexts: getSuggestedImageContexts(appType),
    isException,
  }
}

/**
 * Validation helper: Check if analysis is complete
 */
export function validateBlueprintCompleteness(blueprint: {
  appType: AppType | null
  images: Array<{ context: string; url: string; alt: string }>
  animations: string[]
  routes: string[]
  libraries: string[]
  dataModel: unknown
}): { isComplete: boolean; missing: string[] } {
  const missing: string[] = []

  if (!blueprint.appType) missing.push('appType')
  if (!blueprint.images || blueprint.images.length === 0) missing.push('images')
  if (!blueprint.animations || blueprint.animations.length === 0) missing.push('animations')
  if (!blueprint.routes || blueprint.routes.length < 2) missing.push('routes (minimum 2)')
  if (!blueprint.libraries || blueprint.libraries.length === 0) missing.push('libraries')
  if (!blueprint.dataModel) missing.push('dataModel')

  return {
    isComplete: missing.length === 0,
    missing,
  }
}
