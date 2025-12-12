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

  return (
    <ToolMessage>
      <ToolHeader>
        <Zap className="w-3.5 h-3.5" />
        Real-time Backend
      </ToolHeader>
      <div className="relative pl-6 min-h-5">
        <Spinner
          className="absolute left-0 top-0"
          loading={message.status === 'loading'}
        >
          {message.status === 'error' ? (
            <XIcon className="w-4 h-4 text-red-700" />
          ) : (
            <CheckIcon className="w-4 h-4" />
          )}
        </Spinner>
        <div>
          <span>
            {message.status === 'loading' && `${actionLabel}...`}
            {message.status === 'success' && message.message}
            {message.status === 'error' && `Error: ${message.message}`}
          </span>
          {message.details && message.status === 'error' && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {message.details}
            </p>
          )}
        </div>
      </div>
    </ToolMessage>
  )
}
