import { Models, SUPPORTED_MODELS } from './constants'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import type { JSONValue } from 'ai'
import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai'
import type { LanguageModelV2 } from '@ai-sdk/provider'

interface AvailableModel {
  id: string
  name: string
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  [Models.AmazonNovaPro]: 'Amazon Nova Pro',
  [Models.AnthropicClaude4Sonnet]: 'Anthropic Claude 4 Sonnet',
  [Models.AnthropicClaude45Sonnet]: 'Anthropic Claude 4.5 Sonnet',
  [Models.GoogleGeminiFlash]: 'Google Gemini 2.5 Flash',
  [Models.MoonshotKimiK2]: 'Moonshot Kimi K2',
  [Models.OpenAIGPT5]: 'OpenAI GPT-5',
  [Models.XaiGrok3Fast]: 'Xai Grok 3 Fast',
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

  if (modelId === Models.AnthropicClaude4Sonnet) {
    return {
      model: anthropic('claude-3-5-sonnet-latest'),
    }
  }

  if (modelId === Models.AnthropicClaude45Sonnet) {
    return {
      model: anthropic('claude-3-7-sonnet-latest'),
    }
  }

  return {
    model: openai('gpt-4.1-mini'),
  }
}
