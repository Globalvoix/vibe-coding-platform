import { createGatewayProvider } from '@ai-sdk/gateway'
import { Models } from '@/ai/constants'
import { tool, type ToolSet } from 'ai'
import { todoWriteTool } from '@/packages/runtime/packages/agent/tools/todo'
import { readFileTool } from '@/packages/runtime/packages/agent/tools/read'
import { writeFileTool, editFileTool } from '@/packages/runtime/packages/agent/tools/write'
import { grepTool } from '@/packages/runtime/packages/agent/tools/grep'
import { globTool } from '@/packages/runtime/packages/agent/tools/glob'
import { bashTool } from '@/packages/runtime/packages/agent/tools/bash'
import { taskTool } from '@/packages/runtime/packages/agent/tools/task'
import { askUserQuestionTool } from '@/packages/runtime/packages/agent/tools/ask-user-question'
import { skillTool } from '@/packages/runtime/packages/agent/tools/skill'
import { webFetchTool } from '@/packages/runtime/packages/agent/tools/fetch'

const OPENCODE_BASE_URL = 'https://opencode.ai/zen/v1'

export const runtimeConfig = {
  defaultModel: 'opencode/big-pickle',
  defaultModelLabel: 'Big Pickle (Free)',
  baseUrl: OPENCODE_BASE_URL,
}

export async function getRuntimeModels() {
  return [
    { id: 'opencode/big-pickle', name: 'Big Pickle (Free)', enabled: true, requiresPaid: false },
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', enabled: true },
    { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6', enabled: true },
    { id: 'openai/gpt-5', name: 'GPT-5', enabled: true },
    { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', enabled: true },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', enabled: true },
  ]
}

export function createRuntimeProvider() {
  return createGatewayProvider({
    baseURL: process.env.OPENCODE_BASE_URL || OPENCODE_BASE_URL,
    apiKey: process.env.OPENCODE_API_KEY,
  })
}

export const runtimeTools: ToolSet = {
  todo_write: todoWriteTool,
  read: readFileTool(),
  write: writeFileTool(),
  edit: editFileTool(),
  grep: grepTool(),
  glob: globTool(),
  bash: bashTool,
  task: taskTool,
  ask_user_question: askUserQuestionTool,
  skill: skillTool,
  web_fetch: webFetchTool,
}

export { runtimeConfig as config }

export function getDefaultModel() {
  return runtimeConfig.defaultModel
}