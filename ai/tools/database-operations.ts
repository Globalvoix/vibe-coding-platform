import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import type { SupabaseConnectionInfo } from './index'
import { tool } from 'ai'
import z from 'zod/v3'
import { executeSupabaseSQL } from '@/ai/tools/supabase-helper'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  supabaseConnection?: SupabaseConnectionInfo
}

export function databaseOperations({ writer, supabaseConnection }: Params) {
  return {
    executeQuery: tool({
      description:
        'Execute an arbitrary SQL query on the connected Supabase database. Use for SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, and other SQL operations.',
      inputSchema: z.object({
        query: z
          .string()
          .describe('The SQL query to execute (e.g., SELECT * FROM users WHERE id = $1)'),
        description: z
          .string()
          .optional()
          .describe('Optional description of what this query does, for user feedback'),
      }),
      execute: async ({ query, description }, { toolCallId }) => {
        if (!supabaseConnection) {
          return 'Error: No Supabase database connected. Please connect a Supabase project first.'
        }

        try {
          const result = await executeSupabaseSQL(supabaseConnection, query)

          const resultText = Array.isArray(result)
            ? `${result.length} rows returned`
            : 'Query executed successfully'

          return `✓ ${description || 'Query executed'}\n\n${resultText}\n\nResult:\n${JSON.stringify(result, null, 2)}`
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          return `✗ Query failed: ${errorMessage}`
        }
      },
    }),

    createTable: tool({
      description: 'Create a new table in the connected Supabase database with specified columns.',
      inputSchema: z.object({
        tableName: z.string().describe('Name of the table to create'),
        columns: z
          .array(
            z.object({
              name: z.string().describe('Column name'),
              type: z
                .enum([
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
                ])
                .describe('Column data type (PostgreSQL type)'),
              nullable: z.boolean().optional().default(true).describe('Allow NULL values'),
              primaryKey: z.boolean().optional().default(false).describe('Mark as primary key'),
              unique: z.boolean().optional().default(false).describe('Add unique constraint'),
              default: z
                .string()
                .optional()
                .describe('Default value (e.g., uuid_generate_v4(), now(), false)'),
            })
          )
          .describe('Array of column definitions'),
        description: z
          .string()
          .optional()
          .describe('Optional description of what this table is for'),
      }),
      execute: async ({ tableName, columns, description }, { toolCallId }) => {
        if (!supabaseConnection) {
          return 'Error: No Supabase database connected.'
        }

        try {
          const columnDefs = columns
            .map((col) => {
              let def = `"${col.name}" ${col.type}`
              if (col.primaryKey) def += ' PRIMARY KEY'
              if (col.unique) def += ' UNIQUE'
              if (!col.nullable) def += ' NOT NULL'
              if (col.default) def += ` DEFAULT ${col.default}`
              return def
            })
            .join(',\n  ')

          const sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (
  ${columnDefs}
);`

          await executeSupabaseSQL(supabaseConnection, sql)

          // Enable RLS by default
          const rlsSql = `ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`
          await executeSupabaseSQL(supabaseConnection, rlsSql)

          return `✓ Table "${tableName}" created successfully with RLS enabled.\n${description || ''}`
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          return `✗ Failed to create table: ${errorMessage}`
        }
      },
    }),

    listTables: tool({
      description: 'List all tables in the connected Supabase database.',
      inputSchema: z.object({}),
      execute: async ({}, { toolCallId }) => {
        if (!supabaseConnection) {
          return 'Error: No Supabase database connected.'
        }

        try {
          const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
          const result = (await executeSupabaseSQL(
            supabaseConnection,
            sql
          )) as Array<{ table_name: string }>

          const tables = result.map((row) => row.table_name)
          const tableList = tables.length > 0 ? tables.join(', ') : 'No tables found'

          return `✓ Database tables:\n${tableList}`
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          return `✗ Failed to list tables: ${errorMessage}`
        }
      },
    }),

    getTableSchema: tool({
      description: 'Inspect the schema (columns and types) of an existing table.',
      inputSchema: z.object({
        tableName: z.string().describe('Name of the table to inspect'),
      }),
      execute: async ({ tableName }, { toolCallId }) => {
        if (!supabaseConnection) {
          return 'Error: No Supabase database connected.'
        }

        try {
          const sql = `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${tableName}' AND table_schema = 'public' ORDER BY ordinal_position;`

          const result = (await executeSupabaseSQL(
            supabaseConnection,
            sql
          )) as Array<{
            column_name: string
            data_type: string
            is_nullable: string
            column_default: string | null
          }>

          const schema = result.reduce(
            (acc, row) => {
              acc[row.column_name] = {
                type: row.data_type,
                nullable: row.is_nullable === 'YES',
                default: row.column_default,
              }
              return acc
            },
            {} as Record<string, unknown>
          )

          return `✓ Table schema for "${tableName}":\n\n${JSON.stringify(schema, null, 2)}`
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          return `✗ Failed to get table schema: ${errorMessage}`
        }
      },
    }),

    insertData: tool({
      description: 'Insert a row of data into a table.',
      inputSchema: z.object({
        tableName: z.string().describe('Name of the table to insert into'),
        data: z
          .record(z.any())
          .describe('Object with column names as keys and values to insert'),
        description: z
          .string()
          .optional()
          .describe('Optional description of what is being inserted'),
      }),
      execute: async ({ tableName, data, description }, { toolCallId }) => {
        if (!supabaseConnection) {
          return 'Error: No Supabase database connected.'
        }

        try {
          const columns = Object.keys(data)
          const values = Object.values(data)
          const columnList = columns.map((col) => `"${col}"`).join(', ')
          const valuePlaceholders = values
            .map((val) => {
              if (val === null) return 'NULL'
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
              if (typeof val === 'boolean') return val ? 'true' : 'false'
              if (typeof val === 'number') return String(val)
              return `'${JSON.stringify(val)}'`
            })
            .join(', ')

          const sql = `INSERT INTO "${tableName}" (${columnList}) VALUES (${valuePlaceholders}) RETURNING *;`

          const result = await executeSupabaseSQL(supabaseConnection, sql)

          return `✓ ${description || 'Data inserted successfully'}\n\nInserted row:\n${JSON.stringify(result, null, 2)}`
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          return `✗ Failed to insert data: ${errorMessage}`
        }
      },
    }),

    updateData: tool({
      description: 'Update rows in a table with a WHERE condition.',
      inputSchema: z.object({
        tableName: z.string().describe('Name of the table to update'),
        data: z.record(z.any()).describe('Columns and new values to set'),
        where: z
          .record(z.any())
          .optional()
          .describe('WHERE conditions (e.g., { id: "uuid-value" })'),
        description: z
          .string()
          .optional()
          .describe('Optional description of what is being updated'),
      }),
      execute: async ({ tableName, data, where, description }, { toolCallId }) => {
        if (!supabaseConnection) {
          return 'Error: No Supabase database connected.'
        }

        try {
          const updateClauses = Object.entries(data)
            .map(([key, val]) => {
              let value: string
              if (val === null) value = 'NULL'
              else if (typeof val === 'string') value = `'${val.replace(/'/g, "''")}'`
              else if (typeof val === 'boolean') value = val ? 'true' : 'false'
              else if (typeof val === 'number') value = String(val)
              else value = `'${JSON.stringify(val)}'`

              return `"${key}" = ${value}`
            })
            .join(', ')

          let whereClause = ''
          if (where && Object.keys(where).length > 0) {
            whereClause =
              ' WHERE ' +
              Object.entries(where)
                .map(([key, val]) => {
                  let value: string
                  if (val === null) value = 'NULL'
                  else if (typeof val === 'string') value = `'${val.replace(/'/g, "''")}'`
                  else if (typeof val === 'boolean') value = val ? 'true' : 'false'
                  else if (typeof val === 'number') value = String(val)
                  else value = `'${JSON.stringify(val)}'`

                  return `"${key}" = ${value}`
                })
                .join(' AND ')
          }

          const sql = `UPDATE "${tableName}" SET ${updateClauses}${whereClause} RETURNING *;`

          const result = await executeSupabaseSQL(supabaseConnection, sql)

          return `✓ ${description || 'Data updated successfully'}\n\nUpdated rows:\n${JSON.stringify(result, null, 2)}`
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          return `✗ Failed to update data: ${errorMessage}`
        }
      },
    }),

    deleteData: tool({
      description: 'Delete rows from a table with a WHERE condition.',
      inputSchema: z.object({
        tableName: z.string().describe('Name of the table to delete from'),
        where: z
          .record(z.any())
          .optional()
          .describe('WHERE conditions (e.g., { id: "uuid-value" })'),
        description: z
          .string()
          .optional()
          .describe('Optional description of what is being deleted'),
      }),
      execute: async ({ tableName, where, description }, { toolCallId }) => {
        if (!supabaseConnection) {
          return 'Error: No Supabase database connected.'
        }

        try {
          let whereClause = ''
          if (where && Object.keys(where).length > 0) {
            whereClause =
              ' WHERE ' +
              Object.entries(where)
                .map(([key, val]) => {
                  let value: string
                  if (val === null) value = 'NULL'
                  else if (typeof val === 'string') value = `'${val.replace(/'/g, "''")}'`
                  else if (typeof val === 'boolean') value = val ? 'true' : 'false'
                  else if (typeof val === 'number') value = String(val)
                  else value = `'${JSON.stringify(val)}'`

                  return `"${key}" = ${value}`
                })
                .join(' AND ')
          }

          const sql = `DELETE FROM "${tableName}"${whereClause};`

          await executeSupabaseSQL(supabaseConnection, sql)

          return `✓ ${description || 'Data deleted successfully'}`
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          return `✗ Failed to delete data: ${errorMessage}`
        }
      },
    }),

    runMigration: tool({
      description: 'Execute one or more SQL statements as a database migration.',
      inputSchema: z.object({
        sql: z
          .string()
          .describe('SQL statements separated by semicolons (e.g., "ALTER TABLE ... ; CREATE INDEX ...")'),
        description: z
          .string()
          .optional()
          .describe('Optional description of the migration'),
      }),
      execute: async ({ sql, description }, { toolCallId }) => {
        if (!supabaseConnection) {
          return 'Error: No Supabase database connected.'
        }

        try {
          const statements = sql
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)

          for (const statement of statements) {
            await executeSupabaseSQL(supabaseConnection, statement)
          }

          return `✓ ${description || 'Migration completed successfully'}\n\nExecuted ${statements.length} statement(s)`
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          return `✗ Migration failed: ${errorMessage}`
        }
      },
    }),
  }
}
