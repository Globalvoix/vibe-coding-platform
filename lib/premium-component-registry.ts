/**
 * Premium Component Registry
 *
 * Curated blueprints inspired by enterprise products (Neon, Hulu, Amazon, Netflix, Supabase, Stripe).
 * Generators can use these recipes to assemble multi-section experiences with consistent
 * layouts, motion tiers, and data requirements.
 */

import type { AppType } from './app-intelligence'

export type DensityLevel = 'airy' | 'balanced' | 'data-dense'

export interface PremiumComponentBlueprint {
  id: string
  name: string
  description: string
  layout: {
    columns: number
    gapToken: string
    alignment: 'start' | 'center' | 'stretch'
  }
  requiredSections: string[]
  recommendedAnimations: string[]
  motionTier: 'signature' | 'supporting' | 'micro'
  dataNeeds: string[]
  notes: string[]
}

const streamingComponents: PremiumComponentBlueprint[] = [
  {
    id: 'streaming.hero.premium',
    name: 'Cinematic Hero Stack',
    description:
      'Fullscreen gradient hero with Netflix-style intro animation, layered typography, and CTA cluster.',
    layout: { columns: 12, gapToken: 'SPACING.6', alignment: 'center' },
    requiredSections: ['Hero narrative', 'CTA primary + secondary', 'Device mockup or still'],
    recommendedAnimations: ['NetflixIntro', 'ScrollReveal', 'ButtonPress'],
    motionTier: 'signature',
    dataNeeds: ['featuredTitle', 'tagline', 'ctaPrimary', 'ctaSecondary', 'heroImage'],
    notes: ['Use dark-to-vibrant gradient', 'Typed subtitle or pulsing badge', 'Priority image loading'],
  },
  {
    id: 'streaming.carousel.continueWatching',
    name: 'Continue Watching Rail',
    description: 'Horizontal rail with progress meters and hover-lift cards reminiscent of Hulu/Netflix rows.',
    layout: { columns: 1, gapToken: 'SPACING.4', alignment: 'start' },
    requiredSections: ['Rail heading + filter pills', 'Card grid (min 12 items)'],
    recommendedAnimations: ['StaggeredGrid', 'CardHover'],
    motionTier: 'supporting',
    dataNeeds: ['items[].title', 'items[].progress', 'items[].runtime', 'items[].image'],
    notes: ['Show progress bars', 'Include hover actions (Play, Details)'],
  },
  {
    id: 'streaming.details.panel',
    name: 'Immersive Details Panel',
    description: 'Split layout combining poster, synopsis, cast chips, and gradient background similar to Prime Video.',
    layout: { columns: 12, gapToken: 'SPACING.5', alignment: 'stretch' },
    requiredSections: ['Poster column', 'Meta grid', 'Cast chips', 'Action buttons'],
    recommendedAnimations: ['PageTransition', 'CardHover'],
    motionTier: 'supporting',
    dataNeeds: ['poster', 'synopsis', 'cast[]', 'genres[]', 'duration', 'rating'],
    notes: ['Use frosted glass overlay', 'Include skeleton state'],
  },
]

const ecommerceComponents: PremiumComponentBlueprint[] = [
  {
    id: 'ecommerce.hero.neon',
    name: 'Neon Storefront Hero',
    description: 'Gradient swarm hero with product spotlights inspired by neon.com.',
    layout: { columns: 12, gapToken: 'SPACING.6', alignment: 'center' },
    requiredSections: ['Hero copy', 'Product peek grid', 'Trust badges'],
    recommendedAnimations: ['ScrollReveal', 'ImageZoom', 'ButtonPress'],
    motionTier: 'signature',
    dataNeeds: ['headline', 'subheadline', 'primaryProduct', 'cta', 'stats'],
    notes: ['Use radial glow backgrounds', 'Badge micro-interactions'],
  },
  {
    id: 'ecommerce.grid.premium',
    name: 'Premium Product Grid',
    description: 'Responsive 3/4-column grid with staggered animations and filter tabs.',
    layout: { columns: 12, gapToken: 'SPACING.5', alignment: 'stretch' },
    requiredSections: ['Category tabs', 'Filter chips', 'Product cards (≥12)'],
    recommendedAnimations: ['StaggeredGrid', 'CardHover', 'ButtonPress'],
    motionTier: 'supporting',
    dataNeeds: ['products[].name', 'price', 'rating', 'image', 'badge'],
    notes: ['Include price + quick add', 'Skeleton + empty state'],
  },
]

