import { LightbulbIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import type { ReasoningUIPart } from 'ai'
import { MarkdownRenderer } from '@/components/markdown-renderer/markdown-renderer'
import { MessageSpinner } from '../message-spinner'
import { useReasoningContext } from '../message'
import { cn } from '@/lib/utils'

export function Reasoning({
  part,
  partIndex,
}: {
  part: ReasoningUIPart
  partIndex: number
}) {
  const context = useReasoningContext()
  const isExpanded = context?.expandedReasoningIndex === partIndex

  if (part.state === 'done' && !part.text) {
    return null
  }

  const text = part.text || 'Thinking...'
  const isStreaming = part.state === 'streaming'

  // Try to extract a clean title or just use "Thought"
  const firstLine = text.split('\n')[0].replace(/\*\*/g, '').trim()
  const displayTitle = firstLine && firstLine.length < 60 ? firstLine : 'Thought'

  const handleClick = () => {
    if (context) {
      const newIndex = isExpanded ? null : partIndex
      context.setExpandedReasoningIndex(newIndex)
    }
  }

  return (
    <div className="flex flex-col gap-2 my-2">
      <button
        onClick={handleClick}
        className="flex items-center gap-2 text-[#8A8A85] hover:text-foreground transition-colors group w-fit"
      >
        <div className="flex items-center gap-1.5 text-[13px] font-medium">
          <LightbulbIcon className="w-3.5 h-3.5" />
          <span>{isStreaming ? 'Thinking...' : 'Thought'}</span>
          {isExpanded ? (
            <ChevronUpIcon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
          ) : (
            <ChevronDownIcon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="text-[14px] leading-relaxed text-foreground/80 font-sans pl-5 border-l border-border/60 ml-1.5 py-1">
          <MarkdownRenderer content={text} />
          {isStreaming && <MessageSpinner />}
        </div>
      )}
    </div>
  )
}
