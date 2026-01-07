import z from 'zod/v3'

export const errorSchema = z.object({
  message: z.string(),
})

export const dataPartSchema = z.object({
  'create-sandbox': z.object({
    sandboxId: z.string().optional(),
    status: z.enum(['loading', 'done', 'error']),
    error: errorSchema.optional(),
  }),
  'generating-files': z.object({
    paths: z.array(z.string()),
    status: z.enum(['generating', 'uploading', 'uploaded', 'done', 'error']),
    error: errorSchema.optional(),
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
})

export type DataPart = z.infer<typeof dataPartSchema>
