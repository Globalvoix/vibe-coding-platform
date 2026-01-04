import type { DataPart } from '@/ai/messages/data-parts'
import { CheckIcon, FileCodeIcon, XIcon } from 'lucide-react'
import { Spinner } from './spinner'
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
      <div className="flex items-center justify-between group py-1">
        <div className="flex items-center gap-2">
          <FileCodeIcon className="w-3.5 h-3.5 text-foreground/40" />
          <span className="text-[13px] font-medium text-foreground/65">
            {isDone
              ? `${totalFiles} edit${totalFiles !== 1 ? 's' : ''} made`
              : `Editing ${totalFiles} file${totalFiles !== 1 ? 's' : ''}...`}
          </span>
        </div>
        {totalFiles > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[12px] font-medium px-2.5 py-1 rounded text-foreground/50 hover:text-foreground/75 hover:bg-black/[0.04] transition-all"
          >
            {isExpanded ? 'Hide' : 'Show all'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {generated.map((path) => (
            <div className="flex items-center gap-2 text-[12px] text-foreground/60 px-1" key={'gen' + path}>
              <CheckIcon className="w-3 h-3 flex-shrink-0 text-green-500/60" strokeWidth={3} />
              <span className="truncate font-mono text-[11px]">{path}</span>
            </div>
          ))}
          {typeof generating === 'string' && (
            <div className="flex items-center gap-2 text-[12px] text-foreground/50 px-1">
              <div className="flex items-center justify-center w-3 h-3 flex-shrink-0">
                {props.message.status === 'error' ? (
                  <XIcon className="w-3 h-3 text-red-500/60" />
                ) : (
                  <Spinner
                    className="w-2 h-2"
                    loading={true}
                  />
                )}
              </div>
              <span className="truncate font-mono text-[11px] italic opacity-70">{generating}</span>
            </div>
          )}
        </div>
      )}
    </ToolMessage>
  )
}
