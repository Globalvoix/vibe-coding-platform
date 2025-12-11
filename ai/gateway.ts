import { createGatewayProvider } from '@ai-sdk/gateway'
import { createOpenAI } from '@ai-sdk/openai'
import { Models } from './constants'
import type { JSONValue } from 'ai'
import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai'
import type { LanguageModelV2 } from '@ai-sdk/provider'

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
          include: ['reasoning.encrypted_content'],
          reasoningEffort: options?.reasoningEffort ?? 'low',
          reasoningSummary: 'auto',
          serviceTier: 'priority',
        } satisfies OpenAIResponsesProviderOptions,
      },
    }
  }

  const gateway = gatewayInstance()

  if (
    modelId === Models.AnthropicClaude4Sonnet ||
    modelId === Models.AnthropicClaude45Sonnet
  ) {
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

function gatewayInstance() {
  return createGatewayProvider({
    baseURL: process.env.AI_GATEWAY_BASE_URL,
  })
}
