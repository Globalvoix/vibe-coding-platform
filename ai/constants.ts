export enum Models {
  AnthropicClaude4Sonnet = 'claude-4-sonnet',
  AnthropicClaude45Sonnet = 'claude-sonnet-4.5',
  GoogleGeminiFlash = 'gemini-2.5-flash',
  OpenAIGPT4o = 'gpt-4o',
}

export const DEFAULT_MODEL = Models.AnthropicClaude45Sonnet

export const SUPPORTED_MODELS: string[] = [
  Models.AnthropicClaude4Sonnet,
  Models.AnthropicClaude45Sonnet,
  Models.GoogleGeminiFlash,
  Models.OpenAIGPT4o,
]

export const TEST_PROMPTS = [
  'Generate a Next.js app that allows to list and search Pokemons',
  'Create a `golang` server that responds with "Hello World" to any request',
]
