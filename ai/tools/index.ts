import type { InferUITools, UIMessage, UIMessageStreamWriter } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { createSandbox } from './create-sandbox'
import { generateFiles } from './generate-files'
import { getSandboxURL } from './get-sandbox-url'
import { runCommand } from './run-command'
import { createRealtimeBackend } from './create-realtime-backend'
import { createDatabase } from './create-database'
import { databaseOperations } from './database-operations'

export interface SupabaseConnectionInfo {
  accessToken: string
  projectRef: string
  projectName?: string
  organizationId?: string
  supabaseUrl?: string
  anonKey?: string
}

interface Params {
  modelId: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  userId?: string
  projectId?: string
  supabaseConnected?: boolean
  supabaseConnection?: SupabaseConnectionInfo
  envVars?: Record<string, string>
}

export function tools({
  modelId,
  writer,
  userId,
  projectId,
  supabaseConnected,
  supabaseConnection,
  envVars,
}: Params) {
  return {
    createSandbox: createSandbox({ writer, userId, projectId }),
    generateFiles: generateFiles({ writer, modelId, userId, projectId, envVars }),
    getSandboxURL: getSandboxURL({ writer }),
    runCommand: runCommand({ writer, userId, projectId }),
    createRealtimeBackend: createRealtimeBackend({
      writer,
      projectId,
      supabaseConnected,
      supabaseConnection,
    }),
    createDatabase: createDatabase({ writer, supabaseConnection }),
    ...databaseOperations({
      writer,
      supabaseConnection,
    }),
  }
}

export type ToolSet = InferUITools<ReturnType<typeof tools>>
