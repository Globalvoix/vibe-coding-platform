import { LightbulbIcon, ChevronDownIcon, ChevronUpIcon, CodeIcon, BookmarkIcon, PlayIcon, ChevronRightIcon } from 'lucide-react'
import type { ChatUIMessage } from './types'
import { MessagePart } from './message-part'
import { memo, createContext, useContext, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Props {
  message: ChatUIMessage
}

interface ReasoningContextType {
  expandedReasoningIndex: number | null
  setExpandedReasoningIndex: (index: number | null) => void
}

const ReasoningContext = createContext<ReasoningContextType | null>(null)

export const useReasoningContext = () => {
  const context = useContext(ReasoningContext)
  return context
}

export const Message = memo(function Message({ message }: Props) {
  const [expandedReasoningIndex, setExpandedReasoningIndex] = useState<
    number | null
  >(null)

  const reasoningParts = message.parts
    .map((part, index) => ({ part, index }))
    .filter(({ part }) => part.type === 'reasoning')

  useEffect(() => {
    if (reasoningParts.length > 0) {
      const latestReasoningIndex =
        reasoningParts[reasoningParts.length - 1].index
      setExpandedReasoningIndex(latestReasoningIndex)
    }
  }, [reasoningParts])

  return (
    <ReasoningContext.Provider
      value={{ expandedReasoningIndex, setExpandedReasoningIndex }}
    >
      <div
        className={cn(
          'flex gap-3 px-4 py-3',
          message.role === 'assistant' ? 'justify-start' : 'justify-end'
        )}
      >
        <div className={cn(
          "max-w-[min(800px,95%)] w-full space-y-2",
          message.role === 'user' && "flex flex-col items-end"
        )}>
          {/* Message Content */}
          <div className={cn(
            "space-y-3 w-fit",
            message.role === 'user' && "bg-[#F4F4F1] px-4 py-2.5 rounded-[22px] text-foreground/90 shadow-sm border border-border/40"
          )}>
            {message.parts.map((part, index) => (
              <MessagePart key={index} part={part} partIndex={index} />
            ))}
          </div>

          {/* Assistant Message Actions */}
          {message.role === 'assistant' && message.parts.some(p => p.type.startsWith('data-')) && (
            <div className="flex items-center gap-2 pt-2">
              <div className="flex items-center gap-0.5 bg-[#F4F4F1] rounded-xl border border-border/40 overflow-hidden shadow-sm">
                <button className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium hover:bg-black/5 transition-colors">
                  <span>Preview this version</span>
                  <ChevronRightIcon className="w-3.5 h-3.5 opacity-50" />
                </button>
              </div>
              <button className="p-2 bg-[#F4F4F1] rounded-xl border border-border/40 shadow-sm hover:bg-black/5 transition-colors">
                <BookmarkIcon className="w-3.5 h-3.5 text-foreground/60" />
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 bg-[#F4F4F1] rounded-xl border border-border/40 shadow-sm hover:bg-black/5 transition-colors text-[13px] font-medium text-foreground/70">
                <CodeIcon className="w-3.5 h-3.5" />
                <span>Code</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </ReasoningContext.Provider>
  )
})
