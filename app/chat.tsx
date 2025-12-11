'use client'

import { TEST_PROMPTS } from '@/ai/constants'
import { ArrowUp, MessageCircleIcon, Square, Plus, Menu, Clock, PanelLeft, X } from 'lucide-react'
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
import { useChat } from '@ai-sdk/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSharedChatContext } from '@/lib/chat-context'
import { useSettings } from '@/components/settings/use-settings'
import { useSandboxStore } from './state'
import { useAuth, useClerk } from '@clerk/nextjs'
import type { ChatUIMessage } from '@/components/chat/types'
import { uploadImageToSupabase, deleteImageFromSupabase } from '@/lib/supabase-client'

interface UploadedImage {
  url: string
  name: string
}

interface Props {
  className: string
  modelId?: string
  initialPrompt?: string
  initialImages?: UploadedImage[]
}

export function Chat({ className, initialPrompt, initialImages }: Props) {
  const { chat } = useSharedChatContext()
  const { modelId, reasoningEffort } = useSettings()
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({ chat })
  const { setChatStatus } = useSandboxStore()
  const { toggleSidebar } = useUIStore()
  const [input, setInput] = useState('')
  const [chatImages, setChatImages] = useState<UploadedImage[]>([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasSubmittedInitialPromptRef = useRef(false)
  const [forceEnableInput, setForceEnableInput] = useState(false)
  const recoveryTimeoutRef = useRef<number | null>(null)
  const { isSignedIn, userId } = useAuth()
  const { openSignIn } = useClerk()

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (!files || !userId) return

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select image files only')
        continue
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB')
        continue
      }

      try {
        setIsUploadingImage(true)
        const url = await uploadImageToSupabase(file, userId)
        setChatImages((prev) => [...prev, { url, name: file.name }])
        toast.success(`Image "${file.name}" uploaded`)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to upload image'
        )
      } finally {
        setIsUploadingImage(false)
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = async (imageUrl: string) => {
    try {
      await deleteImageFromSupabase(imageUrl)
      setChatImages((prev) => prev.filter((img) => img.url !== imageUrl))
      toast.success('Image removed')
    } catch (error) {
      toast.error('Failed to remove image')
    }
  }

  const validateAndSubmitMessage = useCallback(
    (text: string, images?: UploadedImage[]) => {
      if (!isSignedIn) {
        openSignIn()
        return
      }

      const imagesToSend = images || chatImages
      if (text.trim() || (imagesToSend && imagesToSend.length > 0)) {
        const imageUrls = imagesToSend.map(img => img.url)
        sendMessage({ text, imageUrls }, { body: { modelId, reasoningEffort } })
        setInput('')
        setChatImages([])
      }
    },
    [isSignedIn, openSignIn, sendMessage, modelId, setInput, reasoningEffort, chatImages]
  )

  useEffect(() => {
    setChatStatus(status)
  }, [status, setChatStatus])

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
        toast.error('The AI did not respond. You can try sending your message again.')
        const abortChat = chat as unknown as { abort?: () => void }
        abortChat.abort?.()
      }, 30000)
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
      (initialPrompt?.trim() || (initialImages && initialImages.length > 0)) &&
      status === 'ready'
    ) {
      hasSubmittedInitialPromptRef.current = true
      if (initialPrompt?.trim()) {
        setInput(initialPrompt)
      }
      // If there are initial images but no prompt, auto-submit with just the images
      if ((!initialPrompt || !initialPrompt.trim()) && initialImages && initialImages.length > 0) {
        validateAndSubmitMessage('', initialImages)
      }
    }
  }, [initialPrompt, initialImages, status, setInput, validateAndSubmitMessage])

  const isLoading =
    !forceEnableInput && (status === 'streaming' || status === 'submitted')
  const isInputDisabled = !forceEnableInput && status !== 'ready'

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
            className="p-1 rounded transition-colors hover:bg-blue-600 group"
            title="History"
            aria-label="History"
          >
            <Clock className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white" />
          </button>
          <button
            className="p-1 rounded transition-colors hover:bg-blue-600 group"
            title="Sidebar"
            aria-label="Sidebar"
          >
            <PanelLeft className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white" />
          </button>
        </div>
      </PanelHeader>

      <Conversation className="relative w-full flex-1 min-h-0 bg-background">
        <ConversationContent className="space-y-4">
          {messages.map((message) => (
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
        {chatImages.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 px-2">
            {chatImages.map((image) => (
              <div
                key={image.url}
                className="relative group inline-block rounded-lg overflow-hidden border border-border"
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="h-16 w-16 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(image.url)}
                  className="absolute top-0.5 right-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <PromptInput
          value={input}
          onValueChange={setInput}
          isLoading={isLoading}
          onSubmit={() => validateAndSubmitMessage(input)}
          disabled={isInputDisabled || isUploadingImage}
          className="w-full"
        >
          <PromptInputTextarea
            placeholder="Type your message..."
            className="font-mono text-sm"
          />
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage || isInputDisabled}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-foreground shadow-xs hover:bg-secondary/60 transition-colors chat-toolbar-action-button disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Upload images"
              >
                {isUploadingImage ? (
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
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
    </Panel>
  )
}
