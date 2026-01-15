export enum Models {
  AmazonNovaPro = 'amazon/nova-pro',
  AnthropicClaude4Sonnet = 'anthropic/claude-4-sonnet',
  AnthropicClaude45Sonnet = 'anthropic/claude-sonnet-4.5',

  // Default UI & general coding model (via Vercel AI Gateway)
  GoogleGeminiFlash3 = 'google/gemini-2.5-flash',

  // Chat/content model
  OpenAIGPT5 = 'gpt-5',
  OpenAIGPT5Mini = 'gpt-5-mini',

  // Advanced/complex coding
  OpenAIGPT51CodexMax = 'openai/gpt-5.1-codex-max',

  // Security fix model (via Vercel AI Gateway)
  Minimax21 = 'minimax/minimax-2.1',

  MoonshotKimiK2 = 'moonshotai/kimi-k2',
  XaiGrok3Fast = 'xai/grok-3-fast',
}

// Default for UI creation
export const DEFAULT_MODEL = Models.GoogleGeminiFlash3

export const SUPPORTED_MODELS = [
  Models.GoogleGeminiFlash3,
  Models.OpenAIGPT5Mini,
  Models.OpenAIGPT5,
  Models.OpenAIGPT51CodexMax,
  Models.Minimax21,
  Models.AnthropicClaude45Sonnet,
] as const

export type SupportedModelId = (typeof SUPPORTED_MODELS)[number]

const SUPPORTED_MODEL_ID_SET = new Set<string>(SUPPORTED_MODELS)

export function isSupportedModelId(id: string): id is SupportedModelId {
  return SUPPORTED_MODEL_ID_SET.has(id)
}

export const TEST_PROMPTS = [
  'Generate a Next.js app that allows to list and search Pokemons',
  'Create a `golang` server that responds with "Hello World" to any request',
]
