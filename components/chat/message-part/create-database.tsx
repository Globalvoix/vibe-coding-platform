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
      <div className="flex items-center justify-between">
        <ToolHeader className="mb-0">
          <DatabaseIcon className="w-3.5 h-3.5" />
          <span>
            {message.status === 'creating' && 'Creating database...'}
            {message.status === 'success' && `Database created: ${message.tableName}`}
            {message.status === 'error' && 'Failed to create database'}
          </span>
        </ToolHeader>
        <div className="flex items-center gap-2">
          {message.status === 'creating' ? (
            <Spinner loading={true} className="w-3.5 h-3.5" />
          ) : message.status === 'error' ? (
            <XIcon className="w-3.5 h-3.5 text-red-500/70" />
          ) : (
            <CheckIcon className="w-3.5 h-3.5 text-green-500/70" />
          )}
        </div>
      </div>
    </ToolMessage>
  )
}
