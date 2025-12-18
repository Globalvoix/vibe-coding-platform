'use client'

import { type ChatUIMessage } from '@/components/chat/types'
import { type ReactNode, createContext, useContext, useMemo, useRef } from 'react'
import { Chat } from '@ai-sdk/react'
import { DataPart } from '@/ai/messages/data-parts'
import { DataUIPart } from 'ai'
import { useDataStateMapper, useSandboxStore } from '@/app/state'
import { mutate } from 'swr'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ChatContextValue {
  chat: Chat<ChatUIMessage>
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const mapDataToState = useDataStateMapper()
  const mapDataToStateRef = useRef(mapDataToState)
  mapDataToStateRef.current = mapDataToState

  const { setChatStatus } = useSandboxStore()
  const router = useRouter()

  const chat = useMemo(() => {
    return new Chat<ChatUIMessage>({
      onToolCall: () => mutate('/api/auth/info'),
      onData: (data: DataUIPart<DataPart>) => mapDataToStateRef.current(data),
      onError: (error) => {
        const errorMessage = error.message || ''

        // Handle insufficient credits error
        if (errorMessage.includes('INSUFFICIENT_CREDITS') || errorMessage.includes('insufficient credits')) {
          toast.error('You don\'t have enough credits for this prompt. Please upgrade your plan.')
          setTimeout(() => {
            router.push('/pricing')
          }, 1500)
        } else {
          toast.error(`Communication error with the AI: ${errorMessage}`)
        }

        console.error('Error sending message:', error)
        setChatStatus('ready')
      },
    })
  }, [setChatStatus, router])

  return (
    <ChatContext.Provider value={{ chat }}>{children}</ChatContext.Provider>
  )
}

export function useSharedChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useSharedChatContext must be used within a ChatProvider')
  }
  return context
}
