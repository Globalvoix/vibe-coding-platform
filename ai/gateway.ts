import { Models, SUPPORTED_MODELS } from './constants'
import { createGateway } from '@ai-sdk/gateway'
import type { JSONValue } from 'ai'
import type { LanguageModelV2 } from '@ai-sdk/provider'

interface AvailableModel {
  id: string
  name: string
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  [Models.AnthropicClaude4Sonnet]: 'Anthropic Claude 4 Sonnet',
  [Models.AnthropicClaude45Sonnet]: 'Anthropic Claude 4.5 Sonnet',
  [Models.GoogleGeminiFlash]: 'Google Gemini 2.5 Flash',
  [Models.OpenAIGPT5]: 'OpenAI GPT-5',
}

export const aiGateway = createGateway({
  apiKey: process.env.VERCEL_AI_GATEWAY_API_KEY ?? process.env.AI_GATEWAY_API_KEY,
})

export async function getAvailableModels(): Promise<AvailableModel[]> {
  return SUPPORTED_MODELS.map((id) => ({
    id,
    name: MODEL_DISPLAY_NAMES[id] ?? id,
  }))
}

export interface ModelOptions {
  model: LanguageModelV2
  providerOptions?: Record<string, Record<string, JSONValue>>
  headers?: Record<string, string>
}

function getGatewayModelId(modelId: string): string {
  if (modelId === Models.OpenAIGPT5) {
    return 'openai/gpt-4.1'
  }

  if (modelId === Models.AnthropicClaude4Sonnet) {
    return 'anthropic/claude-3-5-sonnet-latest'
  }

  if (modelId === Models.AnthropicClaude45Sonnet) {
    return 'anthropic/claude-3-7-sonnet-latest'
  }

  if (modelId === Models.GoogleGeminiFlash) {
    return 'google/gemini-2.5-flash'
  }

  return 'openai/gpt-4.1-mini'
}

export function getModelOptions(
  modelId: string,
  options?: { reasoningEffort?: 'minimal' | 'low' | 'medium' }
): ModelOptions {
  const gatewayModelId = getGatewayModelId(modelId)

  const providerOptions: Record<string, Record<string, JSONValue>> | undefined =
    gatewayModelId.startsWith('openai/')
      ? {
          openai: {
            reasoningEffort: options?.reasoningEffort ?? 'low',
          },
        }
      : undefined

  return {
    model: aiGateway(gatewayModelId),
    ...(providerOptions ? { providerOptions } : {}),
  }
}
