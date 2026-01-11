import type { InferUITools, UIMessage, UIMessageStreamWriter } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { createSandbox } from './create-sandbox'
import { generateFiles } from './generate-files'
import { getSandboxURL } from './get-sandbox-url'
import { runCommand } from './run-command'
import { requestSupabaseConnection } from './request-supabase-connection'
import { requestEnvVars } from './request-env-vars'
import { webSearch } from './web-search'
import { webScrape } from './web-scrape'

interface Params {
  modelId: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  userId: string
  projectId?: string
}

export function tools({ modelId, writer, userId, projectId }: Params) {
  return {
    createSandbox: createSandbox({ writer }),
    generateFiles: generateFiles({ writer, modelId, userId, projectId }),
    getSandboxURL: getSandboxURL({ writer }),
    runCommand: runCommand({ writer }),
    requestSupabaseConnection: requestSupabaseConnection({ writer, projectId }),
    requestEnvVars: requestEnvVars({ writer, projectId }),
    webSearch: webSearch({ writer, projectId }),
    webScrape: webScrape({ writer, projectId }),
  }
}

export type ToolSet = InferUITools<ReturnType<typeof tools>>
