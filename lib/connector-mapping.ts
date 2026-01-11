/**
 * Connector Mapping System
 * Maps connectors to their capabilities and use cases
 * Enables AI to intelligently detect and suggest appropriate connectors
 */

export type ConnectorId =
  | 'openai'
  | 'google-gemini'
  | 'deepseek'
  | 'together-ai'
  | 'perplexity'
  | 'firecrawl'
  | 'exa'
  | 'eleven-labs'

export interface ConnectorCapability {
  category: string
  description: string
  examples: string[]
}

export interface ConnectorDefinition {
  id: ConnectorId
  name: string
  displayName: string
  description: string
  envVarKey: string
  envVarAliases?: string[]
  apiKeyPlaceholder: string
  docsUrl?: string
  capabilities: ConnectorCapability[]
  category: 'ai-model' | 'specialized-api' | 'tool'
  priority: number // Higher = more likely to suggest
}

export const CONNECTOR_DEFINITIONS: Record<ConnectorId, ConnectorDefinition> = {
  'openai': {
    id: 'openai',
    name: 'OpenAI',
    displayName: 'OpenAI',
    description: 'GPT-4o, o1-preview, and other advanced language models',
    envVarKey: 'OPENAI_API_KEY',
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    capabilities: [
      {
        category: 'Core LLM',
        description: 'Primary language model for AI logic, content generation, and code creation',
        examples: ['Chat completions', 'Code generation', 'Text content creation', 'Reasoning tasks']
      },
      {
        category: 'Embeddings',
        description: 'Convert text to vector embeddings for semantic search',
        examples: ['Vector embeddings', 'Similarity search', 'Semantic comparison']
      },
      {
        category: 'Advanced Features',
        description: 'Specialized capabilities for complex tasks',
        examples: ['Multimodal (vision)', 'Extended thinking', 'Function calling']
      }
    ],
    category: 'ai-model',
    priority: 100
  },
  'google-gemini': {
    id: 'google-gemini',
    name: 'Google Gemini',
    displayName: 'Google Gemini',
    description: 'Gemini 1.5 Pro, Ultra, and Flash models from Google',
    envVarKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    envVarAliases: ['GOOGLE_GEMINI_API_KEY'],
    apiKeyPlaceholder: 'AIza...',
    docsUrl: 'https://ai.google.dev/api',
    capabilities: [
      {
        category: 'Core LLM',
        description: 'Fast and efficient language model for general-purpose tasks',
        examples: ['Text generation', 'Code completion', 'Question answering', 'Summarization']
      },
      {
        category: 'Multimodal Processing',
        description: 'Handle images, videos, and documents in addition to text',
        examples: ['Image analysis', 'Document understanding', 'Video understanding']
      },
      {
        category: 'Long Context',
        description: 'Process very large documents and extended conversations',
        examples: ['Large document analysis', 'Extended conversations', 'Code base analysis']
      }
    ],
    category: 'ai-model',
    priority: 95
  },
  'deepseek': {
    id: 'deepseek',
    name: 'Deepseek',
    displayName: 'Deepseek',
    description: 'High-performance open-source language models',
    envVarKey: 'DEEPSEEK_API_KEY',
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://api-docs.deepseek.com',
    capabilities: [
      {
        category: 'Core LLM',
        description: 'Efficient open-source models for code and general tasks',
        examples: ['Code generation', 'Problem solving', 'Technical writing']
      },
      {
        category: 'Cost Efficiency',
        description: 'Lower cost alternative for high-volume applications',
        examples: ['Bulk processing', 'Economic API usage', 'High-throughput tasks']
      }
    ],
    category: 'ai-model',
    priority: 80
  },
  'together-ai': {
    id: 'together-ai',
    name: 'Together AI',
    displayName: 'Together AI',
    description: 'Fast inference engine for Llama and other open models',
    envVarKey: 'TOGETHER_API_KEY',
    envVarAliases: ['TOGETHER_AI_API_KEY'],
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://www.together.ai/docs',
    capabilities: [
      {
        category: 'Fast Inference',
        description: 'Ultra-low latency responses for real-time applications',
        examples: ['Streaming responses', 'Low-latency chat', 'High-frequency requests']
      },
      {
        category: 'Open Models',
        description: 'Access to Llama, Mistral, and other open-source models',
        examples: ['Llama 2/3', 'Mistral', 'Code Llama']
      }
    ],
    category: 'ai-model',
    priority: 85
  },
  'perplexity': {
    id: 'perplexity',
    name: 'Perplexity',
    displayName: 'Perplexity',
    description: 'AI-powered search with real-time web data',
    envVarKey: 'PERPLEXITY_API_KEY',
    apiKeyPlaceholder: 'pplx-...',
    docsUrl: 'https://docs.perplexity.ai',
    capabilities: [
      {
        category: 'Real-Time Search',
        description: 'Search the web and provide current information',
        examples: ['Current events', 'Real-time data', 'Latest news', 'Live information']
      },
      {
        category: 'Research',
        description: 'Deep research and fact-checking with citations',
        examples: ['Source verification', 'Fact checking', 'Research assistance', 'Information gathering']
      }
    ],
    category: 'specialized-api',
    priority: 70
  },
  'firecrawl': {
    id: 'firecrawl',
    name: 'Firecrawl',
    displayName: 'Firecrawl',
    description: 'Convert any website into LLM-ready structured data',
    envVarKey: 'FIRECRAWL_API_KEY',
    apiKeyPlaceholder: 'fc_...',
    docsUrl: 'https://docs.firecrawl.dev',
    capabilities: [
      {
        category: 'Web Scraping',
        description: 'Extract content from websites and convert to structured formats',
        examples: ['HTML to Markdown', 'Content extraction', 'Data scraping', 'Website crawling']
      },
      {
        category: 'Data Extraction',
        description: 'Parse complex web pages into usable data formats',
        examples: ['Table extraction', 'Article parsing', 'Price monitoring', 'Content indexing']
      },
      {
        category: 'LLM Preparation',
        description: 'Format web content for AI processing',
        examples: ['Document parsing', 'Content preparation', 'Information retrieval']
      }
    ],
    category: 'specialized-api',
    priority: 65
  },
  'eleven-labs': {
    id: 'eleven-labs',
    name: 'Eleven Labs',
    displayName: 'Eleven Labs',
    description: 'Leading AI text-to-speech with natural-sounding voices',
    envVarKey: 'ELEVEN_LABS_API_KEY',
    envVarAliases: ['ELEVENLABS_API_KEY'],
    apiKeyPlaceholder: 'sk_...',
    docsUrl: 'https://docs.elevenlabs.io',
    capabilities: [
      {
        category: 'Text-to-Speech',
        description: 'Convert text to natural-sounding speech',
        examples: ['Voice generation', 'Audio content', 'Narration', 'Voice synthesis']
      },
      {
        category: 'Voice Cloning',
        description: 'Create custom voices from speaker samples',
        examples: ['Custom voices', 'Brand voice', 'Personalized audio']
      },
      {
        category: 'Voice Design',
        description: 'Fine-tune voice characteristics and emotions',
        examples: ['Voice stability', 'Speaker boost', 'Emotion control']
      }
    ],
    category: 'specialized-api',
    priority: 60
  }
}

