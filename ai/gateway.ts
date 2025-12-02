import { Models, SUPPORTED_MODELS } from './constants'
import { openai } from '@ai-sdk/openai'
import type { JSONValue } from 'ai'
import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai'
import type { LanguageModelV2 } from '@ai-sdk/provider'

interface AvailableModel {
  id: string
  name: string
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  [Models.AmazonNovaPro]: 'Premium code generation (tier A)',
  [Models.AnthropicClaude4Sonnet]: 'Premium code generation (tier B)',
  [Models.AnthropicClaude45Sonnet]: 'Default balanced model',
  [Models.GoogleGeminiFlash]: 'Fast drafting model',
  [Models.MoonshotKimiK2]: 'Deep reasoning model',
  [Models.OpenAIGPT5]: 'Advanced reasoning model',
  [Models.XaiGrok3Fast]: 'Fast experimentation model',
}

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

export function getModelOptions(
  modelId: string,
  options?: { reasoningEffort?: 'minimal' | 'low' | 'medium' }
): ModelOptions {
  if (modelId === Models.OpenAIGPT5) {
    return {
      model: openai('gpt-4.1'),
      providerOptions: {
        openai: {
          reasoningEffort: options?.reasoningEffort ?? 'low',
        } satisfies OpenAIResponsesProviderOptions,
      },
    }
  }

  return {
    model: openai('gpt-4.1-mini'),
  }
}
