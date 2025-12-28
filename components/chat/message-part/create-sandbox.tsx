import type { DataPart } from '@/ai/messages/data-parts'
import { BoxIcon, CheckIcon, XIcon } from 'lucide-react'
import { Spinner } from './spinner'
import { ToolHeader } from '../tool-header'
import { ToolMessage } from '../tool-message'

interface Props {
  message: DataPart['create-sandbox']
}

export function CreateSandbox({ message }: Props) {
  return (
    <ToolMessage>
      <div className="flex items-center justify-between">
        <ToolHeader className="mb-0">
          <BoxIcon className="w-3.5 h-3.5" />
          <span>
            {message.status === 'done' && 'Sandbox created'}
            {message.status === 'loading' && 'Creating sandbox...'}
            {message.status === 'error' && 'Failed to create sandbox'}
          </span>
        </ToolHeader>
        <div className="flex items-center gap-2">
          {message.status === 'loading' ? (
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
