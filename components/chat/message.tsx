import type { ChatUIMessage } from './types'
import { MessagePart } from './message-part'
import { BotIcon, UserIcon } from 'lucide-react'
import { memo, createContext, useContext, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

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
          'flex gap-3',
          message.role === 'assistant' ? 'justify-start' : 'justify-end'
        )}
      >
        {message.role === 'assistant' && (
          <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-xs">
            <BotIcon className="w-4 h-4" />
          </div>
        )}

        <div className="max-w-[min(680px,100%)] space-y-1.5">
          {/* Message Header */}
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-tight text-muted-foreground">
            <span className="uppercase">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </span>
            {message.role === 'assistant' && message.metadata?.model && (
              <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px]">
                {message.metadata.model}
              </span>
            )}
          </div>

          {/* Message Content */}
          <div className="space-y-1.5">
            {message.parts.map((part, index) => (
              <MessagePart key={index} part={part} partIndex={index} />
            ))}
          </div>
        </div>

        {message.role === 'user' && (
          <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
            <UserIcon className="w-4 h-4" />
          </div>
        )}
      </div>
    </ReasoningContext.Provider>
  )
})
