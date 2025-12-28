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
            <div className="flex items-center gap-3 pt-2">
              <button className="flex items-center justify-between w-full max-w-[320px] px-5 py-4 bg-[#DCE4F5] hover:bg-[#D0DAF0] rounded-[20px] transition-colors group shadow-sm text-left">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[15px] font-semibold text-[#1A1A1A] truncate">
                    {/* Fallback to a generic title if we can't find a better one */}
                    {message.parts.find(p => p.type === 'text')?.text?.split('\n')[0].replace(/[#*]/g, '').trim().substring(0, 40) || 'Updated version'}
                  </span>
                  <span className="text-[14px] text-[#4A4A4A]">Previewing latest version</span>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-[#1A1A1A]/30 group-hover:text-[#1A1A1A] transition-colors shrink-0" />
              </button>

              <button className="p-2.5 text-foreground/40 hover:text-foreground transition-colors">
                <BookmarkIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </ReasoningContext.Provider>
  )
})
