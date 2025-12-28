import type { DataPart } from '@/ai/messages/data-parts'
import { CheckIcon, FileCodeIcon, XIcon, ChevronRightIcon, ChevronDownIcon } from 'lucide-react'
import { Spinner } from './spinner'
import { ToolHeader } from '../tool-header'
import { ToolMessage } from '../tool-message'
import { useState } from 'react'

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

  return (
    <ToolMessage className={props.className}>
      <div className="flex items-center justify-between group">
        <ToolHeader className="mb-0">
          <FileCodeIcon className="w-3.5 h-3.5" />
          <span>
            {props.message.status === 'done'
              ? `${totalFiles} edit${totalFiles !== 1 ? 's' : ''} made`
              : `Generating ${totalFiles} file${totalFiles !== 1 ? 's' : ''}...`}
          </span>
        </ToolHeader>
        {totalFiles > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[12px] text-foreground/40 hover:text-foreground transition-colors flex items-center gap-1"
          >
            {isExpanded ? 'Hide' : 'Show all'}
            {isExpanded ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-2 pl-5 space-y-1 border-l border-border/60 ml-1.5 py-1">
          {generated.map((path) => (
            <div className="flex items-center text-[13px] text-foreground/60" key={'gen' + path}>
              <CheckIcon className="w-3.5 h-3.5 mr-2 text-green-500/70" />
              <span className="whitespace-pre-wrap">{path}</span>
            </div>
          ))}
          {typeof generating === 'string' && (
            <div className="flex items-center text-[13px] text-foreground/60">
              <Spinner
                className="mr-2"
                loading={props.message.status !== 'error'}
              >
                {props.message.status === 'error' ? (
                  <XIcon className="w-3.5 h-3.5 text-red-500/70" />
                ) : (
                  <CheckIcon className="w-3.5 h-3.5" />
                )}
              </Spinner>
              <span>{generating}</span>
            </div>
          )}
        </div>
      )}
    </ToolMessage>
  )
}
