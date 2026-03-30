import { z } from 'zod'

export const executionTaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  files: z.array(z.string()),
  priority: z.number().min(1).max(10),
  canRunInParallel: z.boolean(),
  subtasks: z.array(z.string()).optional(),
})

export const fileSpecSchema = z.object({
  path: z.string(),
  purpose: z.string(),
  isNew: z.boolean(),
  dependencies: z.array(z.string()),
})

export const executionPlanSchema = z.object({
  intent: z.string().describe('One-sentence summary of what the user wants'),
  appType: z.string().nullable(),
  framework: z.string().describe('e.g. Next.js, React, Node.js'),
  parallelTaskGroups: z.array(
    z.object({
      groupId: z.string(),
      description: z.string(),
      tasks: z.array(executionTaskSchema),
      canRunInParallelWithOtherGroups: z.boolean(),
    })
  ),
  requiredFiles: z.array(fileSpecSchema),
  requiredPackages: z.array(z.string()),
  estimatedComplexity: z.enum(['low', 'medium', 'high']),
  architecturalDecisions: z.array(z.string()),
  successCriteria: z.array(z.string()),
})

export const fileDiffSchema = z.object({
  path: z.string(),
  action: z.enum(['create', 'modify', 'delete']),
  description: z.string(),
  reasoning: z.string(),
  codeSnippet: z.string().optional().describe('Key code pattern or snippet for this file'),
  importDependencies: z.array(z.string()),
})

export const problemSchema = z.object({
  id: z.string(),
  severity: z.enum(['critical', 'major', 'warning', 'info']),
  category: z.enum([
    'type-error',
    'missing-import',
    'broken-logic',
    'security',
    'performance',
    'accessibility',
    'edge-case',
    'missing-error-handling',
  ]),
  description: z.string(),
  affectedFiles: z.array(z.string()),
  suggestion: z.string(),
  autoFixable: z.boolean(),
})

export const historianContextSchema = z.object({
  relevantPastSessions: z.array(
    z.object({
      sessionId: z.string(),
      summary: z.string(),
      relevanceReason: z.string(),
      usefulPatterns: z.array(z.string()),
    })
  ),
  reusablePatterns: z.array(z.string()),
  commonPitfalls: z.array(z.string()),
  contextSummary: z.string(),
})

export const synthesisResultSchema = z.object({
  enhancedPlan: executionPlanSchema,
  criticalProblems: z.array(problemSchema),
  warnings: z.array(problemSchema),
  patchedDiffs: z.array(fileDiffSchema),
  executionDirective: z.string().describe('Precise instructions for the execution agent'),
  qualityGating: z.object({
    mustPassBeforeExecution: z.array(z.string()),
    mustPassAfterExecution: z.array(z.string()),
  }),
})

export type ExecutionPlan = z.infer<typeof executionPlanSchema>
export type FileDiff = z.infer<typeof fileDiffSchema>
export type Problem = z.infer<typeof problemSchema>
export type HistorianContext = z.infer<typeof historianContextSchema>
export type SynthesisResult = z.infer<typeof synthesisResultSchema>

export type AgentName = 'architect' | 'craftsman' | 'adversary' | 'historian' | 'synthesizer' | 'executor'

export interface AgentRunContext {
  sessionId: string
  projectId: string
  userId: string
  userPrompt: string
  conversationHistory: string
  projectContext: string
}
