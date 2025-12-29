import type { DataPart } from '@/ai/messages/data-parts'
import { TerminalIcon, CheckIcon, XIcon } from 'lucide-react'
import { Spinner } from './spinner'
import { ToolHeader } from '../tool-header'
import { ToolMessage } from '../tool-message'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function RunCommand({ message }: { message: DataPart['run-command'] }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isPending = ['executing', 'waiting'].includes(message.status)
  const isError = (message.exitCode && message.exitCode > 0) || message.status === 'error'
  const isDone = message.status === 'done' || message.status === 'running'

  const baseCommand = message.command.split(' ')[0]
  const fullCommand = [message.command, ...message.args].join(' ')

  return (
    <ToolMessage className="transition-all duration-300">
      <div className="flex items-center justify-between group py-0.5">
        <ToolHeader className="mb-0">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-3.5 h-3.5 text-foreground/40" />
            <span className="font-mono text-[11px] font-bold bg-black/[0.04] px-1.5 py-0.5 rounded border border-black/[0.06] text-foreground/60">
              {baseCommand}
            </span>
            <span className="text-[13px] font-medium text-foreground/70">
              {isDone && !isError ? 'Finished' : isError ? 'Failed' : 'Running...'}
            </span>
          </div>
        </ToolHeader>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[12px] font-medium px-2 py-0.5 rounded hover:bg-black/5 text-foreground/40 hover:text-foreground/70 transition-all flex items-center gap-1.5"
          >
            {isExpanded ? 'Hide' : 'Show all'}
          </button>
          {isPending ? (
            <Spinner loading={true} className="w-3.5 h-3.5" />
          ) : isError ? (
            <XIcon className="w-3.5 h-3.5 text-red-500/70" strokeWidth={3} />
          ) : (
            <CheckIcon className="w-3.5 h-3.5 text-green-500/50" strokeWidth={3} />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pl-2.5 space-y-1.5 border-l border-border/40 ml-1.5 py-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start text-[13px] text-foreground/50 hover:text-foreground/80 transition-colors">
            <span className="font-mono text-[12px] bg-black/[0.03] px-2 py-1 rounded border border-black/[0.05] break-all whitespace-pre-wrap">
              {fullCommand}
            </span>
          </div>
        </div>
      )}
    </ToolMessage>
  )
}
