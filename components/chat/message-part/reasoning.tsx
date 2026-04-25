import { LightbulbIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import type { ReasoningUIPart } from 'ai'
import { MarkdownRenderer } from '@/components/markdown-renderer/markdown-renderer'
import { MessageSpinner } from '../message-spinner'
import { useReasoningContext } from '../message'
import { useState, useEffect } from 'react'
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
  const [duration, setDuration] = useState(0)

  const text = part.text || 'Thinking...'
  const isStreaming = part.state === 'streaming'

  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      setDuration((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isStreaming])

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m${secs}s`
  }

  const handleClick = () => {
    if (context) {
      const newIndex = isExpanded ? null : partIndex
      context.setExpandedReasoningIndex(newIndex)
    }
  }

  if (part.state === 'done' && !part.text) {
    return null
  }

  return (
    <div className="flex flex-col gap-2 my-1">
      <button
        onClick={handleClick}
        className="flex items-center gap-2 text-[#8A8A85] hover:text-foreground/70 transition-colors group w-fit"
      >
        <div className="flex items-center gap-1.5 text-[14px] font-medium">
          <div className="relative w-4 h-4 flex items-center justify-center">
            {isStreaming ? (
              <div className="absolute w-full h-full rounded-full bg-black/[0.05] animate-pulse"></div>
            ) : null}
            <LightbulbIcon className={cn("w-3.5 h-3.5", isStreaming ? "text-foreground/40" : "text-[#8A8A85]")} />
          </div>
          <span className="text-[#8A8A85]">
            {isStreaming ? 'Thinking' : `Thought for ${formatDuration(duration)}`}
          </span>
          {!isStreaming && (
            isExpanded ? (
              <ChevronUpIcon className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
            ) : (
              <ChevronDownIcon className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
            )
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="text-[14px] leading-[1.6] text-foreground/80 font-sans py-1">
          <MarkdownRenderer content={text} />
          {isStreaming && <MessageSpinner />}
        </div>
      )}
    </div>
  )
}
