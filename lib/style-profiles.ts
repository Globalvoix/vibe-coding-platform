/**
 * Style Profiles
 *
 * High-level, reusable style "vibes" inspired by top-tier products.
 * These do not copy assets; they encode compositional rules: density, contrast,
 * radii, shadows, gradients, and motion intensity.
 */

export type StyleProfileId =
  | 'neon_saas'
  | 'huly_saas'
  | 'stripe_saas'
  | 'netflix_streaming'
  | 'amazon_ecommerce'
  | 'google_search'
  | 'spotify_music'

export type SurfaceTreatment = 'flat' | 'glass' | 'elevated'
export type ContrastMode = 'light' | 'dark' | 'adaptive'

export interface StyleProfile {
  id: StyleProfileId
  name: string
  description: string
  contrast: ContrastMode
  density: 'airy' | 'balanced' | 'data-dense'
  surface: SurfaceTreatment
  layout: {
    maxWidth: number
    columns: 12
    gutterPx: 16 | 24 | 32
    heroMinHeightVh: 60 | 70 | 80
  }
  typography: {
    headlineTracking: '-0.02em' | '-0.01em' | '0'
    headlineWeight: 650 | 700
    bodyLineHeight: 1.5 | 1.6
  }
  shape: {
    radiusSm: 8 | 10 | 12
    radiusMd: 12 | 14 | 16
    radiusLg: 16 | 20 | 24
    borderWidthPx: 1 | 2
  }
  color: {
    primaryHue: 'cyan' | 'red' | 'green' | 'blue'
    accentStrategy: 'glow' | 'solid' | 'minimal'
    gradientStyle: 'radial' | 'linear' | 'none'
  }
  motion: {
    tier: 'minimal' | 'standard' | 'cinematic'
    prefersReducedMotionFallback: 'disable' | 'reduce'
  }
  compositionRules: string[]
}

