import { createGatewayProvider } from '@ai-sdk/gateway'
import { tool, type ToolSet } from 'ai'
import { z } from 'zod'

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
  todo_write: tool({
    description: `Create and manage a structured task list for the current session.

WHEN TO USE:
- Complex multi-step tasks requiring 3 or more distinct steps
- When the user provides multiple requirements or a checklist
- After receiving new instructions - immediately capture them as todos

USAGE:
- This tool REPLACES the entire todo list - always send the full, updated list of todos
- Use it frequently to keep the task list in sync with actual progress
- Update statuses as you start and finish work`,
    inputSchema: z.object({
      todos: z.array(z.object({
        id: z.string(),
        content: z.string(),
        status: z.enum(['pending', 'in_progress', 'completed']),
      })),
    }),
    execute: async () => ({ success: true }),
  }),

  read_file: tool({
    description: 'Read the contents of a file from the filesystem',
    inputSchema: z.object({
      path: z.string(),
    }),
    execute: async ({ path }) => {
      try {
        const content = await Bun.file(path).text()
        return { path, content, success: true }
      } catch {
        return { path, error: 'Failed to read file', success: false }
      }
    },
  }),

  write_file: tool({
    description: 'Write content to a file, creating it if it does not exist',
    inputSchema: z.object({
      path: z.string(),
      content: z.string(),
    }),
    execute: async ({ path, content }) => {
      try {
        await Bun.write(path, content)
        return { path, success: true }
      } catch {
        return { path, error: 'Failed to write file', success: false }
      }
    },
  }),

  bash: tool({
    description: 'Execute a shell command and return the output',
    inputSchema: z.object({
      command: z.string(),
      timeout: z.number().optional(),
    }),
    execute: async ({ command }) => {
      try {
        const result = Bun.spawnSync(command, { shell: true })
        return {
          stdout: result.stdout?.toString() || '',
          stderr: result.stderr?.toString() || '',
          exitCode: result.exitCode,
          success: true,
        }
      } catch {
        return { error: 'Command execution failed', success: false }
      }
    },
  }),
}

export function getDefaultModel() {
  return runtimeConfig.defaultModel
}