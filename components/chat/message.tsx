import { ArrowUpRight, BookmarkIcon, ChevronRightIcon, Code2Icon } from 'lucide-react'
import type { ChatUIMessage } from './types'
import { MessagePart } from './message-part'
import { memo, createContext, useContext, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSandboxStore } from '@/app/state'

interface Props {
  message: ChatUIMessage
  projectId?: string | null
  isLatestVersionCard?: boolean
  onRevertInChat?: (versionId: string, anchorMessageId: string) => void
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

export const Message = memo(function Message({
  message,
  projectId,
  isLatestVersionCard = false,
  onRevertInChat,
  isLast,
  isGenerating,
}: Props) {
  const [expandedReasoningIndex, setExpandedReasoningIndex] = useState<
    number | null
  >(null)

  const {
    viewingVersion,
    revertInChatVersionId,
    setViewingVersion,
    setRevertInChatVersionId,
    applySandboxState,
  } = useSandboxStore()

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
          'flex gap-3 px-4 py-2',
          message.role === 'assistant' ? 'justify-start' : 'justify-end'
        )}
      >
        <div className={cn(
          "max-w-[min(800px,95%)] w-full space-y-1.5",
          message.role === 'user' && "flex flex-col items-end"
        )}>
          {/* Message Content */}
          <div className={cn(
            "space-y-3 w-fit",
            message.role === 'user' && "bg-[#F7F4ED] px-4 py-2.5 rounded-[22px] text-foreground/90 shadow-sm border border-black/[0.02] transition-all hover:shadow-md hover:border-black/[0.04]"
          )}>
            {message.parts.map((part, index) => (
              <MessagePart key={index} part={part} partIndex={index} />
            ))}
          </div>