export const STYLE_PROFILES: Record<StyleProfileId, StyleProfile> = {
  neon_saas: {
    id: 'neon_saas',
    name: 'Neon-grade SaaS',
    description: 'Dark, crisp, glow accents, glass borders, roomy layout with high contrast.',
    contrast: 'dark',
    density: 'balanced',
    surface: 'glass',
    layout: { maxWidth: 1120, columns: 12, gutterPx: 24, heroMinHeightVh: 70 },
    typography: { headlineTracking: '-0.02em', headlineWeight: 700, bodyLineHeight: 1.6 },
    shape: { radiusSm: 10, radiusMd: 14, radiusLg: 20, borderWidthPx: 1 },
    color: { primaryHue: 'cyan', accentStrategy: 'glow', gradientStyle: 'radial' },
    motion: { tier: 'standard', prefersReducedMotionFallback: 'reduce' },
    compositionRules: [
      'Use 1 primary glow hue + 1 neutral; avoid rainbow gradients.',
      'Prefer large hero headline, short subcopy, and 1-2 CTAs.',
      'Use glass panels with subtle borders; avoid heavy drop shadows.',
      'Keep spacing rhythmic (4/8 grid) and align to a 12-col container.',
    ],
  },
  huly_saas: {
    id: 'huly_saas',
    name: 'Huly-like Product SaaS',
    description: 'Minimal, playful precision, generous whitespace, subtle motion cues.',
    contrast: 'light',
    density: 'airy',
    surface: 'flat',
    layout: { maxWidth: 1200, columns: 12, gutterPx: 32, heroMinHeightVh: 70 },
    typography: { headlineTracking: '-0.01em', headlineWeight: 700, bodyLineHeight: 1.6 },
    shape: { radiusSm: 12, radiusMd: 16, radiusLg: 24, borderWidthPx: 1 },
    color: { primaryHue: 'blue', accentStrategy: 'minimal', gradientStyle: 'none' },
    motion: { tier: 'standard', prefersReducedMotionFallback: 'reduce' },
    compositionRules: [
      'Use whitespace as structure: section spacing must feel intentional.',
      'Use subtle hover states and small motion on entry; avoid constant animation.',
      'Keep iconography simple and consistent; avoid mixed styles.',
      'Prioritize legibility and hierarchy over decorative effects.',
    ],
  },
  stripe_saas: {
    id: 'stripe_saas',
    name: 'Stripe-like SaaS',
    description: 'Clean, utilitarian, high information clarity, restrained color accents.',
    contrast: 'adaptive',
    density: 'balanced',
    surface: 'elevated',
    layout: { maxWidth: 1100, columns: 12, gutterPx: 24, heroMinHeightVh: 60 },
    typography: { headlineTracking: '-0.02em', headlineWeight: 650, bodyLineHeight: 1.6 },
    shape: { radiusSm: 8, radiusMd: 12, radiusLg: 16, borderWidthPx: 1 },
    color: { primaryHue: 'blue', accentStrategy: 'solid', gradientStyle: 'linear' },
    motion: { tier: 'minimal', prefersReducedMotionFallback: 'reduce' },
    compositionRules: [
      'Favor clarity: concise labels, consistent spacing, predictable components.',
      'Use elevation for grouping, not decoration.',
      'Keep CTAs obvious and aligned; avoid surprise placements.',
      'Use subtle gradients and dividers; maintain strong contrast.',
    ],
  },
  netflix_streaming: {
    id: 'netflix_streaming',
    name: 'Netflix-grade Streaming',
    description: 'Dark cinematic surfaces, bold title cards, hover rails, strong hero contrast.',
    contrast: 'dark',
    density: 'data-dense',
    surface: 'flat',
    layout: { maxWidth: 1320, columns: 12, gutterPx: 24, heroMinHeightVh: 80 },
    typography: { headlineTracking: '-0.02em', headlineWeight: 700, bodyLineHeight: 1.5 },
    shape: { radiusSm: 10, radiusMd: 12, radiusLg: 16, borderWidthPx: 1 },
    color: { primaryHue: 'red', accentStrategy: 'solid', gradientStyle: 'linear' },
    motion: { tier: 'cinematic', prefersReducedMotionFallback: 'reduce' },
    compositionRules: [
      'Use rails: horizontal carousels with consistent card aspect ratios.',
      'Hero must have readable overlay gradient + crisp CTA cluster.',
      'Hover reveals controls; default to minimal chrome.',
      'Use cinematic transitions sparingly; keep scrolling smooth.',
    ],
  },
  amazon_ecommerce: {
    id: 'amazon_ecommerce',
    name: 'Amazon-grade E-commerce',
    description: 'Utility-first density, strong merchandising hierarchy, predictable navigation.',
    contrast: 'light',
    density: 'data-dense',
    surface: 'elevated',
    layout: { maxWidth: 1200, columns: 12, gutterPx: 16, heroMinHeightVh: 60 },
    typography: { headlineTracking: '0', headlineWeight: 700, bodyLineHeight: 1.5 },
    shape: { radiusSm: 8, radiusMd: 12, radiusLg: 16, borderWidthPx: 1 },
    color: { primaryHue: 'blue', accentStrategy: 'solid', gradientStyle: 'none' },
    motion: { tier: 'minimal', prefersReducedMotionFallback: 'reduce' },
    compositionRules: [
      'Navigation must be obvious; include search as primary surface.',
      'Use clear price, rating, badge patterns; reduce decorative motion.',
      'Grid alignment is paramount; avoid irregular card sizes.',
      'Always include empty/error states for cart and product lists.',
    ],
  },
  google_search: {
    id: 'google_search',
    name: 'Google-like Search',
    description: 'Extremely minimal, centered primary action, crisp type and whitespace.',
    contrast: 'light',
    density: 'airy',
    surface: 'flat',
    layout: { maxWidth: 960, columns: 12, gutterPx: 24, heroMinHeightVh: 70 },
    typography: { headlineTracking: '0', headlineWeight: 700, bodyLineHeight: 1.6 },
    shape: { radiusSm: 12, radiusMd: 16, radiusLg: 24, borderWidthPx: 1 },
    color: { primaryHue: 'blue', accentStrategy: 'minimal', gradientStyle: 'none' },
    motion: { tier: 'minimal', prefersReducedMotionFallback: 'disable' },
    compositionRules: [
      'One primary action per screen; remove competing elements.',
      'Use whitespace and alignment for polish; avoid decorative textures.',
      'Focus states must be excellent; keyboard navigation seamless.',
      'Keep components low-contrast but readable with clear borders.',
    ],
  },
  spotify_music: {
    id: 'spotify_music',
    name: 'Spotify-grade Music',
    description: 'Dark surfaces, strong artwork, punchy accent, interactive playback controls.',
    contrast: 'dark',
    density: 'balanced',
    surface: 'flat',
    layout: { maxWidth: 1280, columns: 12, gutterPx: 24, heroMinHeightVh: 70 },
    typography: { headlineTracking: '-0.02em', headlineWeight: 700, bodyLineHeight: 1.5 },
    shape: { radiusSm: 10, radiusMd: 14, radiusLg: 20, borderWidthPx: 1 },
    color: { primaryHue: 'green', accentStrategy: 'solid', gradientStyle: 'linear' },
    motion: { tier: 'standard', prefersReducedMotionFallback: 'reduce' },
    compositionRules: [
      'Artwork must be real and consistent; keep aspect ratios stable.',
      'Playback controls need tactile states (hover/press/loading).',
      'Use subtle gradients for depth; avoid heavy shadows.',
      'Navigation left rail + main content layout feels premium.',
    ],
  },
}

export function identifyStyleProfileId(userRequest: string): StyleProfileId {
  const text = userRequest.toLowerCase()

  if (text.includes('neon')) return 'neon_saas'
  if (text.includes('huly')) return 'huly_saas'
  if (text.includes('stripe')) return 'stripe_saas'
  if (text.includes('netflix') || text.includes('prime video') || text.includes('stream')) return 'netflix_streaming'
  if (text.includes('amazon') || text.includes('checkout') || text.includes('cart')) return 'amazon_ecommerce'
  if (text.includes('google') || text.includes('search')) return 'google_search'
  if (text.includes('spotify') || text.includes('music')) return 'spotify_music'

  // Sensible default: premium SaaS
  return 'stripe_saas'
}

export function getStyleProfile(profileId: StyleProfileId): StyleProfile {
  return STYLE_PROFILES[profileId]
}
