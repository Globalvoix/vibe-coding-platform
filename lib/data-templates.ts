/**
 * Data Templates
 *
 * Provides realistic mock data scaffolds per app type so generated UIs always have
 * complete datasets, loading placeholders, and stateful fallbacks.
 */

import type { AppType } from './app-intelligence'
import { generateImageUrl, generateAltText } from './image-helper'

export interface DataRecord {
  id: string
  [key: string]: string | number | boolean | string[]
}

export interface DataTemplate {
  entity: string
  description: string
  fields: Record<string, string>
  sample: DataRecord
  loadingState: Record<string, unknown>
  emptyState: {
    title: string
    description: string
    actionLabel?: string
  }
  errorState: {
    title: string
    description: string
  }
}

function createStreamingTemplate(): DataTemplate {
  return {
    entity: 'Movie',
    description: 'High fidelity movie metadata inspired by Netflix + Prime Video.',
    fields: {
      title: 'string',
      synopsis: 'string (≤ 180 chars)',
      genre: 'string[]',
      rating: 'number (0-10)',
      runtime: 'number (minutes)',
      poster: 'image url',
      posterAlt: 'string',
    },
    sample: {
      id: 'movie-crimson-skyline',
      title: 'Crimson Skyline',
      synopsis: 'A rogue pilot discovers a hidden city above the clouds and must choose between freedom and the fate of those below.',
      genre: ['Sci-Fi', 'Thriller'],
      rating: 8.6,
      runtime: 124,
      poster: generateImageUrl('streaming', 'card'),
      posterAlt: generateAltText('streaming', 'card'),
    },
    loadingState: {
      variant: 'skeleton-row',
      shimmer: true,
      cards: 6,
    },
    emptyState: {
      title: 'Nothing queued up',
      description: 'Add titles to your list to see personalized recommendations here.',
      actionLabel: 'Browse Titles',
    },
    errorState: {
      title: 'We cannot load titles',
      description: 'Check your connection or try refreshing the experience.',
    },
  }
}

function createEcommerceTemplate(): DataTemplate {
  return {
    entity: 'Product',
    description: 'Neon-grade catalog entry with merchandising metadata.',
    fields: {
      name: 'string',
      price: 'number',
      badge: 'string',
      rating: 'number',
      image: 'image url',
      imageAlt: 'string',
    },
    sample: {
      id: 'product-spectrum-orbit',
      name: 'Spectrum Orbit Lamp',
      price: 249,
      badge: 'New Drop',
      rating: 4.9,
      image: generateImageUrl('ecommerce', 'card'),
      imageAlt: generateAltText('ecommerce', 'card'),
    },
    loadingState: { variant: 'grid-skeleton', items: 8 },
    emptyState: {
      title: 'No products match the current filter',
      description: 'Try removing filters or explore the curated collections.',
      actionLabel: 'Reset filters',
    },
    errorState: {
      title: 'The storefront is offline',
      description: 'We hit turbulence while loading products. Please retry.',
    },
  }
}

function createSaasTemplate(): DataTemplate {
  return {
    entity: 'WorkspaceMetric',
    description: 'Supabase/Stripe inspired workspace metric set.',
    fields: {
      label: 'string',
      value: 'string | number',
      trend: 'number (delta)',
      sparkline: 'number[]',
    },
    sample: {
      id: 'metric-qps',
      label: 'Realtime Throughput',
      value: '3.1k ops/s',
      trend: 12.4,
      sparkline: [2.1, 2.4, 2.9, 3.4, 3.1, 3.6, 3.9],
    },
    loadingState: { variant: 'card-skeleton', cards: 4 },
    emptyState: {
      title: 'Connect a project to start tracking metrics',
      description: 'Once data flows in, live insights will appear here.',
      actionLabel: 'Connect project',
    },
    errorState: {
      title: 'Metrics are temporarily unavailable',
      description: 'We could not talk to the data plane. Try again in a moment.',
    },
  }
}

const templateMap: Record<AppType, () => DataTemplate[]> = {
  streaming: () => [createStreamingTemplate()],
  ecommerce: () => [createEcommerceTemplate()],
  saas: () => [createSaasTemplate()],
  dashboard: () => [createSaasTemplate()],
  auth: () => [createSaasTemplate()],
  calculator: () => [createSaasTemplate()],
  blog: () => [createSaasTemplate()],
  portfolio: () => [createSaasTemplate()],
  landing: () => [createSaasTemplate()],
  social: () => [createStreamingTemplate()],
  music: () => [createStreamingTemplate()],
  news: () => [createStreamingTemplate()],
  banking: () => [createSaasTemplate()],
  'real-estate': () => [createEcommerceTemplate()],
}

export function getDataTemplates(appType: AppType): DataTemplate[] {
  const factory = templateMap[appType]
  return factory ? factory() : [createSaasTemplate()]
}

export function createMockData(appType: AppType, count = 12): DataRecord[] {
  const templates = getDataTemplates(appType)
  const primary = templates[0]

  if (!primary) return []

  if (primary.entity === 'Movie') {
    return Array.from({ length: count }, (_, index) => ({
      ...primary.sample,
      id: `${primary.sample.id}-${index + 1}`,
      title: `${primary.sample.title} ${index + 1}`,
      poster: generateImageUrl('streaming', 'card'),
      posterAlt: generateAltText('streaming', 'card'),
    }))
  }

  if (primary.entity === 'Product') {
    return Array.from({ length: count }, (_, index) => ({
      ...primary.sample,
      id: `${primary.sample.id}-${index + 1}`,
      name: `${primary.sample.name} ${index + 1}`,
      image: generateImageUrl('ecommerce', 'card'),
      imageAlt: generateAltText('ecommerce', 'card'),
    }))
  }

  return Array.from({ length: count }, (_, index) => ({
    ...primary.sample,
    id: `${primary.sample.id}-${index + 1}`,
  }))
}