const saasComponents: PremiumComponentBlueprint[] = [
  {
    id: 'saas.hero.linear',
    name: 'Linear-style Command Hero',
    description: 'Two-column hero with floating UI panels, command bar, and typewriter subcopy.',
    layout: { columns: 12, gapToken: 'SPACING.6', alignment: 'center' },
    requiredSections: ['Hero text stack', 'Floating panel collage', 'CTA cluster', 'Customer logos'],
    recommendedAnimations: ['TypedText', 'ScrollReveal', 'ButtonPress'],
    motionTier: 'signature',
    dataNeeds: ['headline', 'subheadline', 'primaryCTA', 'secondaryCTA', 'panels[]'],
    notes: ['Use subtle glassmorphism', 'Add metrics chips'],
  },
  {
    id: 'saas.dashboard.preview',
    name: 'Supabase-style Dashboard Preview',
    description: 'High-density panel showcasing charts, key metrics, and quick actions.',
    layout: { columns: 12, gapToken: 'SPACING.4', alignment: 'stretch' },
    requiredSections: ['Metric cards', 'Chart area', 'Activity stream'],
    recommendedAnimations: ['CardHover', 'TabSwitch', 'ButtonPress'],
    motionTier: 'supporting',
    dataNeeds: ['metrics[]', 'chartSeries[]', 'activity[]'],
    notes: ['Include dark + light toggle', 'Use subtle gradient borders'],
  },
]

const DEFAULT_COMPONENTS: PremiumComponentBlueprint[] = [
  {
    id: 'shared.navbar',
    name: 'Enterprise Navbar',
    description: 'Sticky navigation with logo, mega-menu trigger, and action buttons.',
    layout: { columns: 12, gapToken: 'SPACING.4', alignment: 'center' },
    requiredSections: ['Logo', 'Primary nav links', 'Utility icons', 'Action button'],
    recommendedAnimations: ['StickyHeader', 'ButtonPress'],
    motionTier: 'micro',
    dataNeeds: ['links[]', 'actions[]'],
    notes: ['Add glass blur + border', 'Icon-only buttons need aria-label'],
  },
]

const componentRegistry: Record<AppType, PremiumComponentBlueprint[]> = {
  streaming: streamingComponents,
  ecommerce: ecommerceComponents,
  saas: saasComponents,
  dashboard: [...saasComponents],
  auth: DEFAULT_COMPONENTS,
  calculator: DEFAULT_COMPONENTS,
  blog: DEFAULT_COMPONENTS,
  portfolio: DEFAULT_COMPONENTS,
  landing: DEFAULT_COMPONENTS,
  social: DEFAULT_COMPONENTS,
  music: streamingComponents,
  news: DEFAULT_COMPONENTS,
  banking: DEFAULT_COMPONENTS,
  'real-estate': DEFAULT_COMPONENTS,
}

export function getPremiumComponents(appType: AppType): PremiumComponentBlueprint[] {
  return componentRegistry[appType] || DEFAULT_COMPONENTS
}

export function selectComponentStack(
  appType: AppType,
  density: DensityLevel = 'balanced'
): PremiumComponentBlueprint[] {
  const components = getPremiumComponents(appType)

  if (density === 'airy') {
    return components.filter((component) => component.motionTier !== 'data-dense')
  }

  if (density === 'data-dense') {
    return components.filter((component) => component.layout.columns >= 12)
  }

  return components
}
