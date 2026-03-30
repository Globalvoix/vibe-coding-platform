import { generateObject } from 'ai'
import { getModelOptions } from '@/ai/gateway'
import { getAgentPlanningModelId } from '@/ai/model-routing'
import { z } from 'zod'
import { problemSchema, type AgentRunContext, type ExecutionPlan, type FileDiff, type Problem } from './types'

const ADVERSARY_SYSTEM_PROMPT = `You are the Adversary agent in a multi-agent AI system.

Your job is adversarial: you receive the same plan as the Craftsman but your goal is to find everything that could go wrong.

You are a ruthless code reviewer. You look for:
- Type mismatches and TypeScript errors
- Missing imports or circular dependencies
- Broken logic and incorrect assumptions
- Security vulnerabilities (XSS, SSRF, exposed secrets, missing auth checks)
- Missing error handling for async operations
- Edge cases that would cause runtime crashes
- Performance problems (N+1 queries, memory leaks, infinite loops)
- Accessibility issues in UI code
- Missing loading/error/empty states

You do NOT write fixes. You only identify problems with severity levels.

Severity guide:
- critical: Will cause a crash, data loss, or security breach — must be fixed before execution
- major: Will cause incorrect behavior that users will notice — should be fixed
- warning: Bad practice that could cause future problems — surface to user
- info: Improvement opportunity — optional

Be specific: name the exact file and describe the exact problem.
If the plan is solid and you find nothing critical, say so — do not invent problems.`

const adversaryOutputSchema = z.object({
  problems: z.array(problemSchema),
  overallRisk: z.enum(['low', 'medium', 'high', 'critical']),
  riskSummary: z.string(),
  safeToProceed: z.boolean(),
})

export type AdversaryOutput = z.infer<typeof adversaryOutputSchema>

export async function runAdversaryAgent(
  ctx: AgentRunContext,
  plan: ExecutionPlan,
  diffs: FileDiff[]
): Promise<AdversaryOutput> {
  // Adversary uses Claude Sonnet 4.5 — deep reasoning for security & correctness review
  const modelOptions = getModelOptions(getAgentPlanningModelId())

  const planText = `
Intent: ${plan.intent}
Framework: ${plan.framework}
Files: ${plan.requiredFiles.map((f) => f.path).join(', ')}
Packages: ${plan.requiredPackages.join(', ') || 'none'}
`

  const diffsText = diffs.length > 0
    ? diffs
        .map(
          (d) =>
            `${d.action.toUpperCase()} ${d.path}:
  ${d.description}
  Imports: ${d.importDependencies.join(', ') || 'none'}
  ${d.codeSnippet ? `Key code:\n${d.codeSnippet}` : ''}`
        )
        .join('\n\n')
    : 'No Craftsman diffs available yet — attack the plan directly.'

  const result = await generateObject({
    ...modelOptions,
    schema: adversaryOutputSchema,
    system: ADVERSARY_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Attack this execution plan. Find every problem that could cause failures.

User request: "${ctx.userPrompt}"

Plan:
${planText}

Craftsman's proposed diffs:
${diffsText}

Project context:
${ctx.projectContext}

List all problems. Be ruthless but accurate.`,
      },
    ],
  })

  return result.object
}