export const CONNECTORS_BY_CATEGORY = {
  'ai-model': Object.values(CONNECTOR_DEFINITIONS).filter(c => c.category === 'ai-model'),
  'specialized-api': Object.values(CONNECTOR_DEFINITIONS).filter(c => c.category === 'specialized-api'),
} as const

/**
 * Find connectors that can fulfill a specific capability
 */
export function findConnectorsByCapability(keyword: string): ConnectorDefinition[] {
  const lowerKeyword = keyword.toLowerCase()
  return Object.values(CONNECTOR_DEFINITIONS).filter(connector => {
    return connector.capabilities.some(cap => {
      return (
        cap.category.toLowerCase().includes(lowerKeyword) ||
        cap.description.toLowerCase().includes(lowerKeyword) ||
        cap.examples.some(ex => ex.toLowerCase().includes(lowerKeyword))
      )
    })
  }).sort((a, b) => b.priority - a.priority)
}

/**
 * Get a connector by ID
 */
export function getConnector(id: ConnectorId): ConnectorDefinition | null {
  return CONNECTOR_DEFINITIONS[id] || null
}

/**
 * Get all connectors sorted by priority
 */
export function getAllConnectors(): ConnectorDefinition[] {
  return Object.values(CONNECTOR_DEFINITIONS).sort((a, b) => b.priority - a.priority)
}

/**
 * Check if a phrase relates to a specific connector capability
 * Returns matching connectors with their primary capability
 */
export function detectConnectorFromPhrase(phrase: string): {
  connector: ConnectorDefinition
  capability: ConnectorCapability
}[] {
  const lowerPhrase = phrase.toLowerCase()
  const keywords = lowerPhrase.split(/\s+/)
  const matches: Map<ConnectorId, ConnectorCapability> = new Map()

  // First pass: direct connector name/id matches
  for (const connector of Object.values(CONNECTOR_DEFINITIONS)) {
    const idText = connector.id.replace(/-/g, ' ')
    const nameText = connector.name.toLowerCase()
    const displayText = connector.displayName.toLowerCase()

    if (
      lowerPhrase.includes(nameText) ||
      lowerPhrase.includes(displayText) ||
      lowerPhrase.includes(idText)
    ) {
      matches.set(connector.id, connector.capabilities[0])
    }
  }

  // Second pass: capability keyword matches
  for (const keyword of keywords) {
    const connectors = findConnectorsByCapability(keyword)
    for (const connector of connectors) {
      if (matches.has(connector.id)) continue

      const matchingCapability = connector.capabilities.find(
        (cap) =>
          cap.category.toLowerCase().includes(keyword) ||
          cap.description.toLowerCase().includes(keyword) ||
          cap.examples.some((ex) => ex.toLowerCase().includes(keyword))
      )

      if (matchingCapability) {
        matches.set(connector.id, matchingCapability)
      }
    }
  }

  return Array.from(matches.entries())
    .map(([id, capability]) => ({
      connector: CONNECTOR_DEFINITIONS[id],
      capability,
    }))
    .sort((a, b) => b.connector.priority - a.connector.priority)
}
