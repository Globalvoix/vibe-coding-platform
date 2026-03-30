import { generateObject } from 'ai'
import { getModelOptions } from '@/ai/gateway'
import { DEFAULT_MODEL } from '@/ai/constants'
import { z } from 'zod'
import { fileDiffSchema, type AgentRunContext, type ExecutionPlan, type FileDiff } from './types'

const CRAFTSMAN_SYSTEM_PROMPT = `You are the Craftsman agent in a multi-agent AI system.

You receive an Architect's execution plan and produce file diffs — descriptions of exactly what code needs to be written in each file, including the key patterns, imports, and structure.

You do NOT write complete file contents here. You write precise, actionable descriptions of what each file should contain, with code snippets for the most critical parts.

Your output is used by the Execution agent to generate the actual code. Be precise enough that the Executor can produce correct, high-quality code from your output alone.

Rules:
- For every file in the plan, produce a diff entry
- For 'create' actions: describe the full structure of the file
- For 'modify' actions: describe exactly what changes and why
- For 'delete' actions: explain why the file is being removed
- Include key import statements in your codeSnippet
- Include the critical logic/pattern for complex files
- Flag any cross-file dependencies explicitly
- Never skip files that are in the plan
- Prefer TypeScript strict types over 'any'
- Always include error boundaries and loading states in UI components`

const craftsmanOutputSchema = z.object({
  diffs: z.array(fileDiffSchema),
  executionOrder: z.array(z.string()).describe('File paths in the order they should be created'),
  criticalPatterns: z.array(
    z.object({
      pattern: z.string(),
      appliesTo: z.array(z.string()),
      reason: z.string(),
    })
  ),
})

export type CraftsmanOutput = z.infer<typeof craftsmanOutputSchema>

export async function runCraftsmanAgent(
  ctx: AgentRunContext,
  plan: ExecutionPlan
): Promise<FileDiff[]> {
  const modelOptions = getModelOptions(DEFAULT_MODEL)

  const planSummary = `
Intent: ${plan.intent}
App Type: ${plan.appType ?? 'unknown'}
Framework: ${plan.framework}
Complexity: ${plan.estimatedComplexity}

Files to create/modify:
${plan.requiredFiles.map((f) => `- ${f.path} (${f.isNew ? 'new' : 'modify'}): ${f.purpose}`).join('\n')}

Required packages: ${plan.requiredPackages.join(', ') || 'none'}

Architectural decisions:
${plan.architecturalDecisions.map((d) => `- ${d}`).join('\n')}

Success criteria:
${plan.successCriteria.map((c) => `- ${c}`).join('\n')}
`

  const result = await generateObject({
    ...modelOptions,
    schema: craftsmanOutputSchema,
    system: CRAFTSMAN_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Produce detailed file diffs for this execution plan.

User request: "${ctx.userPrompt}"

${planSummary}

For each file, specify: action (create/modify/delete), description of contents, reasoning, critical code snippets, and import dependencies.`,
      },
    ],
  })

  return result.object.diffs
}
