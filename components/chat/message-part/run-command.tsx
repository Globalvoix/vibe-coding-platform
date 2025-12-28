import type { DataPart } from '@/ai/messages/data-parts'
import { TerminalIcon, CheckIcon, XIcon, ClockIcon } from 'lucide-react'
import { Spinner } from './spinner'
import { ToolHeader } from '../tool-header'
import { ToolMessage } from '../tool-message'

export function RunCommand({ message }: { message: DataPart['run-command'] }) {
  const isPending = ['executing', 'waiting'].includes(message.status)
  const isError = (message.exitCode && message.exitCode > 0) || message.status === 'error'

  return (
    <ToolMessage>
      <div className="flex items-center justify-between">
        <ToolHeader className="mb-0">
          <TerminalIcon className="w-3.5 h-3.5" />
          <span className="font-mono text-[12px] bg-secondary/50 px-1.5 py-0.5 rounded border border-border/40">
            {message.command}
          </span>
          <span className="ml-1 text-foreground/50">
            {message.status === 'executing' && 'Executing...'}
            {message.status === 'waiting' && 'Waiting...'}
            {message.status === 'running' && 'Running...'}
            {message.status === 'done' && !isError && 'Finished'}
            {isError && 'Failed'}
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
    </ToolMessage>
  )
}
