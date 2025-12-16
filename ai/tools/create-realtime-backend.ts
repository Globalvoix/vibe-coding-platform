import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { tool } from 'ai'
import description from './create-realtime-backend.md'
import z from 'zod/v3'
import { getSupabaseDatabaseQueryUrl } from '@/lib/supabase-platform'

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

async function executeSupabaseSql(params: {
  projectRef: string
  accessToken: string
  sql: string
}) {
  const response = await fetch(getSupabaseDatabaseQueryUrl(params.projectRef), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: params.sql }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    const message = `Supabase request failed (${response.status} ${response.statusText})`
    return { ok: false as const, message, details }
  }

  const result = await response.json().catch(() => null)
  return { ok: true as const, result }
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
          const publicationTable = `public.${quoteIdent(tableName)}`
          sql = [
            `DO $$`,
            `BEGIN`,
            `  IF NOT EXISTS (`,
            `    SELECT 1`,
            `    FROM pg_publication_tables`,
            `    WHERE pubname = 'supabase_realtime'`,
            `      AND schemaname = 'public'`,
            `      AND tablename = ${''}${''}${''}${''}${''}${''}${''}${''}`,
            `  ) THEN`,
            `    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE ${publicationTable};';`,
            `  END IF;`,
            `END`,
            `$$;`,
          ].join('\n')
            .replace(
              `${''}${''}${''}${''}${''}${''}${''}${''}`,
              `'${tableName.replace(/'/g, "''")}'`
            )
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

        const result = await executeSupabaseSql({ projectRef, accessToken, sql })

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
