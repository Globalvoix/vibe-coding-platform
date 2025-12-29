import { BookmarkIcon, ChevronRightIcon, Code2Icon } from 'lucide-react'
import type { ChatUIMessage } from './types'
import { MessagePart } from './message-part'
import { memo, createContext, useContext, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  message: ChatUIMessage
  isLast?: boolean
  isGenerating?: boolean
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

export const Message = memo(function Message({ message, isLast, isGenerating }: Props) {
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
            "space-y-5 w-fit",
            message.role === 'user' && "bg-[#F7F4ED] px-6 py-3.5 rounded-[28px] text-foreground/90 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] border border-black/[0.02] transition-all hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.06)] hover:border-black/[0.04]"
          )}>
            {message.parts.map((part, index) => (
              <MessagePart key={index} part={part} partIndex={index} />
            ))}
          </div>

          {/* Assistant Message Actions */}
          {message.role === 'assistant' && message.parts.some(p => p.type.startsWith('data-')) && !isGenerating && (
            <div className="flex items-center gap-2.5 pt-2 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="relative w-full max-w-[290px]">
                <button className="flex items-center justify-between w-full px-4 py-3 bg-[#D2E3FC] hover:bg-[#C6DAFC] rounded-xl border border-[#1A73E8] transition-colors group shadow-sm text-left">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[13px] font-bold text-[#0F172A] truncate">
                      {/* Fallback to a generic title if we can't find a better one */}
                      {message.parts.find(p => p.type === 'text')?.text?.split('\n')[0].replace(/[#*]/g, '').trim().substring(0, 40) || 'Updated version'}
                    </span>
                    <span className="text-[12px] text-[#475569] font-medium">Previewing latest version</span>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-[#0F172A]/30 group-hover:text-[#0F172A] transition-colors shrink-0" />
                </button>

                {/* Code Button overlapping bottom right */}
                <button className="absolute -bottom-2 -right-2 flex items-center gap-1 px-2.5 py-1 bg-[#F7F4ED] hover:bg-[#EFECE5] rounded-md border border-black/5 shadow-sm transition-colors text-[11px] font-semibold text-[#475569] group/code">
                  <Code2Icon className="w-3 h-3 text-[#475569]/70 group-hover/code:text-[#475569]" />
                  <span>Code</span>
                </button>
              </div>

              <button className="p-2 text-[#0F172A]/30 hover:text-[#0F172A]/60 hover:bg-black/5 rounded-md transition-colors">
                <BookmarkIcon className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </ReasoningContext.Provider>
  )
})
