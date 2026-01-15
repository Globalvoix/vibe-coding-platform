import { createGatewayProvider } from '@ai-sdk/gateway'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { Models } from './constants'
import type { JSONValue } from 'ai'
import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai'
import type { LanguageModelV2 } from '@ai-sdk/provider'

const DEFAULT_GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1/ai'

export async function getAvailableModels() {
  const models: Array<{ id: string; name: string }> = []

  try {
    const gateway = gatewayInstance()
    const response = await gateway.getAvailableModels()
    models.push(...response.models.map((model) => ({ id: model.id, name: model.name })))
  } catch {
    // best-effort; we'll fall back to a curated list below
  }

  const ensure = (id: string, name: string, enabled: boolean) => {
    if (!enabled) return
    if (models.some((m) => m.id === id)) return
    models.push({ id, name })
  }

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY)
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY)
  const hasGateway = Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY)

  ensure(Models.OpenAIGPT5, 'OpenAI GPT-5', hasOpenAI)
  ensure(Models.OpenAIGPT5Mini, 'OpenAI GPT-5 Mini', hasOpenAI)

  // Gateway-routed models
  ensure(Models.GoogleGeminiFlash3, 'Google Gemini Flash 3', hasGateway)
  ensure(Models.OpenAIGPT51CodexMax, 'OpenAI GPT-5.1 Codex Max', hasGateway)
  ensure(Models.Minimax21, 'Minimax 2.1', hasGateway)
  ensure(Models.AnthropicClaude45Sonnet, 'Anthropic Claude Sonnet 4.5', hasGateway)

  // Direct provider models
  ensure(Models.AnthropicClaude4Sonnet, 'Anthropic Claude 4 Sonnet', hasAnthropic)

  // Keep the list stable for UI
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
  if (modelId === Models.OpenAIGPT5 || modelId === Models.OpenAIGPT5Mini) {
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

function gatewayInstance() {
  return createGatewayProvider({
    baseURL: process.env.AI_GATEWAY_BASE_URL || DEFAULT_GATEWAY_BASE_URL,
    apiKey: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY,
  })
}
