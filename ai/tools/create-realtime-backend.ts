import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { tool } from 'ai'
import description from './create-realtime-backend.md'
import z from 'zod/v3'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  projectId?: string
  supabaseConnected?: boolean
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

export const createRealtimeBackend = ({ writer, projectId, supabaseConnected }: Params) =>
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

      try {
        const response = await fetch(
          `/api/projects/${projectId}/supabase-schema`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
          }
        )

        if (!response.ok) {
          const error = await response.json()
          writer.write({
            id: toolCallId,
            type: 'data-create-realtime-backend',
            data: {
              status: 'error',
              message: error.error || 'Failed to create backend',
              details: error.details,
            },
          })
          return
        }

        const result = await response.json()

        writer.write({
          id: toolCallId,
          type: 'data-create-realtime-backend',
          data: {
            status: 'success',
            action: input.action,
            message: `Successfully ${input.action.replace(/_/g, ' ')}`,
            result,
          },
        })
      } catch (error) {
        writer.write({
          id: toolCallId,
          type: 'data-create-realtime-backend',
          data: {
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      }
    },
  })
