import { generateObject } from 'ai'
import { getModelOptions } from '@/ai/gateway'
import { DEFAULT_MODEL } from '@/ai/constants'
import { synthesisResultSchema, type AgentRunContext, type ExecutionPlan, type FileDiff, type HistorianContext, type Problem, type SynthesisResult } from './types'
import type { AdversaryOutput } from './adversary'

const SYNTHESIZER_SYSTEM_PROMPT = `You are the Synthesizer agent in a multi-agent AI system.

You are the final quality gate before code is executed. You receive:
1. The Architect's execution plan
2. The Craftsman's file diffs
3. The Adversary's list of problems
4. Historical context from the Historian

Your job is to reconcile everything into a final, battle-tested execution directive.

Rules:
- If the Adversary found CRITICAL problems: the Craftsman's diffs for those files must be patched before execution
- If the Adversary found MAJOR problems: patch them in patchedDiffs and include them in criticalProblems
- If the Adversary found WARNINGS: include them in warnings but do not block execution
- The executionDirective must be a precise, complete instruction for the Executor agent that tells it exactly what to build, in what order, with what patterns
- The executionDirective should be actionable prose that would let a senior engineer implement this from scratch
- Quality gating: define what must pass BEFORE execution (e.g. "no TypeScript errors") and AFTER (e.g. "app runs on port 3000")

The executionDirective is the most important output — it becomes the system prompt for the code generation agent.
Make it detailed, specific, and complete. Include:
- Exact file structure
- Key implementation patterns
- Data models
- State management approach
- Error handling patterns
- Critical imports`

export async function runSynthesizerAgent(
  ctx: AgentRunContext,
  plan: ExecutionPlan,
  diffs: FileDiff[],
  adversaryOutput: AdversaryOutput,
  historianContext: HistorianContext
): Promise<SynthesisResult> {
  const modelOptions = getModelOptions(DEFAULT_MODEL)

  const problemsText =
    adversaryOutput.problems.length > 0
      ? adversaryOutput.problems
          .map(
            (p) =>
              `[${p.severity.toUpperCase()}] ${p.category} in ${p.affectedFiles.join(', ')}: ${p.description}\n  Fix: ${p.suggestion}`
          )
          .join('\n')
      : 'No problems found.'

  const diffsText = diffs
    .map(
      (d) => `${d.action.toUpperCase()} ${d.path}: ${d.description}`
    )
    .join('\n')

  const planText = `
Intent: ${plan.intent}
App Type: ${plan.appType ?? 'generic'}
Framework: ${plan.framework}
Complexity: ${plan.estimatedComplexity}
Files: ${plan.requiredFiles.map((f) => `${f.path} (${f.purpose})`).join(', ')}
Packages: ${plan.requiredPackages.join(', ') || 'none'}
Architectural decisions: ${plan.architecturalDecisions.join('; ')}
Success criteria: ${plan.successCriteria.join('; ')}
`

  const historianText =
    historianContext.reusablePatterns.length > 0
      ? `Reusable patterns from history: ${historianContext.reusablePatterns.join(', ')}`
      : ''

  const result = await generateObject({
    ...modelOptions,
    schema: synthesisResultSchema,
    system: SYNTHESIZER_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Synthesize a final execution directive.

User request: "${ctx.userPrompt}"

Architect's Plan:
${planText}

Craftsman's Diffs:
${diffsText}

Adversary's Findings (${adversaryOutput.overallRisk} risk):
${problemsText}

${historianText}

Produce the final synthesis. The executionDirective must be a complete, specific instruction set for the code generation agent.`,
      },
    ],
  })

  return result.object
}

export function buildEnhancedSystemPrompt(
  basePrompt: string,
  synthesis: SynthesisResult,
  connectorContext: string
): string {
  const criticalWarnings =
    synthesis.criticalProblems.length > 0
      ? `\n\n## CRITICAL ISSUES TO AVOID (from the Adversary agent)\n${synthesis.criticalProblems
          .map((p) => `- [${p.severity}] ${p.description} (${p.affectedFiles.join(', ')}): ${p.suggestion}`)
          .join('\n')}`
      : ''

  const warningsList =
    synthesis.warnings.length > 0
      ? `\n\n## WARNINGS TO HANDLE\n${synthesis.warnings
          .map((p) => `- ${p.description}: ${p.suggestion}`)
          .join('\n')}`
      : ''

  const qualityGating =
    synthesis.qualityGating.mustPassBeforeExecution.length > 0
      ? `\n\n## QUALITY GATES\nBefore finalizing:\n${synthesis.qualityGating.mustPassBeforeExecution
          .map((g) => `- ${g}`)
          .join('\n')}`
      : ''

  return [
    basePrompt,
    connectorContext,
    `\n\n# MULTI-AGENT EXECUTION DIRECTIVE\n\nThe following directive was produced by the Architect, Craftsman, Adversary, and Synthesizer agents. Follow it precisely.\n\n${synthesis.executionDirective}`,
    criticalWarnings,
    warningsList,
    qualityGating,
  ]
    .filter(Boolean)
    .join('\n')
}
