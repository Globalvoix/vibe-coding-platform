import { LightbulbIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import type { ReasoningUIPart } from 'ai'
import { MarkdownRenderer } from '@/components/markdown-renderer/markdown-renderer'
import { MessageSpinner } from '../message-spinner'
import { useReasoningContext } from '../message'
import { useState, useEffect } from 'react'

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
    <div className="flex flex-col gap-2 my-2">
      <button
        onClick={handleClick}
        className="flex items-center gap-2 text-[#8A8A85] hover:text-foreground/70 transition-colors group w-fit"
      >
        <div className="flex items-center gap-1.5 text-[13px] font-medium">
          {isStreaming && (
            <div className="relative w-3.5 h-3.5 flex items-center justify-center">
              <div className="absolute w-full h-full rounded-full bg-gradient-to-r from-blue-400/80 to-blue-400/20 animate-pulse"></div>
              <LightbulbIcon className="w-2.5 h-2.5 relative z-10 text-blue-500" />
            </div>
          )}
          {!isStreaming && <LightbulbIcon className="w-3.5 h-3.5" />}
          <span>
            {isStreaming ? `Thinking for ${formatDuration(duration)}` : 'Thought'}
          </span>
          {isExpanded ? (
            <ChevronUpIcon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
          ) : (
            <ChevronDownIcon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="text-[13px] leading-[1.6] text-foreground/75 font-sans pl-5 border-l border-border/30 ml-1.5 py-2">
          <MarkdownRenderer content={text} />
          {isStreaming && <MessageSpinner />}
        </div>
      )}
    </div>
  )
}
