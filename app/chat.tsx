'use client'

import type { ChatUIMessage } from '@/components/chat/types'
import { TEST_PROMPTS } from '@/ai/constants'
import { ArrowUp, MessageCircleIcon, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useLocalStorageValue } from '@/lib/use-local-storage-value'
import { useCallback, useEffect } from 'react'
import { useSharedChatContext } from '@/lib/chat-context'
import { useSettings } from '@/components/settings/use-settings'
import { useSandboxStore } from './state'

interface Props {
  className: string
  modelId?: string
}

export function Chat({ className }: Props) {
  const [input, setInput] = useLocalStorageValue('prompt-input')
  const { chat } = useSharedChatContext()
  const { modelId, reasoningEffort } = useSettings()
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({ chat })
  const { setChatStatus } = useSandboxStore()

  const validateAndSubmitMessage = useCallback(
    (text: string) => {
      if (text.trim()) {
        sendMessage({ text }, { body: { modelId, reasoningEffort } })
        setInput('')
      }
    },
    [sendMessage, modelId, setInput, reasoningEffort]
  )

  useEffect(() => {
    setChatStatus(status)
  }, [status, setChatStatus])

  const isLoading = status === 'streaming' || status === 'submitted'
  const isInputDisabled = status !== 'ready'

  return (
    <Panel className={className}>
      <PanelHeader>
        <div className="flex items-center font-mono font-semibold uppercase">
          <MessageCircleIcon className="mr-2 w-4" />
          Chat
        </div>
        <div className="ml-auto font-mono text-xs opacity-50">[{status}]</div>
      </PanelHeader>

      {/* Messages Area */}
      {messages.length === 0 ? (
        <div className="flex-1 min-h-0">
          <div className="flex flex-col justify-center items-center h-full gap-6 font-mono text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/40 shadow-lg">
                <MessageCircleIcon className="w-8 h-8 text-primary" />
              </div>
              <img
                src="https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=800&q=80"
                alt="AI-powered coding workspace preview"
                className="hidden md:block h-32 w-56 rounded-2xl object-cover shadow-xl"
              />
            </div>
            <div className="text-center">
              <p className="flex items-center justify-center font-semibold mb-2">
                Click and try one of these prompts:
              </p>
              <ul className="p-4 space-y-2 text-center">
                {TEST_PROMPTS.map((prompt, idx) => (
                  <li
                    key={idx}
                    className="px-4 py-2 rounded-full border border-dashed shadow-sm cursor-pointer border-border/70 bg-background/60 hover:bg-secondary/60 hover:text-primary transition-colors"
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
        <Conversation className="relative w-full">
          <ConversationContent className="space-y-4">
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      <form
        className="border-t border-primary/18 bg-background p-2"
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
            <div className="flex items-center gap-2 rounded-full bg-secondary/60 px-2 py-1 border border-border/60 shadow-xs">
              <Settings />
              <ModelSelector />
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
