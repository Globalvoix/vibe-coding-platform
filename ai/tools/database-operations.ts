import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import type { SupabaseConnectionInfo } from './index'
import { executeSupabaseSQL } from '@/ai/tools/supabase-helper'

export function databaseOperations({
  writer,
  supabaseConnection,
}: {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  supabaseConnection?: SupabaseConnectionInfo
}) {
  return {
    executeQuery: async (params: {
      query: string
      description?: string
    }): Promise<{
      success: boolean
      result?: unknown
      error?: string
      rowsAffected?: number
    }> => {
      if (!supabaseConnection) {
        return {
          success: false,
          error: 'No Supabase database connected. Please connect a Supabase project first.',
        }
      }

      try {
        const description = params.description || 'Executing database query'
        
        writer.writeMessagePart({
          type: 'tool-header',
          toolName: 'executeQuery',
          toolInput: {
            query: params.query,
            description,
          },
        })

        // Execute the query
        const result = await executeSupabaseSQL(supabaseConnection, params.query)

        // Determine rows affected for mutation operations
        let rowsAffected: number | undefined
        if (Array.isArray(result) && result.length > 0) {
          rowsAffected = result.length
        }

        writer.writeMessagePart({
          type: 'text',
          text: `✓ Query executed successfully.\n${description}\n\nResult: ${JSON.stringify(result, null, 2)}`,
        })

        return {
          success: true,
          result,
          rowsAffected,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        writer.writeMessagePart({
          type: 'text',
          text: `✗ Query failed: ${errorMessage}`,
        })

        return {
          success: false,
          error: errorMessage,
        }
      }
    },

    createTable: async (params: {
      tableName: string
      columns: Array<{
        name: string
        type: string
        nullable?: boolean
        primaryKey?: boolean
        unique?: boolean
        default?: string
      }>
      description?: string
    }): Promise<{
      success: boolean
      error?: string
    }> => {
      if (!supabaseConnection) {
        return {
          success: false,
          error: 'No Supabase database connected.',
        }
      }

      try {
        const description = params.description || `Creating table "${params.tableName}"`
        
        writer.writeMessagePart({
          type: 'tool-header',
          toolName: 'createTable',
          toolInput: {
            tableName: params.tableName,
            columns: params.columns,
            description,
          },
        })

        // Build column definitions
        const columnDefs = params.columns
          .map((col) => {
            let def = `"${col.name}" ${col.type}`
            if (col.primaryKey) def += ' PRIMARY KEY'
            if (col.unique) def += ' UNIQUE'
            if (!col.nullable) def += ' NOT NULL'
            if (col.default) def += ` DEFAULT ${col.default}`
            return def
          })
          .join(',\n  ')

        const sql = `CREATE TABLE IF NOT EXISTS "${params.tableName}" (
  ${columnDefs}
);`

        await executeSupabaseSQL(supabaseConnection, sql)

        // Enable RLS by default
        const rlsSql = `ALTER TABLE "${params.tableName}" ENABLE ROW LEVEL SECURITY;`
        await executeSupabaseSQL(supabaseConnection, rlsSql)

        writer.writeMessagePart({
          type: 'text',
          text: `✓ Table "${params.tableName}" created successfully with RLS enabled.`,
        })

        return { success: true }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        writer.writeMessagePart({
          type: 'text',
          text: `✗ Failed to create table: ${errorMessage}`,
        })

        return {
          success: false,
          error: errorMessage,
        }
      }
    },

    getTableSchema: async (params: {
      tableName: string
    }): Promise<{
      success: boolean
      schema?: Record<string, unknown>
      error?: string
    }> => {
      if (!supabaseConnection) {
        return {
          success: false,
          error: 'No Supabase database connected.',
        }
      }

      try {
        writer.writeMessagePart({
          type: 'tool-header',
          toolName: 'getTableSchema',
          toolInput: { tableName: params.tableName },
        })

        const sql = `
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '${params.tableName}'
AND table_schema = 'public'
ORDER BY ordinal_position;`

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

        writer.writeMessagePart({
          type: 'text',
          text: `✓ Table schema for "${params.tableName}":\n\n${JSON.stringify(schema, null, 2)}`,
        })

        return {
          success: true,
          schema,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        writer.writeMessagePart({
          type: 'text',
          text: `✗ Failed to get table schema: ${errorMessage}`,
        })

        return {
          success: false,
          error: errorMessage,
        }
      }
    },

    listTables: async (): Promise<{
      success: boolean
      tables?: string[]
      error?: string
    }> => {
      if (!supabaseConnection) {
        return {
          success: false,
          error: 'No Supabase database connected.',
        }
      }

      try {
        writer.writeMessagePart({
          type: 'tool-header',
          toolName: 'listTables',
          toolInput: {},
        })

        const sql = `
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;`

        const result = (await executeSupabaseSQL(
          supabaseConnection,
          sql
        )) as Array<{ table_name: string }>

        const tables = result.map((row) => row.table_name)

        writer.writeMessagePart({
          type: 'text',
          text: `✓ Database tables: ${tables.length > 0 ? tables.join(', ') : 'No tables found'}`,
        })

        return {
          success: true,
          tables,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        writer.writeMessagePart({
          type: 'text',
          text: `✗ Failed to list tables: ${errorMessage}`,
        })

        return {
          success: false,
          error: errorMessage,
        }
      }
    },

    insertData: async (params: {
      tableName: string
      data: Record<string, unknown>
      description?: string
    }): Promise<{
      success: boolean
      result?: unknown
      error?: string
    }> => {
      if (!supabaseConnection) {
        return {
          success: false,
          error: 'No Supabase database connected.',
        }
      }

      try {
        const description = params.description || `Inserting data into "${params.tableName}"`
        
        writer.writeMessagePart({
          type: 'tool-header',
          toolName: 'insertData',
          toolInput: {
            tableName: params.tableName,
            description,
          },
        })

        const columns = Object.keys(params.data)
        const values = Object.values(params.data)
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

        const sql = `INSERT INTO "${params.tableName}" (${columnList})
VALUES (${valuePlaceholders})
RETURNING *;`

        const result = await executeSupabaseSQL(supabaseConnection, sql)

        writer.writeMessagePart({
          type: 'text',
          text: `✓ Data inserted successfully.\n${description}`,
        })

        return {
          success: true,
          result,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        writer.writeMessagePart({
          type: 'text',
          text: `✗ Failed to insert data: ${errorMessage}`,
        })

        return {
          success: false,
          error: errorMessage,
        }
      }
    },

    updateData: async (params: {
      tableName: string
      data: Record<string, unknown>
      where?: Record<string, unknown>
      description?: string
    }): Promise<{
      success: boolean
      result?: unknown
      error?: string
    }> => {
      if (!supabaseConnection) {
        return {
          success: false,
          error: 'No Supabase database connected.',
        }
      }

      try {
        const description = params.description || `Updating data in "${params.tableName}"`
        
        writer.writeMessagePart({
          type: 'tool-header',
          toolName: 'updateData',
          toolInput: {
            tableName: params.tableName,
            description,
          },
        })

        const updateClauses = Object.entries(params.data)
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
        if (params.where && Object.keys(params.where).length > 0) {
          whereClause = ' WHERE ' + Object.entries(params.where)
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

        const sql = `UPDATE "${params.tableName}"
SET ${updateClauses}${whereClause}
RETURNING *;`

        const result = await executeSupabaseSQL(supabaseConnection, sql)

        writer.writeMessagePart({
          type: 'text',
          text: `✓ Data updated successfully.\n${description}`,
        })

        return {
          success: true,
          result,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        writer.writeMessagePart({
          type: 'text',
          text: `✗ Failed to update data: ${errorMessage}`,
        })

        return {
          success: false,
          error: errorMessage,
        }
      }
    },

    deleteData: async (params: {
      tableName: string
      where?: Record<string, unknown>
      description?: string
    }): Promise<{
      success: boolean
      rowsDeleted?: number
      error?: string
    }> => {
      if (!supabaseConnection) {
        return {
          success: false,
          error: 'No Supabase database connected.',
        }
      }

      try {
        const description = params.description || `Deleting data from "${params.tableName}"`
        
        writer.writeMessagePart({
          type: 'tool-header',
          toolName: 'deleteData',
          toolInput: {
            tableName: params.tableName,
            description,
          },
        })

        let whereClause = ''
        if (params.where && Object.keys(params.where).length > 0) {
          whereClause = ' WHERE ' + Object.entries(params.where)
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

        const sql = `DELETE FROM "${params.tableName}"${whereClause};`

        await executeSupabaseSQL(supabaseConnection, sql)

        writer.writeMessagePart({
          type: 'text',
          text: `✓ Data deleted successfully.\n${description}`,
        })

        return {
          success: true,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        writer.writeMessagePart({
          type: 'text',
          text: `✗ Failed to delete data: ${errorMessage}`,
        })

        return {
          success: false,
          error: errorMessage,
        }
      }
    },

    runMigration: async (params: {
      sql: string
      description?: string
    }): Promise<{
      success: boolean
      error?: string
    }> => {
      if (!supabaseConnection) {
        return {
          success: false,
          error: 'No Supabase database connected.',
        }
      }

      try {
        const description = params.description || 'Running database migration'
        
        writer.writeMessagePart({
          type: 'tool-header',
          toolName: 'runMigration',
          toolInput: {
            description,
          },
        })

        // Split by semicolons and execute each statement
        const statements = params.sql
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)

        for (const statement of statements) {
          await executeSupabaseSQL(supabaseConnection, statement)
        }

        writer.writeMessagePart({
          type: 'text',
          text: `✓ Migration completed successfully.\n${description}`,
        })

        return { success: true }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        writer.writeMessagePart({
          type: 'text',
          text: `✗ Migration failed: ${errorMessage}`,
        })

        return {
          success: false,
          error: errorMessage,
        }
      }
    },
  }
}