          {/* Assistant Message Actions */}
          {(() => {
            if (message.role !== 'assistant' || isGenerating) return null

            const parts = message.parts ?? []

            type SandboxUrlPart = Extract<(typeof parts)[number], { type: 'data-get-sandbox-url' }>
            type TextPart = Extract<(typeof parts)[number], { type: 'text' }>
            type SandboxState = {
              sandboxId?: string
              paths?: string[]
              url?: string
            }

            const sandboxUrlPartData = parts
              .filter((part): part is SandboxUrlPart => part.type === 'data-get-sandbox-url')
              .map((part) => part.data)
              .find((data) => data.status === 'done' && typeof data.url === 'string')

            const sandboxUrl = sandboxUrlPartData?.url

            const hasPreviewCard = Boolean(sandboxUrl)

            if (!hasPreviewCard) return null

            const title =
              (parts.find((p): p is TextPart => p.type === 'text')?.text as string | undefined)
                ?.split('\n')[0]
                .replace(/[#*]/g, '')
                .trim()
                .substring(0, 40) || 'Updated version'

            const isSelected =
              Boolean(viewingVersion?.sandboxState?.url && viewingVersion.sandboxState.url === sandboxUrl)

            const subtitle = isLatestVersionCard ? 'Previewing latest version' : 'Preview this version'

            const cardClasses = cn(
              'flex items-center justify-between w-full px-4 py-3 rounded-lg border transition-colors group shadow-xs text-left',
              isLatestVersionCard
                ? 'bg-[#D2E3FC] hover:bg-[#C6DAFC] border-[#1A73E8]'
                : 'bg-[#F7F4ED] hover:bg-[#F0EDE5] border-black/[0.06]',
              isSelected && 'ring-1 ring-black/10'
            )

            const textPrimary = isLatestVersionCard ? 'text-[#0F172A]' : 'text-foreground'
            const textSecondary = isLatestVersionCard ? 'text-[#475569]' : 'text-foreground/65'

            const resolveAndSelectVersion = async () => {
              if (!projectId) return

              if (isLatestVersionCard) {
                setViewingVersion(null)
                setRevertInChatVersionId(null)
                try {
                  const res = await fetch(`/api/projects/${projectId}`)
                  if (res.ok) {
                    const data = (await res.json()) as { sandbox_state: SandboxState | null }
                    applySandboxState(data.sandbox_state ?? null)
                  }
                } catch {
                  // ignore
                }
                return
              }

              if (isSelected) {
                setViewingVersion(null)
                setRevertInChatVersionId(null)
                try {
                  const res = await fetch(`/api/projects/${projectId}`)
                  if (res.ok) {
                    const data = (await res.json()) as { sandbox_state: SandboxState | null }
                    applySandboxState(data.sandbox_state ?? null)
                  }
                } catch {
                  // ignore
                }
                return
              }

              try {
                const res = await fetch(`/api/projects/${projectId}/versions`)
                if (!res.ok) return
                const versions = (await res.json()) as Array<{
                  id: string
                  name: string
                  sandbox_state: SandboxState | null
                }>

                const matched = versions.find((v) => {
                  const state = v.sandbox_state
                  if (!state) return false
                  if (sandboxUrl && state.url && state.url === sandboxUrl) return true
                  return false
                })

                const sandboxState = matched?.sandbox_state ?? {
                  url: sandboxUrl,
                }

                setViewingVersion({
                  id: matched?.id ?? (sandboxUrl || String(message.id)),
                  name: title,
                  sandboxState,
                })
                setRevertInChatVersionId(null)
                applySandboxState(sandboxState)
              } catch {
                // ignore
              }
            }

            const showRevertPanel =
              isSelected &&
              Boolean(viewingVersion?.id) &&
              revertInChatVersionId === viewingVersion?.id &&
              typeof onRevertInChat === 'function'

            return (
              <div className="flex flex-col gap-2 pt-1.5 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-full max-w-[290px]">
                    <button onClick={resolveAndSelectVersion} className={cardClasses}>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className={cn('text-[13px] font-semibold truncate', textPrimary)}>
                          {title}
                        </span>
                        <span className={cn('text-[12px] font-medium', textSecondary)}>{subtitle}</span>
                      </div>
                      <ChevronRightIcon
                        className={cn(
                          'w-5 h-5 transition-colors shrink-0',
                          isLatestVersionCard
                            ? 'text-[#0F172A]/30 group-hover:text-[#0F172A]'
                            : 'text-foreground/25 group-hover:text-foreground/60'
                        )}
                      />
                    </button>

                    {/* Code Button overlapping bottom right */}
                    <button className="absolute -bottom-2 -right-2 flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F9F8F6] rounded-md border border-black/[0.08] shadow-sm transition-colors text-[11px] font-semibold text-[#475569] group/code">
                      <Code2Icon className="w-3 h-3 text-[#475569]/60 group-hover/code:text-[#475569]" />
                      <span>Code</span>
                    </button>
                  </div>

                  <button className="p-2 text-[#0F172A]/30 hover:text-[#0F172A]/60 hover:bg-black/5 rounded-md transition-colors">
                    <BookmarkIcon className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>

                {showRevertPanel && (
                  <div className="w-full max-w-[520px] rounded-lg border border-black/[0.06] bg-[#F7F4ED] px-4 py-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground/90">
                          Revert to this version?
                        </p>
                        <p className="text-[12px] text-foreground/70 mt-1 leading-[1.4]">
                          This will revert your project to how it looked at that point. Messages after this version will be removed.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (sandboxUrl) window.open(sandboxUrl, '_blank')
                        }}
                        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground/70 hover:text-foreground transition-colors shrink-0"
                        title="Preview version"
                      >
                        <span>Preview version</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRevertInChatVersionId(null)}
                        className="flex-1 h-9 rounded-lg border border-black/[0.06] bg-white/60 hover:bg-white text-[13px] font-semibold text-foreground/80 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => onRevertInChat?.(viewingVersion!.id, String(message.id))}
                        className="flex-1 h-9 rounded-lg bg-[#111827] hover:bg-black text-white text-[13px] font-semibold transition-colors"
                      >
                        Revert
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    </ReasoningContext.Provider>
  )
})
