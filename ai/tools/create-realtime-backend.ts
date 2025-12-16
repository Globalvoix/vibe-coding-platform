import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { tool } from 'ai'
import description from './create-realtime-backend.md'
import z from 'zod/v3'
import { getSupabaseDatabaseQueryUrl } from '@/lib/supabase-platform'

const SUPABASE_REQUEST_TIMEOUT_MS = 30_000
const SUPABASE_MAX_RETRIES = 3
const SUPABASE_BASE_DELAY_MS = 500

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getBackoffDelayMs(attempt: number) {
  const jitter = Math.floor(Math.random() * 200)
  return SUPABASE_BASE_DELAY_MS * 2 ** attempt + jitter
}

function isRetryableFetchError(error: unknown) {
  if (!error) return false
  if (typeof error === 'object' && 'name' in error && error.name === 'AbortError') return true
  if (error instanceof TypeError && /fetch failed/i.test(error.message)) return true
  return false
}

function isLikelyReadOnlySql(sql: string) {
  const normalized = sql.trim().toLowerCase()
  return (
    normalized.startsWith('select') ||
    normalized.startsWith('with') ||
    normalized.startsWith('show') ||
    normalized.startsWith('explain')
  )
}

interface SupabaseConnectionInfo {
  accessToken: string
  projectRef: string
  projectName?: string
  organizationId?: string
  supabaseUrl?: string
}

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  projectId?: string
  supabaseConnected?: boolean
  supabaseConnection?: SupabaseConnectionInfo
}

const tableColumnSchema = z.object({
  name: z.string().describe('Column name'),
  type: z.enum([
    'text',
    'varchar',
    'integer',
    'bigint',
    'boolean',
    'timestamp',
    'timestamptz',
    'uuid',
    'json',
    'jsonb',
    'numeric',
    'real',
    'date',
    'time',
  ]).describe('Column data type'),
  nullable: z.boolean().optional().describe('Allow NULL values'),
  unique: z.boolean().optional().describe('Add unique constraint'),
  primaryKey: z.boolean().optional().describe('Mark as primary key'),
})

function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

function qualifyRoutineName(name: string) {
  const parts = name.split('.').filter(Boolean)
  if (parts.length === 1) return `public.${quoteIdent(parts[0])}`
  if (parts.length === 2) return `${quoteIdent(parts[0])}.${quoteIdent(parts[1])}`
  throw new Error('Invalid routine name')
}

function sqlStringLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`
}

async function executeSupabaseSql(params: {
  projectRef: string
  accessToken: string
  sql: string
  allowRetries: boolean
}) {
  const url = getSupabaseDatabaseQueryUrl(params.projectRef)

  for (let attempt = 0; attempt < SUPABASE_MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: params.sql }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const details = await response.text().catch(() => '')
        const retryableStatus = response.status >= 500 || response.status === 429
        const shouldRetry = params.allowRetries && retryableStatus && attempt < SUPABASE_MAX_RETRIES - 1

        if (shouldRetry) {
          await sleep(getBackoffDelayMs(attempt))
          continue
        }

        const message = `Supabase request failed (${response.status} ${response.statusText})`
        return { ok: false as const, message, details, status: response.status }
      }

      const result = await response.json().catch(() => null)
      return { ok: true as const, result }
    } catch (error) {
      const shouldRetry =
        params.allowRetries && isRetryableFetchError(error) && attempt < SUPABASE_MAX_RETRIES - 1

      if (shouldRetry) {
        await sleep(getBackoffDelayMs(attempt))
        continue
      }

      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        ok: false as const,
        message: `Supabase fetch failed: ${message}`,
        details: message,
        status: 503,
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return {
    ok: false as const,
    message: 'Supabase fetch failed after retries',
    details: 'Supabase fetch failed after retries',
    status: 503,
  }
}

export const createRealtimeBackend = ({ writer, projectId, supabaseConnected, supabaseConnection }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      action: z.enum([
        'create_table',
        'enable_realtime',
        'create_function',
        'execute_sql',
      ]).describe('Operation to perform'),
      table: z.object({
        name: z.string().describe('Table name'),
        columns: z.array(tableColumnSchema).describe('Table columns'),
      }).optional().describe('Table definition for create_table action'),
      table_name: z.string().optional().describe('Table name for enable_realtime action'),
      function: z.object({
        name: z.string().describe('Function name'),
        language: z.enum(['plpgsql', 'sql']).describe('Function language'),
        definition: z.string().describe('Function body/definition'),
        returns: z.string().optional().describe('Return type'),
      }).optional().describe('Function definition for create_function action'),
      query: z.string().optional().describe('Raw SQL query for execute_sql action'),
    }),
    execute: async (input, { toolCallId }) => {
      if (!projectId) {
        writer.write({
          id: toolCallId,
          type: 'data-create-realtime-backend',
          data: {
            status: 'error',
            message: 'Project ID not found',
          },
        })
        return
      }

      if (!supabaseConnected) {
        writer.write({
          id: toolCallId,
          type: 'data-create-realtime-backend',
          data: {
            status: 'error',
            message: 'Supabase is not connected to this project. Please connect a Supabase project first using the Supabase button in the chat toolbar.',
          },
        })
        return
      }

      writer.write({
        id: toolCallId,
        type: 'data-create-realtime-backend',
        data: { status: 'loading', action: input.action },
      })

      const accessToken = supabaseConnection?.accessToken?.trim()
      const projectRef = supabaseConnection?.projectRef?.trim()

      if (!accessToken || !projectRef) {
        writer.write({
          id: toolCallId,
          type: 'data-create-realtime-backend',
          data: {
            status: 'error',
            message:
              'Supabase connection is missing required credentials. Please reconnect Supabase for this project.',
          },
        })
        return
      }

      try {
        let sql: string | null = null

        if (input.action === 'create_table' && input.table) {
          const tableName = input.table.name
          const columns = input.table.columns
            .map((col) => {
              const parts: string[] = [quoteIdent(col.name), col.type]
              if (col.primaryKey) parts.push('PRIMARY KEY')
              if (!col.nullable) parts.push('NOT NULL')
              if (col.unique) parts.push('UNIQUE')
              return parts.join(' ')
            })
            .join(', ')

          sql = [
            `CREATE TABLE IF NOT EXISTS public.${quoteIdent(tableName)} (${columns});`,
            `ALTER TABLE public.${quoteIdent(tableName)} ENABLE ROW LEVEL SECURITY;`,
          ].join('\n')
        } else if (input.action === 'create_function' && input.function) {
          const routineName = qualifyRoutineName(input.function.name)
          sql = [
            `CREATE OR REPLACE FUNCTION ${routineName}()`,
            `RETURNS ${input.function.returns || 'void'}`,
            `LANGUAGE ${input.function.language}`,
            `AS $$`,
            input.function.definition,
            `$$;`,
          ].join('\n')
        } else if (input.action === 'enable_realtime' && input.table_name) {
          const tableName = input.table_name
          const tableNameLiteral = sqlStringLiteral(tableName)

          sql = [
            `DO $$`,
            `BEGIN`,
            `  IF NOT EXISTS (`,
            `    SELECT 1`,
            `    FROM pg_publication_tables`,
            `    WHERE pubname = 'supabase_realtime'`,
            `      AND schemaname = 'public'`,
            `      AND tablename = ${tableNameLiteral}`,
            `  ) THEN`,
            `    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', ${tableNameLiteral});`,
            `  END IF;`,
            `END`,
            `$$;`,
          ].join('\n')
        } else if (input.action === 'execute_sql' && input.query) {
          sql = input.query
        }

        if (!sql) {
          writer.write({
            id: toolCallId,
            type: 'data-create-realtime-backend',
            data: {
              status: 'error',
              message: 'Invalid backend operation request',
            },
          })
          return
        }

        const allowRetries =
          input.action !== 'execute_sql' || (input.query ? isLikelyReadOnlySql(input.query) : false)

        const result = await executeSupabaseSql({
          projectRef,
          accessToken,
          sql,
          allowRetries,
        })

        if (!result.ok) {
          writer.write({
            id: toolCallId,
            type: 'data-create-realtime-backend',
            data: {
              status: 'error',
              message: result.message,
              details: result.details,
            },
          })
          return
        }

        writer.write({
          id: toolCallId,
          type: 'data-create-realtime-backend',
          data: {
            status: 'success',
            action: input.action,
            message: `Successfully ${input.action.replace(/_/g, ' ')}`,
            result: result.result,
          },
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('[create-realtime-backend] Error:', message, error)
        writer.write({
          id: toolCallId,
          type: 'data-create-realtime-backend',
          data: {
            status: 'error',
            message: `Failed to execute operation: ${message}`,
          },
        })
      }
    },
  })
