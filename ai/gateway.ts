import { createGatewayProvider } from '@ai-sdk/gateway'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Models } from './constants'
import type { JSONValue } from 'ai'
import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai'
import type { LanguageModelV2 } from '@ai-sdk/provider'

const GOOGLE_GEMINI_FLASH_MODEL_ID = 'gemini-2.5-flash' as const

export async function getAvailableModels() {
  const gateway = gatewayInstance()
  const response = await gateway.getAvailableModels()

  const models = response.models.map((model) => ({ id: model.id, name: model.name }))

  if (process.env.OPENAI_API_KEY) {
    const hasGpt5 = models.some((model) => model.id === Models.OpenAIGPT5)
    if (!hasGpt5) {
      models.push({ id: Models.OpenAIGPT5, name: 'OpenAI GPT-5' })
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const hasClaude4 = models.some(
      (model) => model.id === Models.AnthropicClaude4Sonnet
    )
    if (!hasClaude4) {
      models.push({
        id: Models.AnthropicClaude4Sonnet,
        name: 'Anthropic Claude 4 Sonnet',
      })
    }
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const hasGeminiFlash = models.some((model) => model.id === Models.GoogleGeminiFlash)
    if (!hasGeminiFlash) {
      models.push({
        id: Models.GoogleGeminiFlash,
        name: 'Google Gemini 2.5 Flash',
      })
    }
  }

  return models
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
    const openai = openaiInstance()
    return {
      model: openai(modelId),
      providerOptions: {
        openai: {
          reasoningEffort: options?.reasoningEffort ?? 'low',
          serviceTier: 'priority',
        } satisfies OpenAIResponsesProviderOptions,
      },
    }
  }

  if (modelId === Models.AnthropicClaude4Sonnet) {
    const anthropic = anthropicInstance()
    return {
      model: anthropic(modelId),
      providerOptions: {
        anthropic: {
          cacheControl: { type: 'ephemeral' },
        },
      },
    }
  }

  if (modelId === Models.GoogleGeminiFlash && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const google = googleInstance()
    return {
      model: google(GOOGLE_GEMINI_FLASH_MODEL_ID),
    }
  }

  const gateway = gatewayInstance()

  if (modelId === Models.AnthropicClaude45Sonnet) {
    return {
      model: gateway(modelId),
      headers: { 'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14' },
      providerOptions: {
        anthropic: {
          cacheControl: { type: 'ephemeral' },
        },
      },
    }
  }

  return {
    model: gateway(modelId),
  }
}

function openaiInstance() {
  return createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID,
  })
}

function anthropicInstance() {
  return createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

function googleInstance() {
  return createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  })
}

function gatewayInstance() {
  return createGatewayProvider({
    baseURL: process.env.AI_GATEWAY_BASE_URL,
  })
}
