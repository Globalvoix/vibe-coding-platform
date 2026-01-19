'use client'

import { TEST_PROMPTS } from '@/ai/constants'
import { ArrowUp, MessageCircleIcon, Square, Plus, Menu, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useUIStore } from '@/lib/ui-store'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input'
import { Message } from '@/components/chat/message'
import { Panel, PanelHeader } from '@/components/panels/panels'
import { Settings } from '@/components/settings/settings'
import { ComingSoonModal } from '@/components/modals/coming-soon-modal'
import { HistoryPanel } from '@/components/history-panel/history-panel'
import { useChat } from '@ai-sdk/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSharedChatContext } from '@/lib/chat-context'
import { useSandboxStore } from './state'
import { useAuth, useClerk } from '@clerk/nextjs'
import type { ChatUIMessage } from '@/components/chat/types'
import { emitCreditsUpdated } from '@/lib/credits-events'
import { useChatPersistence } from '@/lib/use-chat-persistence'
import type { ProjectVersion } from '@/lib/projects-db'

import { ProjectDropdown } from '@/components/chat/project-dropdown'

interface Props {
  className: string
  modelId?: string
  initialPrompt?: string
  initialMessages?: unknown[] | null
  projectId?: string | null
  projectName?: string
}

export function Chat({ className, initialPrompt, initialMessages, projectId, projectName }: Props) {
  const { chat } = useSharedChatContext()
  const { messages, sendMessage, status, stop } = useChat<ChatUIMessage>({ chat })
  const { setChatStatus, setViewingVersion, setRevertInChatVersionId } = useSandboxStore()
  const { toggleSidebar } = useUIStore()
  const [input, setInput] = useState('')
  const [supabaseConnected, setSupabaseConnected] = useState(false)
  const hasSubmittedInitialPromptRef = useRef(false)
  const [forceEnableInput, setForceEnableInput] = useState(false)
  const recoveryTimeoutRef = useRef<number | null>(null)
  const { isSignedIn } = useAuth()
  const { openSignIn } = useClerk()
  const [comingSoonModal, setComingSoonModal] = useState<{
    isOpen: boolean
    title: string
    description: string
  }>({
    isOpen: false,
    title: '',
    description: '',
  })
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [showSubscriptionRequired, setShowSubscriptionRequired] = useState(false)

  // Persist and restore chat messages across page refreshes and across devices (seeded from project DB)
  const seedChatMessages = useMemo(() => {
    if (!Array.isArray(initialMessages)) return null
    return initialMessages as ChatUIMessage[]
  }, [initialMessages])

  const { allMessages, hasRestored } = useChatPersistence(projectId || null, messages, seedChatMessages)

  const chatSaveTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!projectId) return
    if (!hasRestored) return
    if (typeof window === 'undefined') return

    // Avoid writing empty chats.
    if (allMessages.length === 0) return

    // Debounce to reduce write frequency.
    if (chatSaveTimeoutRef.current !== null) {
      window.clearTimeout(chatSaveTimeoutRef.current)
    }

    const pruned = allMessages.slice(-200)

    chatSaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatState: { messages: pruned },
          }),
        })
      } catch (error) {
        console.warn('Failed to persist chat state:', error)
      }
    }, 800)

    return () => {
      if (chatSaveTimeoutRef.current !== null) {
        window.clearTimeout(chatSaveTimeoutRef.current)
        chatSaveTimeoutRef.current = null
      }
    }
  }, [allMessages, hasRestored, projectId])

  const latestVersionMessageId = useMemo(() => {
    let lastId: string | null = null
    for (const msg of allMessages) {
      if (msg.role !== 'assistant') continue
      const parts = msg.parts ?? []
      const hasSandboxUrl = parts.some(
        (part) => part.type === 'data-get-sandbox-url' && part.data.status === 'done'
      )
      if (hasSandboxUrl && typeof msg.id === 'string') {
        lastId = msg.id
      }
    }
    return lastId
  }, [allMessages])

  const handleComingSoon = (title: string, description: string) => {
    setComingSoonModal({
      isOpen: true,
      title,
      description,
    })
  }


  useEffect(() => {
    if (!isSignedIn) {
      setHasSubscription(null)
      return
    }

    const checkSubscriptionStatus = async () => {
      try {
        const response = await fetch('/api/subscription')
        if (response.ok) {
          const data = await response.json()
          const subscription = data.subscription
          // Only allow paid plans (not free)
          const isPaid = subscription && subscription.plan_id !== 'free' && subscription.status === 'active'
          setHasSubscription(isPaid)
        } else {
          setHasSubscription(false)
        }
      } catch (error) {
        console.error('Failed to check subscription status:', error)
        setHasSubscription(false)
      }
    }

    checkSubscriptionStatus()
  }, [isSignedIn])

  useEffect(() => {
    if (!projectId) return

    const checkSupabaseStatus = async () => {
      try {
        const response = await fetch(
          `/api/supabase-oauth/status?projectId=${projectId}`
        )
        if (response.ok) {
          const data = (await response.json()) as { connected: boolean }
          setSupabaseConnected(data.connected)
        }
      } catch (error) {
        console.error('Failed to check Supabase status:', error)
      }
    }

    checkSupabaseStatus()
    const interval = setInterval(checkSupabaseStatus, 5000)
    return () => clearInterval(interval)
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    const storageKey = `prompt-draft-${projectId}`
    if (input) {
      localStorage.setItem(storageKey, input)
    } else {
      localStorage.removeItem(storageKey)
    }
  }, [input, projectId])

  useEffect(() => {
    if (!projectId) return

    // Switching projects: reset per-project refs and input first.
    hasSubmittedInitialPromptRef.current = false
    setForceEnableInput(false)
    setInput('')

    const storageKey = `prompt-draft-${projectId}`
    const stored = localStorage.getItem(storageKey)
    if (typeof stored === 'string' && stored.length > 0) {
      setInput(stored)
    }
  }, [projectId])

  const validateAndSubmitMessage = useCallback(
    (text: string) => {
      if (!isSignedIn) {
        openSignIn()
        return
      }

      // Check if user has a paid subscription
      if (hasSubscription === false) {
        setShowSubscriptionRequired(true)
        return
      }

      // If subscription status is still loading, don't submit
      if (hasSubscription === null) {
        toast.loading('Checking subscription status...')
        return
      }

      const messageText = text.trim()

      if (messageText) {
        sendMessage(
          { text: messageText },
          {
            body: {
              projectId,
              supabaseConnected,
            },
          }
        )
        setInput('')
        if (projectId) {
          localStorage.removeItem(`prompt-draft-${projectId}`)
        }
      }
    },
    [isSignedIn, openSignIn, sendMessage, setInput, projectId, supabaseConnected, hasSubscription]
  )

  const previousChatStatusRef = useRef(status)

  useEffect(() => {
    setChatStatus(status)
  }, [status, setChatStatus])

  useEffect(() => {
    const previousStatus = previousChatStatusRef.current
    previousChatStatusRef.current = status

    if (previousStatus !== 'ready' && status === 'ready') {
      emitCreditsUpdated()
    }
  }, [status])

  useEffect(() => {
    if (status === 'ready') {
      setForceEnableInput(false)
      if (recoveryTimeoutRef.current !== null) {
        clearTimeout(recoveryTimeoutRef.current)
        recoveryTimeoutRef.current = null
      }
      return
    }

    if (status === 'streaming' || status === 'submitted') {
      if (recoveryTimeoutRef.current !== null) {
        clearTimeout(recoveryTimeoutRef.current)
      }

      recoveryTimeoutRef.current = window.setTimeout(() => {
        setForceEnableInput(true)
      }, 120000)
    }

    return () => {
      if (recoveryTimeoutRef.current !== null) {
        clearTimeout(recoveryTimeoutRef.current)
        recoveryTimeoutRef.current = null
      }
    }
  }, [chat, status])

  useEffect(() => {
    if (!projectId) return
    if (!hasRestored) return
    if (hasSubmittedInitialPromptRef.current) return
    if (status !== 'ready') return

    // Only prefill the initial prompt if there is no history and no draft.
    // This avoids showing the "first prompt" when reopening an existing project.
    const hasAnyHistory = allMessages.length > 0
    const hasDraft = input.trim().length > 0

    if (!hasAnyHistory && !hasDraft && initialPrompt && initialPrompt.trim()) {
      hasSubmittedInitialPromptRef.current = true
      setInput(initialPrompt)
    }
  }, [allMessages.length, hasRestored, initialPrompt, input, projectId, status])

  const isLoading =
    !forceEnableInput && (status === 'streaming' || status === 'submitted')
  const isInputDisabled = !forceEnableInput && status !== 'ready'

  const handleStopGeneration = useCallback(() => {
    // Stop the current client-side stream using the useChat hook
    stop()
    toast.success('Generation stopped')
  }, [stop])

  const handleVersionSelect = (version: ProjectVersion) => {
    setSelectedVersionId(version.id)
  }

  const handleRevertInChat = useCallback(
    async (versionId: string, anchorMessageId: string) => {
      try {
        if (!projectId) return

        const response = await fetch(`/api/projects/${projectId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'revert', versionId }),
        })

        if (!response.ok) {
          toast.error('Failed to revert to version')
          return
        }

        try {
          const storageKey = `chat-messages-${projectId}`
          const stored = localStorage.getItem(storageKey)
          if (stored) {
            const parsed = JSON.parse(stored) as ChatUIMessage[]
            const idx = parsed.findIndex((m) => m.id === anchorMessageId)
            if (idx >= 0) {
              localStorage.setItem(storageKey, JSON.stringify(parsed.slice(0, idx + 1)))
            }
          }
        } catch (error) {
          console.error('Failed to prune chat messages:', error)
        }

        setViewingVersion(null)
        setRevertInChatVersionId(null)
        toast.success('Reverted to selected version')
        window.location.reload()
      } catch (error) {
        console.error('Error reverting version:', error)
        toast.error('Failed to revert to version')
      }
    },
    [projectId, setRevertInChatVersionId, setViewingVersion]
  )

  const handleVersionRevert = async (version: ProjectVersion) => {
    try {
      if (!projectId) return
      const response = await fetch(`/api/projects/${projectId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revert',
          versionId: version.id,
        }),
      })
      if (response.ok) {
        toast.success(`Reverted to version from ${new Date(version.created_at).toLocaleString()}`)
        setShowHistoryPanel(false)
        setSelectedVersionId(null)
        window.location.reload()
      } else {
        toast.error('Failed to revert to version')
      }
    } catch (error) {
      console.error('Error reverting version:', error)
      toast.error('Failed to revert to version')
    }
  }

  return (
    <>
      <Panel className={className}>
        <PanelHeader className="flex items-center justify-between">
          <div className="flex items-center">
            <ProjectDropdown projectName={projectName || ''} projectId={projectId} />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className={`p-1 rounded transition-colors group ${
                showHistoryPanel ? 'bg-blue-600' : 'hover:bg-blue-600'
              }`}
              title="History"
              aria-label="History"
            >
              <Clock className={`w-3.5 h-3.5 ${
                showHistoryPanel ? 'text-white' : 'text-muted-foreground group-hover:text-white'
              }`} />
            </button>
          </div>
        </PanelHeader>

        {showHistoryPanel ? (
          <HistoryPanel
            projectId={projectId}
            onClose={() => setShowHistoryPanel(false)}
            onVersionSelect={handleVersionSelect}
            onRevert={handleVersionRevert}
            selectedVersionId={selectedVersionId}
            isLatestVersion={!selectedVersionId}
          />
        ) : (
          <>
            <Conversation className="relative w-full flex-1 min-h-0 bg-background">
              <ConversationContent className="space-y-4">
                {allMessages.map((message, index) => (
                  <Message
                    key={message.id}
                    message={message}
                    projectId={projectId || null}
                    isLatestVersionCard={latestVersionMessageId === message.id}
                    onRevertInChat={handleRevertInChat}
                    isLast={index === allMessages.length - 1}
                    isGenerating={index === allMessages.length - 1 && isLoading}
                  />
                ))}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <form
              className="bg-background p-2"
              onSubmit={async (event) => {
                event.preventDefault()
                if (isLoading) {
                  handleStopGeneration()
                } else {
                  validateAndSubmitMessage(input)
                }
              }}
            >
              <PromptInput
                value={input}
                onValueChange={setInput}
                isLoading={isLoading}
                onSubmit={() => {
                  if (isLoading) {
                    handleStopGeneration()
                  } else {
                    validateAndSubmitMessage(input)
                  }
                }}
                disabled={isInputDisabled}
                className="w-full"
              >
                <PromptInputTextarea
                  placeholder="Type your message..."
                  className="text-sm"
                />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleComingSoon('Add file', 'File upload support is coming soon!')}
                      type="button"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 text-foreground shadow-xs hover:bg-secondary/60 transition-colors chat-toolbar-action-button"
                      aria-label="More options"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <div
                      className="flex items-center gap-1 rounded-full px-1 py-0.5 border border-border/60 shadow-xs chat-toolbar-settings-group"
                    >
                      <Settings />
                    </div>
                  </div>
                  <PromptInputActions>
                    <PromptInputAction
                      tooltip={isLoading ? 'Stop generation' : 'Send message'}
                    >
                      <Button
                        type="submit"
                        variant="default"
                        size="icon"
                        className="h-7 w-7 rounded-full"
                        disabled={isInputDisabled && !isLoading}
                      >
                        {isLoading ? (
                          <Square className="size-4 fill-current" />
                        ) : (
                          <ArrowUp className="size-4" />
                        )}
                      </Button>
                    </PromptInputAction>
                  </PromptInputActions>
                </div>
              </PromptInput>
            </form>
          </>
        )}
      </Panel>
      <ComingSoonModal
        isOpen={comingSoonModal.isOpen}
        onClose={() =>
          setComingSoonModal((prev) => ({ ...prev, isOpen: false }))
        }
        title={comingSoonModal.title}
        description={comingSoonModal.description}
      />
    </>
  )
}
