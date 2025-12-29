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
import { ModelSelector } from '@/components/settings/model-selector'
import { Panel, PanelHeader } from '@/components/panels/panels'
import { Settings } from '@/components/settings/settings'
import { SupabaseOAuthButton } from '@/components/supabase-connect/supabase-oauth-button'
import { ComingSoonModal } from '@/components/modals/coming-soon-modal'
import { HistoryPanel } from '@/components/history-panel/history-panel'
import { useChat } from '@ai-sdk/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSharedChatContext } from '@/lib/chat-context'
import { useSettings } from '@/components/settings/use-settings'
import { useSandboxStore } from './state'
import { useAuth, useClerk } from '@clerk/nextjs'
import type { ChatUIMessage } from '@/components/chat/types'
import { emitCreditsUpdated } from '@/lib/credits-events'
import { useChatPersistence } from '@/lib/use-chat-persistence'
import type { ProjectVersion } from '@/lib/projects-db'

interface Props {
  className: string
  modelId?: string
  initialPrompt?: string
  projectId?: string | null
}

export function Chat({ className, initialPrompt, projectId }: Props) {
  const { chat } = useSharedChatContext()
  const { modelId, reasoningEffort } = useSettings()
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({ chat })
  const { setChatStatus } = useSandboxStore()
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

  // Persist and restore chat messages across page refreshes
  const { allMessages } = useChatPersistence(projectId || null, messages)

  const handleComingSoon = (title: string, description: string) => {
    setComingSoonModal({
      isOpen: true,
      title,
      description,
    })
  }

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
    if (input.trim()) {
      localStorage.setItem(`prompt-draft-${projectId}`, input)
    }
  }, [input, projectId])

  useEffect(() => {
    if (!projectId) return
    if (typeof window !== 'undefined' && !input) {
      const stored = localStorage.getItem(`prompt-draft-${projectId}`)
      if (stored) {
        setInput(stored)
      }
    }
  }, [projectId, input])

  const validateAndSubmitMessage = useCallback(
    (text: string) => {
      if (!isSignedIn) {
        openSignIn()
        return
      }

      const messageText = text.trim()

      if (messageText) {
        sendMessage(
          { text: messageText },
          {
            body: {
              modelId,
              reasoningEffort,
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
    [isSignedIn, openSignIn, sendMessage, modelId, setInput, reasoningEffort, projectId, supabaseConnected]
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
    if (
      !hasSubmittedInitialPromptRef.current &&
      initialPrompt &&
      initialPrompt.trim() &&
      status === 'ready'
    ) {
      hasSubmittedInitialPromptRef.current = true
      setInput(initialPrompt)
    }
  }, [initialPrompt, status, setInput])

  const isLoading =
    !forceEnableInput && (status === 'streaming' || status === 'submitted')
  const isInputDisabled = !forceEnableInput && status !== 'ready'

  const handleVersionSelect = (version: ProjectVersion) => {
    setSelectedVersionId(version.id)
  }

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
          <button
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
            title="Toggle app menu"
            aria-label="Toggle app menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
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
                {allMessages.map((message) => (
                  <Message key={message.id} message={message} />
                ))}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <form
              className="bg-background p-2"
              onSubmit={async (event) => {
                event.preventDefault()
                validateAndSubmitMessage(input)
              }}
            >
              <PromptInput
                value={input}
                onValueChange={setInput}
                isLoading={isLoading}
                onSubmit={() => validateAndSubmitMessage(input)}
                disabled={isInputDisabled}
                className="w-full"
              >
                <PromptInputTextarea
                  placeholder="Type your message..."
                  className="text-base"
                />
                <div className="flex items-center justify-between pt-1.5">
                  <div className="flex items-center gap-2">
                    <SupabaseOAuthButton projectId={projectId || undefined} />
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-foreground shadow-xs hover:bg-secondary/60 transition-colors chat-toolbar-action-button"
                      aria-label="More options"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <div
                      className="flex items-center gap-2 rounded-full px-2 py-1 border border-border/60 shadow-xs chat-toolbar-settings-group"
                    >
                      <Settings />
                      <ModelSelector />
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
                        className="h-8 w-8 rounded-full"
                        disabled={isInputDisabled || !input.trim()}
                      >
                        {isLoading ? (
                          <Square className="size-5 fill-current" />
                        ) : (
                          <ArrowUp className="size-5" />
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
