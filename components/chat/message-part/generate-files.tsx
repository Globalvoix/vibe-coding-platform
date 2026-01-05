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

  const currentFile = generating || (props.message.paths[props.message.paths.length - 1] ?? '')

  return (
    <ToolMessage className={cn("transition-all duration-300 border-none bg-transparent p-0", props.className)}>
      <div className="flex items-center justify-between group py-1.5">
        <div className="flex items-center gap-2">
          <div className="relative w-4 h-4 flex items-center justify-center">
            {!isDone && (
              <div className="absolute w-full h-full rounded-full bg-black/[0.05] animate-pulse"></div>
            )}
            <FileCodeIcon className="w-3.5 h-3.5 text-foreground/40" />
          </div>
          <span className="text-[14px] font-medium text-[#8A8A85]">
            {isDone
              ? `${totalFiles} edit${totalFiles !== 1 ? 's' : ''} made`
              : `Editing ${currentFile}`}
          </span>
        </div>
        {totalFiles > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[13px] font-medium px-2 py-0.5 rounded text-foreground/40 hover:text-foreground/70 hover:bg-black/[0.03] transition-all border border-black/[0.05]"
          >
            {isExpanded ? 'Hide' : 'Show all'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200 pl-6">
          {generated.map((path) => (
            <div className="flex items-center gap-2 text-[13px] text-[#8A8A85] py-0.5" key={'gen' + path}>
              <div className="flex items-center gap-1.5">
                <FileCodeIcon className="w-3 h-3 opacity-40" />
                <span className="font-medium opacity-60">Edited</span>
              </div>
              <span className="truncate font-sans text-[13px] opacity-80">{path}</span>
            </div>
          ))}
          {typeof generating === 'string' && (
            <div className="flex items-center gap-2 text-[13px] text-[#8A8A85] py-0.5">
              <div className="flex items-center gap-1.5">
                <div className="relative w-3 h-3 flex items-center justify-center">
                  <div className="absolute w-full h-full rounded-full bg-black/[0.05] animate-pulse"></div>
                  <FileCodeIcon className="w-3 h-3 opacity-40" />
                </div>
                <span className="font-medium opacity-60">Editing</span>
              </div>
              <span className="truncate font-sans text-[13px] opacity-80">{generating}</span>
            </div>
          )}
        </div>
      )}
    </ToolMessage>
  )
}
