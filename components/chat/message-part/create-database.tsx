import type { DataPart } from '@/ai/messages/data-parts'
import type { DataPart } from '@/ai/messages/data-parts'
import { DatabaseIcon, CheckIcon, XIcon } from 'lucide-react'
import { Spinner } from './spinner'
import { ToolHeader } from '../tool-header'
import { ToolMessage } from '../tool-message'

interface Props {
  message: DataPart['creating-database']
}

export function CreateDatabase({ message }: Props) {
  return (
    <ToolMessage>
      <ToolHeader>
        <DatabaseIcon className="w-3.5 h-3.5" />
        Create Database
      </ToolHeader>
      <div className="relative pl-6 min-h-5">
        <Spinner
          className="absolute left-0 top-0"
          loading={message.status === 'creating'}
        >
          {message.status === 'error' ? (
            <XIcon className="w-4 h-4 text-red-700" />
          ) : (
            <CheckIcon className="w-4 h-4" />
          )}
        </Spinner>
        <div>
          <span>
            {message.status === 'creating' && `Creating database for ${message.appName || 'app'}`}
            {message.status === 'success' && `Database created: ${message.tableName}`}
            {message.status === 'error' && `Failed to create database: ${message.error?.message || 'unknown error'}`}
          </span>
          {message.reason && message.status === 'success' && (
            <p className="text-xs text-muted-foreground mt-1">Reason: {message.reason}</p>
          )}
        </div>
      </div>
    </ToolMessage>
  )
}
