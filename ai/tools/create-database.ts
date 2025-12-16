import { tool } from 'ai'
import z from 'zod/v3'
import type { UIMessage, UIMessageStreamWriter } from 'ai'
import type { DataPart } from '../messages/data-parts'
import {
  createProjectDatabase,
  generateSupabaseClientCode,
  type SupabaseConnectionParams,
} from '@/lib/supabase-db'
import type { SupabaseConnectionInfo } from './index'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  supabaseConnection?: SupabaseConnectionInfo
}

const description = `Automatically create a Supabase database for the generated application.
This tool should be called when the generated app needs to store or retrieve data.
It creates a database table and returns configuration needed for the app.`

export const createDatabase = ({ writer, supabaseConnection }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      projectId: z
        .string()
        .describe('Unique project ID for the application'),
      appName: z
        .string()
        .describe('Name of the application for context'),
      reason: z
        .string()
        .optional()
        .describe('Why this app needs a database (e.g., "store user notes")'),
    }),
    execute: async ({ projectId, appName, reason }, { toolCallId }) => {
      const supabaseConnectionParams: SupabaseConnectionParams | undefined =
        supabaseConnection && supabaseConnection.projectRef && supabaseConnection.anonKey
          ? {
              projectRef: supabaseConnection.projectRef,
              anonKey: supabaseConnection.anonKey,
            }
          : undefined
      writer.write({
        id: toolCallId,
        type: 'data-creating-database',
        data: {
          status: 'creating',
          projectId,
          appName,
          reason,
        },
      })

      try {
        const result = await createProjectDatabase(projectId, appName)

        if (!result.success) {
          writer.write({
            id: toolCallId,
            type: 'data-creating-database',
            data: {
              status: 'error',
              error: { message: result.error || 'Failed to create database' },
              projectId,
            },
          })

          return `Failed to create database: ${result.error}`
        }

        const tableName = result.schema?.name || `${projectId}_app_data`

        writer.write({
          id: toolCallId,
          type: 'data-creating-database',
          data: {
            status: 'success',
            projectId,
            tableName,
            reason,
          },
        })

        return `Database successfully created for ${appName}. Table name: ${tableName}. Include the Supabase client code from lib/supabase.ts in your generated files.`
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        writer.write({
          id: toolCallId,
          type: 'data-creating-database',
          data: {
            status: 'error',
            error: { message: errorMessage },
            projectId,
          },
        })

        return `Error creating database: ${errorMessage}`
      }
    },
  })
