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
import type { GenerationSessionTracker } from '@/lib/generation-session-tracker'

interface Params {
  modelId: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  userId: string
  projectId?: string | null
  sessionId?: string
  sessionTracker?: GenerationSessionTracker | null
}

export function tools({ modelId, writer, userId, projectId, sessionId, sessionTracker }: Params) {
  return {
    createSandbox: createSandbox({ writer, sessionTracker }),
    generateFiles: generateFiles({ writer, modelId, sessionTracker, projectId: projectId ?? undefined, sessionId }),
    getSandboxURL: getSandboxURL({ writer, sessionTracker }),
    runCommand: runCommand({ writer, sessionTracker }),
    requestSupabaseConnection: requestSupabaseConnection({ writer, projectId: projectId ?? undefined }),
    requestEnvVars: requestEnvVars({ writer, projectId: projectId ?? undefined }),
    webSearch: webSearch({ projectId: projectId ?? undefined }),
    webScrape: webScrape({ projectId: projectId ?? undefined }),
  }
}

export type ToolSet = InferUITools<ReturnType<typeof tools>>
