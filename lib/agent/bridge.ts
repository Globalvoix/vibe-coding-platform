import { openAgent } from '@/packages/runtime/packages/agent'
import { getDefaultModel } from '@/packages/runtime/packages/agent/models'
import type { OpenAgentCallOptions } from '@/packages/runtime/packages/agent'

export type { OpenAgentCallOptions }

export interface AgentConfig {
  model: string
  providerOptionsOverrides?: Record<string, unknown>
  customInstructions?: string
}

export interface SandboxContext {
  state: unknown
  workingDirectory: string
  currentBranch?: string
  environmentDetails?: string
}

export interface AgentOptions {
  model?: string
  sandbox?: SandboxContext
  subagentModel?: string
  customInstructions?: string
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  result: string
}

export interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
}

export interface AgentResponse {
  messages: Message[]
  toolCalls?: ToolCall[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export async function createAgent(options: AgentOptions): Promise<typeof openAgent> {
  return openAgent
}

export function getDefaultModel() {
  return 'opencode/big-pickle'
}

export function getAvailableModels() {
  return [
    { id: 'opencode/big-pickle', name: 'Big Pickle (Free)', enabled: true },
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
    { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6' },
    { id: 'openai/gpt-5', name: 'GPT-5' },
    { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  ]
}