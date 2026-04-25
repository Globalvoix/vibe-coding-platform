import type { SandboxState } from '@open-agents/sandbox'
import { stepCountIs, ToolLoopAgent, type ToolSet } from 'ai'
import { z } from 'zod'
import { addCacheControl } from './context-management'
import {
  type GatewayModelId,
  gateway,
  type ProviderOptionsByProvider,
} from './models'
import type { SkillMetadata } from './skills/types'
import { buildSystemPrompt } from './system-prompt'
import {
  askUserQuestionTool,
  bashTool,
  editFileTool,
  globTool,
  grepTool,
  readFileTool,
  skillTool,
  taskTool,
  todoWriteTool,
  webFetchTool,
  writeFileTool,
} from './tools'

export interface AgentModelSelection {
  id: GatewayModelId
  providerOptionsOverrides?: ProviderOptionsByProvider
}

export type OpenAgentModelInput = GatewayModelId | AgentModelSelection

export interface AgentSandboxContext {
  state: SandboxState
  workingDirectory: string
  currentBranch?: string
  environmentDetails?: string
}

const callOptionsSchema = z.object({
  sandbox: z.custom<AgentSandboxContext>(),
  model: z.custom<OpenAgentModelInput>().optional(),
  subagentModel: z.custom<OpenAgentModelInput>().optional(),
  customInstructions: z.string().optional(),
  skills: z.custom<SkillMetadata[]>().optional(),
})

export type OpenAgentCallOptions = z.infer<typeof callOptionsSchema>

export const defaultModelLabel = 'opencode/big-pickle' as const

function normalizeAgentModelSelection(
  selection: OpenAgentModelInput | undefined,
  fallbackId: GatewayModelId,
): AgentModelSelection {
  if (!selection) {
    return { id: fallbackId }
  }

  return typeof selection === 'string' ? { id: selection } : selection
}

const tools = {
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
} satisfies ToolSet

export const openAgent = new ToolLoopAgent({
  model: gateway(defaultModelLabel),
  instructions: buildSystemPrompt({}),
  tools,
  stopWhen: stepCountIs(200),
  callOptionsSchema,
  prepareStep: ({ messages, model, steps: _steps }) => {
    return {
      messages: addCacheControl({
        messages,
        model,
      }),
    }
  },
  prepareCall: ({ options, ...settings }) => {
    if (!options) {
      throw new Error('Open Agent requires call options with sandbox.')
    }

    const mainSelection = normalizeAgentModelSelection(
      options.model,
      defaultModelLabel,
    )

    const subagentSelection = normalizeAgentModelSelection(
      options.subagentModel,
      defaultModelLabel,
    )

    return {
      ...settings,
      model: gateway(mainSelection.id, mainSelection.providerOptionsOverrides),
      system: buildSystemPrompt({
        customInstructions: options.customInstructions,
      }),
      tools,
      callOptions: {
        ...options,
        model: subagentSelection,
      },
    }
  },
})

export { defaultModelLabel as getDefaultModel }

export function getModelById(modelId: string) {
  return gateway(modelId)
}