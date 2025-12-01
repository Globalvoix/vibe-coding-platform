import type { ChatUIMessage } from '@/components/chat/types'
import { TEST_PROMPTS } from '@/ai/constants'
import { ArrowUp, MessageCircleIcon, Square, Plus, Menu, Clock, Settings as SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useChat } from '@ai-sdk/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSharedChatContext } from '@/lib/chat-context'
import { useSettings } from '@/components/settings/use-settings'
import { useSandboxStore } from './state'
import { useAppStore } from '@/lib/app-store'

interface Props {
  className: string
  modelId?: string
  initialPrompt?: string
}

export function Chat({ className, initialPrompt }: Props) {
  const { chat } = useSharedChatContext()
  const { modelId, reasoningEffort } = useSettings()
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({ chat })
  const { setChatStatus } = useSandboxStore()
  const { currentAppId } = useAppStore()
  const { toggleSidebar } = useUIStore()
  const [input, setInput] = useState('')
  const hasSubmittedInitialPromptRef = useRef(false)

  const validateAndSubmitMessage = useCallback(
    (text: string) => {
      if (text.trim()) {
        sendMessage({ text }, { body: { modelId, reasoningEffort } })
        setInput('')
      }
    },
    [sendMessage, modelId, setInput, reasoningEffort]
  )

  // Clear messages and input when switching apps
  useEffect(() => {
    setInput('')
    chat.messages = []
    hasSubmittedInitialPromptRef.current = false
  }, [currentAppId, chat])

  useEffect(() => {
    setChatStatus(status)
  }, [status, setChatStatus])

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

  const isLoading = status === 'streaming' || status === 'submitted'
  const isInputDisabled = status !== 'ready'

  return (
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
            className="p-1 hover:bg-blue-500/20 rounded-md transition-colors"
            title="History"
            aria-label="History"
          >
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            className="p-1 hover:bg-blue-500/20 rounded-md transition-colors"
            title="Options"
            aria-label="Options"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </PanelHeader>

      {/* Messages Area */}
      {messages.length === 0 ? (
        <div className="flex-1 min-h-0">
          <div className="flex h-full items-center justify-center px-4">
            <div className="max-w-md w-full rounded-xl border border-dashed border-border/70 bg-background/80 px-4 py-5 shadow-xs font-mono text-sm text-muted-foreground">
              <p className="mb-2 text-[11px] uppercase tracking-tight text-muted-foreground/80">
                Quick start
              </p>
              <p className="mb-3 text-sm font-semibold text-foreground">
                Click one of these prompts to see a full app generated:
              </p>
              <ul className="space-y-2 text-left">
                {TEST_PROMPTS.map((prompt, idx) => (
                  <li
                    key={idx}
                    className="cursor-pointer rounded-lg border border-dashed border-border/70 bg-secondary/40 px-3 py-2 text-xs text-foreground transition-colors hover:bg-secondary/70 hover:text-primary"
                    onClick={() => validateAndSubmitMessage(prompt)}
                  >
                    {prompt}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <Conversation className="relative w-full flex-1 min-h-0 bg-background">
          <ConversationContent className="space-y-4">
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

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
            className="font-mono text-sm"
          />
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background text-foreground shadow-xs hover:bg-secondary/60 transition-colors"
                aria-label="More options"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 rounded-full bg-secondary/60 px-2 py-1 border border-border/60 shadow-xs">
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
    </Panel>
  )
}
