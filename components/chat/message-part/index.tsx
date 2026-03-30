import type { Metadata } from '@/ai/messages/metadata'
import type { DataPart } from '@/ai/messages/data-parts'
import type { ToolSet } from '@/ai/tools'
import type { UIMessage } from 'ai'
import { GenerateFiles } from './generate-files'
import { CreateSandbox } from './create-sandbox'
import { GetSandboxURL } from './get-sandbox-url'
import { RunCommand } from './run-command'
import { ReportErrors } from './report-errors'
import { Reasoning } from './reasoning'
import { Text } from './text'
import { ConnectSupabase } from './connect-supabase'
import { RequestEnvVars } from './request-env-vars'
import { AgentPipeline } from './agent-pipeline'
import { PendingDiffPart } from './pending-diff'
import { memo } from 'react'
import type { AgentName } from '@/app/state'

interface Props {
  part: UIMessage<Metadata, DataPart, ToolSet>['parts'][number]
  partIndex: number
}

export const MessagePart = memo(function MessagePart({
  part,
  partIndex,
}: Props) {
  if (part.type === 'data-generating-files') {
    return <GenerateFiles message={part.data} />
  } else if (part.type === 'data-create-sandbox') {
    return null
  } else if (part.type === 'data-get-sandbox-url') {
    return <GetSandboxURL message={part.data} />
  } else if (part.type === 'data-run-command') {
    return null
  } else if (part.type === 'reasoning') {
    return <Reasoning part={part} partIndex={partIndex} />
  } else if (part.type === 'data-report-errors') {
    return <ReportErrors message={part.data} />
  } else if (part.type === 'data-connect-supabase') {
    return <ConnectSupabase message={part.data} />
  } else if (part.type === 'data-request-env-vars') {
    return <RequestEnvVars message={part.data} />
  } else if (part.type === 'text') {
    return <Text part={part} />
  } else if (part.type === 'data-agent-status') {
    return <AgentPipeline agentName={part.data.agentName as AgentName} />
  } else if (part.type === 'data-pending-diff') {
    return (
      <PendingDiffPart
        pendingId={part.data.pendingId}
        sandboxId={part.data.sandboxId}
        sessionId={part.data.sessionId}
        projectId={part.data.projectId}
        diffs={part.data.diffs}
        totalFiles={part.data.totalFiles}
        summary={part.data.summary}
      />
    )
  }
  return null
})
