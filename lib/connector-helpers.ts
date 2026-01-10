/**
 * Connector Helper Utilities
 * Functions for working with connectors: validation, retrieval, and integration
 */

import { ConnectorId, CONNECTOR_DEFINITIONS } from './connector-mapping'

export interface ConfiguredConnector {
  id: ConnectorId
  name: string
  displayName: string
  isConfigured: boolean
  description: string
  envVarKey: string
}

/**
 * Validate an API key format for a connector
 * Returns true if the key looks valid (basic validation)
 */
export function validateConnectorApiKey(connectorId: ConnectorId, apiKey: string): boolean {
  if (!apiKey || apiKey.length < 10) return false

  const connector = CONNECTOR_DEFINITIONS[connectorId]
  if (!connector) return false

  // Basic validation based on key pattern
  if (connectorId === 'openai' && !apiKey.startsWith('sk-')) return false
  if (connectorId === 'google-gemini' && !apiKey.startsWith('AIza')) return false
  if (connectorId === 'perplexity' && !apiKey.startsWith('pplx-')) return false
  if (connectorId === 'firecrawl' && !(apiKey.startsWith('fc_') || apiKey.startsWith('fc-'))) return false

  return true
}

/**
 * Get the environment variable key for a connector
 */
export function getConnectorEnvKey(connectorId: ConnectorId): string | null {
  const connector = CONNECTOR_DEFINITIONS[connectorId]
  return connector?.envVarKey || null
}

/**
 * Get configured connectors from a project's environment variables
 * Returns which connectors are set up and ready to use
 */
export async function getConfiguredConnectors(
  projectId: string
): Promise<ConfiguredConnector[]> {
  try {
    const response = await fetch(`/api/projects/${projectId}/env-vars`)
    if (!response.ok) return []

    const data = (await response.json()) as { envVars: Array<{ key: string; has_value: boolean }> }
    const envVars = data.envVars || []

    return Object.values(CONNECTOR_DEFINITIONS).map(connector => ({
      id: connector.id,
      name: connector.name,
      displayName: connector.displayName,
      description: connector.description,
      envVarKey: connector.envVarKey,
      isConfigured: envVars.some(
        (ev) =>
          (ev.key === connector.envVarKey ||
            (connector.envVarAliases ?? []).includes(ev.key)) &&
          ev.has_value
      )
    }))
  } catch (error) {
    console.error('Failed to fetch configured connectors:', error)
    return []
  }
}

/**
 * Build a connector summary for AI system prompt
 * Lists all available connectors and their capabilities
 */
export function buildConnectorSummary(): string {
  const lines: string[] = [
    '# Available Connectors',
    '',
    'The following connectors are available for this workspace:',
    ''
  ]

  // Group by category
  const byCategory: Record<'ai-model' | 'specialized-api' | 'tool', string[]> = {
    'ai-model': [],
    'specialized-api': [],
    'tool': []
  }

  Object.values(CONNECTOR_DEFINITIONS).forEach(connector => {
    const capabilities = connector.capabilities
      .map(c => `${c.category}`)
      .join(', ')
    const text = `- **${connector.displayName}**: ${connector.description}. Capabilities: ${capabilities}`
    byCategory[connector.category].push(text)
  })

  if (byCategory['ai-model'].length > 0) {
    lines.push('## AI & Language Models')
    lines.push(...byCategory['ai-model'])
    lines.push('')
  }

  if (byCategory['specialized-api'].length > 0) {
    lines.push('## Specialized Tools & APIs')
    lines.push(...byCategory['specialized-api'])
    lines.push('')
  }

  if (byCategory['tool'].length > 0) {
    lines.push('## Tools')
    lines.push(...byCategory['tool'])
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Build connector usage instructions for AI
 * Tells the AI how to handle connector suggestions
 */
export function buildConnectorUsageInstructions(): string {
  return `
## Connector Usage in Code Generation

When the user asks for a feature that can be fulfilled by one or more connectors:

1. **Detect Applicable Connectors**: Identify which connectors can fulfill the request
2. **Check Configuration Status**: Ask if any configured connectors should be used
3. **Present Options**: Offer configured connectors first, then ask if user wants to provide custom API keys
4. **Confirm Selection**: Once confirmed, integrate the chosen connector into the generated code
5. **Environment Injection**: Use the connector's env var key in the generated code (e.g., process.env.OPENAI_API_KEY)

### Example Interaction:

User: "Add text-to-speech to my app"

AI Response: "I can add text-to-speech to your app. I see you have Eleven Labs already configured in your project. Should I use that, or would you prefer to use a different service?"

If User: "Use Eleven Labs"
→ AI generates code that uses process.env.ELEVEN_LABS_API_KEY

If User: "Use a different service" or provides an API key
→ AI asks which service and generates code accordingly

### Important Rules:

- Always prefer configured connectors to minimize user friction
- Clearly indicate when a connector is already set up vs. needs configuration
- Provide brief capability descriptions when suggesting alternatives
- Never expose actual API keys in generated code or prompts
- Always use environment variables for sensitive credentials
`
}

/**
 * Format a connector suggestion message for the user
 */
export function formatConnectorSuggestion(
  configuredConnectorId: string,
  configuredConnectorName: string,
  alternativeConnectors: Array<{ name: string; reason: string }> = []
): string {
  let message = `I can help with that. I see you have **${configuredConnectorName}** already configured in your project. Should I use that?`

  if (alternativeConnectors.length > 0) {
    message += `\n\nAlternatively, I can set up:`
    alternativeConnectors.forEach(alt => {
      message += `\n- **${alt.name}**: ${alt.reason}`
    })
  }

  return message
}

/**
 * Check if a connector needs to be set up
 */
export function isConnectorMissing(
  connectorId: ConnectorId,
  configuredConnectors: ConfiguredConnector[]
): boolean {
  const configured = configuredConnectors.find(c => c.id === connectorId)
  return !configured || !configured.isConfigured
}

/**
 * Get the recommended connector for a specific use case
 */
export function getRecommendedConnector(
  useCase: string,
  configuredConnectors: ConfiguredConnector[]
): ConfiguredConnector | null {
  const lowerCase = useCase.toLowerCase()

  // Priority mapping for common use cases
  const priorityMap: Record<string, ConnectorId[]> = {
    'llm': ['openai', 'google-gemini', 'deepseek', 'together-ai'],
    'code': ['openai', 'google-gemini', 'deepseek'],
    'chat': ['openai', 'google-gemini'],
    'text-to-speech': ['eleven-labs'],
    'voice': ['eleven-labs'],
    'speech': ['eleven-labs'],
    'web-scrape': ['firecrawl'],
    'scrape': ['firecrawl'],
    'search': ['perplexity'],
    'research': ['perplexity'],
    'embedding': ['openai'],
    'vector': ['openai']
  }

  for (const [keyword, connectorIds] of Object.entries(priorityMap)) {
    if (lowerCase.includes(keyword)) {
      for (const connectorId of connectorIds) {
        const configured = configuredConnectors.find(c => c.id === connectorId)
        if (configured?.isConfigured) {
          return configured
        }
      }
      // If no configured connector matches, return the first option
      const connector = CONNECTOR_DEFINITIONS[connectorIds[0]]
      return {
        id: connectorIds[0],
        name: connector.name,
        displayName: connector.displayName,
        description: connector.description,
        envVarKey: connector.envVarKey,
        isConfigured: false
      }
    }
  }

  return null
}
