import type { DataPart } from '@/ai/messages/data-parts'
import { Database, CheckIcon, XIcon, Zap } from 'lucide-react'
import { Spinner } from './spinner'
import { ToolHeader } from '../tool-header'
import { ToolMessage } from '../tool-message'

interface Props {
  message: DataPart['create-realtime-backend']
}

const actionLabels: Record<string, string> = {
  create_table: 'Creating table',
  enable_realtime: 'Enabling real-time',
  create_function: 'Creating function',
  execute_sql: 'Executing SQL',
}

export function CreateRealtimeBackend({ message }: Props) {
  const actionLabel = message.action ? actionLabels[message.action] : 'Managing backend'
  const isPending = message.status === 'loading'
  const isError = message.status === 'error'

  return (
    <ToolMessage>
      <div className="flex items-center justify-between">
        <ToolHeader className="mb-0">
          <Zap className="w-3.5 h-3.5" />
          <span>
            {isPending && `${actionLabel}...`}
            {!isPending && !isError && 'Backend updated'}
            {isError && 'Backend error'}
          </span>
        </ToolHeader>
        <div className="flex items-center gap-2">
          {isPending ? (
            <Spinner loading={true} className="w-3.5 h-3.5" />
          ) : isError ? (
            <XIcon className="w-3.5 h-3.5 text-red-500/70" />
          ) : (
            <CheckIcon className="w-3.5 h-3.5 text-green-500/70" />
          )}
        </div>
      </div>

      {message.message && !isPending && (
        <div className="mt-2 pl-5 text-[13px] text-foreground/60 border-l border-border/60 ml-1.5 py-1">
          {message.message}
          {message.details && isError && (
            <p className="text-[12px] opacity-70 mt-1 font-mono bg-red-500/5 p-1 rounded">
              {message.details}
            </p>
          )}
        </div>
      )}
    </ToolMessage>
  )
}
