export enum Models {
  AnthropicClaude4Sonnet = 'anthropic/claude-4-sonnet',
  AnthropicClaude45Sonnet = 'anthropic/claude-sonnet-4.5',
  GoogleGeminiFlash = 'google/gemini-2.5-flash',
  OpenAIGPT5 = 'gpt-5',
}

export const DEFAULT_MODEL = Models.AnthropicClaude45Sonnet

export const SUPPORTED_MODELS: string[] = [
  Models.AnthropicClaude4Sonnet,
  Models.AnthropicClaude45Sonnet,
  Models.GoogleGeminiFlash,
  Models.OpenAIGPT5,
]

export const TEST_PROMPTS = [
  'Generate a premium Next.js marketing site with Tailwind and framer-motion that feels like a Shopify or Apple landing page, including a hero with Unsplash imagery, feature grids, pricing, and testimonials.',
  'Create a polished dashboard-style Next.js app with Tailwind that visualizes product analytics using cards, charts, and animated empty/loading states.',
]
