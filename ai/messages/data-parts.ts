import z from 'zod/v3'

export const errorSchema = z.object({
  message: z.string(),
  json: z.unknown().optional(),
  text: z.string().optional(),
})

export const dataPartSchema = z.object({
  'create-sandbox': z.object({
    sandboxId: z.string().optional(),
    status: z.enum(['loading', 'done', 'error']),
    error: errorSchema.optional(),
  }),
  'generating-files': z.object({
    paths: z.array(z.string()),
    status: z.enum(['analyzing', 'generating', 'uploading', 'uploaded', 'validating', 'done', 'error']),
    error: errorSchema.optional(),
    message: z.string().optional(),
  }),
  'run-command': z.object({
    sandboxId: z.string(),
    commandId: z.string().optional(),
    command: z.string(),
    args: z.array(z.string()),
    status: z.enum(['executing', 'running', 'waiting', 'done', 'error']),
    exitCode: z.number().optional(),
    error: errorSchema.optional(),
  }),
  'get-sandbox-url': z.object({
    url: z.string().optional(),
    status: z.enum(['loading', 'done']),
  }),
  'report-errors': z.object({
    summary: z.string(),
    paths: z.array(z.string()).optional(),
  }),
  'connect-supabase': z.object({
    projectId: z.string().optional(),
  }),
  'request-env-vars': z.object({
    projectId: z.string().optional(),
    requiredVars: z.array(z.object({
      key: z.string(),
      description: z.string(),
    })).optional(),
    reason: z.string().optional(),
  }),

  // ── File content streamed to Monaco editor ──────────────────────────────
  'file-content': z.object({
    sandboxId: z.string(),
    path: z.string(),
    content: z.string(),
  }),

  // ── Multi-agent pipeline data parts ────────────────────────────────────
  'agent-status': z.object({
    agentName: z.enum(['architect', 'craftsman', 'adversary', 'historian', 'synthesizer', 'executor']),
    status: z.enum(['starting', 'running', 'done', 'error']),
    message: z.string().optional(),
    durationMs: z.number().optional(),
  }),
  'adversary-findings': z.object({
    problems: z.array(z.object({
      severity: z.enum(['critical', 'major', 'warning', 'info']),
      category: z.string(),
      description: z.string(),
      affectedFiles: z.array(z.string()),
      suggestion: z.string(),
    })),
    overallRisk: z.enum(['low', 'medium', 'high', 'critical']),
    riskSummary: z.string(),
  }),
  'synthesis-ready': z.object({
    criticalProblemsPatched: z.number(),
    warningsCount: z.number(),
    filesPlanned: z.number(),
    executionDirectiveReady: z.boolean(),
  }),

  // ── Diff preview — shown to user before code is applied ─────────────────
  'pending-diff': z.object({
    pendingId: z.string(),
    sandboxId: z.string(),
    sessionId: z.string(),
    projectId: z.string(),
    diffs: z.array(z.object({
      path: z.string(),
      action: z.enum(['create', 'modify', 'delete']),
      content: z.string(),
      description: z.string(),
    })),
    totalFiles: z.number(),
    summary: z.string(),
  }),
  'diff-decision': z.object({
    pendingId: z.string(),
    decision: z.enum(['approved', 'rejected']),
    appliedFiles: z.number().optional(),
  }),

  // ── Parallel subtask thread ─────────────────────────────────────────────
  'subtask-thread': z.object({
    threadId: z.string(),
    groupId: z.string(),
    description: z.string(),
    status: z.enum(['starting', 'running', 'done', 'error']),
    filesHandled: z.array(z.string()),
  }),

  // ── Execution retry ─────────────────────────────────────────────────────
  'execution-retry': z.object({
    attempt: z.number(),
    maxAttempts: z.number(),
    reason: z.string(),
    fixApplied: z.string().optional(),
  }),
})

export type DataPart = z.infer<typeof dataPartSchema>
