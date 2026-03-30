import { generateObject } from 'ai'
import { getModelOptions } from '@/ai/gateway'
import { DEFAULT_MODEL } from '@/ai/constants'
import { executionPlanSchema, type AgentRunContext, type ExecutionPlan, type HistorianContext } from './types'
import { randomUUID } from 'crypto'

const ARCHITECT_SYSTEM_PROMPT = `You are the Architect agent in a multi-agent AI system. You are the ONLY agent whose job is to plan.

Your output is a structured JSON execution plan. You never write actual code. You never output prose.

Your responsibilities:
1. Deeply analyze the user's intent from their message and conversation history
2. Identify the app type, framework, and architectural shape
3. Break the work into parallel task groups where possible (independent features can run simultaneously)
4. List every file that needs to be created or modified with its purpose
5. Specify exact npm packages required
6. Define clear success criteria so the Executor knows when it's done

Rules:
- Be specific about file paths — do not use vague names like "component.tsx"
- Prefer parallel task groups when parts of the work are independent
- For large apps, always define multi-page architecture with proper routing
- Never include placeholders — every decision must be concrete
- If the request involves auth, always include proper server/client separation
- Estimate complexity honestly: low = single component, medium = multi-file feature, high = full app`

export async function runArchitectAgent(
  ctx: AgentRunContext,
  historianContext: HistorianContext
): Promise<ExecutionPlan> {
  const modelOptions = getModelOptions(DEFAULT_MODEL)

  const historianInsights =
    historianContext.reusablePatterns.length > 0 || historianContext.commonPitfalls.length > 0
      ? `
Historical context (from the Historian agent):
- Reusable patterns: ${historianContext.reusablePatterns.join(', ') || 'none'}
- Common pitfalls to avoid: ${historianContext.commonPitfalls.join(', ') || 'none'}
- ${historianContext.contextSummary}
`
      : ''

  const result = await generateObject({
    ...modelOptions,
    schema: executionPlanSchema,
    system: ARCHITECT_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${historianInsights}

Project context:
${ctx.projectContext}

Conversation history (last few turns):
${ctx.conversationHistory}

Current user request:
"${ctx.userPrompt}"

Produce a complete, concrete execution plan. Be specific about files and structure.`,
      },
    ],
  })

  const plan = result.object

  if (!plan.parallelTaskGroups || plan.parallelTaskGroups.length === 0) {
    plan.parallelTaskGroups = [
      {
        groupId: randomUUID(),
        description: 'Main implementation',
        tasks: [
          {
            id: randomUUID(),
            description: ctx.userPrompt,
            files: plan.requiredFiles.map((f) => f.path),
            priority: 5,
            canRunInParallel: false,
          },
        ],
        canRunInParallelWithOtherGroups: false,
      },
    ]
  }

  return plan
}
