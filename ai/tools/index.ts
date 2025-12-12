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
  projectId?: string
  supabaseConnected?: boolean
}

export function tools({ modelId, writer, projectId, supabaseConnected }: Params) {
  return {
    createSandbox: createSandbox({ writer }),
    generateFiles: generateFiles({ writer, modelId }),
    getSandboxURL: getSandboxURL({ writer }),
    runCommand: runCommand({ writer }),
    createRealtimeBackend: createRealtimeBackend({ writer, projectId, supabaseConnected }),
  }
}

export type ToolSet = InferUITools<ReturnType<typeof tools>>
