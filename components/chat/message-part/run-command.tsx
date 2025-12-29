import type { DataPart } from '@/ai/messages/data-parts'
import { TerminalIcon, CheckIcon, XIcon } from 'lucide-react'
import { Spinner } from './spinner'
import { ToolHeader } from '../tool-header'
import { ToolMessage } from '../tool-message'
import { cn } from '@/lib/utils'

export function RunCommand({ message }: { message: DataPart['run-command'] }) {
  const isPending = ['executing', 'waiting'].includes(message.status)
  const isError = (message.exitCode && message.exitCode > 0) || message.status === 'error'
  const isDone = message.status === 'done' || message.status === 'running'

  return (
    <ToolMessage className="transition-all duration-300">
      <div className="flex items-center justify-between group py-0.5">
        <ToolHeader className="mb-0">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-3.5 h-3.5 text-foreground/40" />
            <span className="font-mono text-[11px] font-bold bg-black/[0.04] px-1.5 py-0.5 rounded border border-black/[0.06] text-foreground/60">
              {message.command.split(' ')[0]}
            </span>
            <span className="text-[13px] font-medium text-foreground/70">
              {isDone && !isError ? 'Finished' : isError ? 'Failed' : 'Running...'}
            </span>
          </div>
        </ToolHeader>
        <div className="flex items-center gap-2">
          {isPending ? (
            <Spinner loading={true} className="w-3.5 h-3.5" />
          ) : isError ? (
            <XIcon className="w-3.5 h-3.5 text-red-500/70" strokeWidth={3} />
          ) : (
            <CheckIcon className="w-3.5 h-3.5 text-green-500/50" strokeWidth={3} />
          )}
        </div>
      </div>
    </ToolMessage>
  )
}
