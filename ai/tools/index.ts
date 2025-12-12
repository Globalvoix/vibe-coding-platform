import type { InferUITools, UIMessage, UIMessageStreamWriter } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { createSandbox } from './create-sandbox'
import { generateFiles } from './generate-files'
import { getSandboxURL } from './get-sandbox-url'
import { runCommand } from './run-command'
import { createRealtimeBackend } from './create-realtime-backend'

interface Params {
  modelId: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  userId?: string
  projectId?: string
  supabaseConnected?: boolean
}

export function tools({ modelId, writer, userId, projectId, supabaseConnected }: Params) {
  return {
    createSandbox: createSandbox({ writer, userId, projectId }),
    generateFiles: generateFiles({ writer, modelId, userId, projectId }),
    getSandboxURL: getSandboxURL({ writer }),
    runCommand: runCommand({ writer, userId, projectId }),
    createRealtimeBackend: createRealtimeBackend({ writer, projectId, supabaseConnected }),
  }
}

export type ToolSet = InferUITools<ReturnType<typeof tools>>
