import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { Models, SUPPORTED_MODELS } from './constants'
import type { JSONValue } from 'ai'
import type { LanguageModelV2 } from '@ai-sdk/provider'

const modelRegistry: Record<string, () => LanguageModelV2> = {
  [Models.AnthropicClaude4Sonnet]: () =>
    anthropic('claude-opus-4-1-20250805'),
  [Models.AnthropicClaude45Sonnet]: () => anthropic('claude-3-5-sonnet-20241022'),
  [Models.GoogleGeminiFlash]: () => google('gemini-2.0-flash-exp'),
  [Models.OpenAIGPT4o]: () => openai('gpt-4o-2024-11-20'),
}

export async function getAvailableModels() {
  return SUPPORTED_MODELS.map((modelId) => {
    const labels: Record<string, string> = {
      [Models.AnthropicClaude4Sonnet]: 'Claude 3 Opus',
      [Models.AnthropicClaude45Sonnet]: 'Claude 3.5 Sonnet',
      [Models.GoogleGeminiFlash]: 'Gemini 2.0 Flash',
      [Models.OpenAIGPT4o]: 'GPT-4o',
    }
    return { id: modelId, name: labels[modelId] || modelId }
  })
}

export interface ModelOptions {
  model: LanguageModelV2
  providerOptions?: Record<string, Record<string, JSONValue>>
  headers?: Record<string, string>
}

export function getModelOptions(
  modelId: string,
  options?: { reasoningEffort?: 'minimal' | 'low' | 'medium' }
): ModelOptions {
  const getModel = modelRegistry[modelId]
  if (!getModel) {
    throw new Error(`Unsupported model: ${modelId}`)
  }

  const model = getModel()

  if (modelId === Models.AnthropicClaude4Sonnet ||
    modelId === Models.AnthropicClaude45Sonnet) {
    return {
      model,
      headers: { 'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14' },
      providerOptions: {
        anthropic: {
          cacheControl: { type: 'ephemeral' },
        },
      },
    }
  }

  return { model }
}
