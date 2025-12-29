import type { DataPart } from '@/ai/messages/data-parts'
import { CheckIcon, FileCodeIcon, XIcon, ChevronRightIcon, ChevronDownIcon } from 'lucide-react'
import { Spinner } from './spinner'
import { ToolHeader } from '../tool-header'
import { ToolMessage } from '../tool-message'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function GenerateFiles(props: {
  className?: string
  message: DataPart['generating-files']
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const lastInProgress = ['error', 'uploading', 'generating'].includes(
    props.message.status
  )

  const generated = lastInProgress
    ? props.message.paths.slice(0, props.message.paths.length - 1)
    : props.message.paths

  const generating = lastInProgress
    ? props.message.paths[props.message.paths.length - 1] ?? ''
    : null

  const totalFiles = props.message.paths.length
  const isDone = props.message.status === 'done'

  return (
    <ToolMessage className={cn("transition-all duration-300", props.className)}>
      <div className="flex items-center justify-between group py-0.5">
        <ToolHeader className="mb-0">
          <div className="flex items-center gap-2">
            <FileCodeIcon className="w-3.5 h-3.5 text-foreground/40" />
            <span className="text-[13px] font-medium text-foreground/70">
              {isDone
                ? `${totalFiles} edit${totalFiles !== 1 ? 's' : ''} made`
                : `Generating ${totalFiles} file${totalFiles !== 1 ? 's' : ''}...`}
            </span>
          </div>
        </ToolHeader>
        {totalFiles > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[12px] font-medium px-2 py-0.5 rounded hover:bg-black/5 text-foreground/40 hover:text-foreground/70 transition-all flex items-center gap-1.5"
          >
            {isExpanded ? 'Hide all' : 'Show all'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-3 pl-2.5 space-y-1.5 border-l border-border/40 ml-1.5 py-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {generated.map((path) => (
            <div className="flex items-center text-[13px] text-foreground/50 hover:text-foreground/80 transition-colors" key={'gen' + path}>
              <CheckIcon className="w-3.5 h-3.5 mr-2.5 text-green-500/50" strokeWidth={3} />
              <span className="truncate font-mono text-[12px] bg-black/[0.03] px-1.5 py-0.5 rounded border border-black/[0.05]">{path}</span>
            </div>
          ))}
          {typeof generating === 'string' && (
            <div className="flex items-center text-[13px] text-foreground/50">
              <div className="mr-2.5 flex items-center justify-center w-3.5 h-3.5">
                {props.message.status === 'error' ? (
                  <XIcon className="w-3.5 h-3.5 text-red-500/70" />
                ) : (
                  <Spinner
                    className="w-3 h-3"
                    loading={true}
                  />
                )}
              </div>
              <span className="truncate font-mono text-[12px] italic opacity-70">{generating}</span>
            </div>
          )}
        </div>
      )}
    </ToolMessage>
  )
}
