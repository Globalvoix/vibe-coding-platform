'use client'

import { type ChatUIMessage } from '@/components/chat/types'
import { type ReactNode, createContext, useContext, useMemo, useRef } from 'react'
import { Chat } from '@ai-sdk/react'
import { DataPart } from '@/ai/messages/data-parts'
import { DataUIPart } from 'ai'
import { useDataStateMapper, useSandboxStore } from '@/app/state'
import { mutate } from 'swr'
import { toast } from 'sonner'

interface ChatContextValue {
  chat: Chat<ChatUIMessage>
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const mapDataToState = useDataStateMapper()
  const mapDataToStateRef = useRef(mapDataToState)
  mapDataToStateRef.current = mapDataToState

  const { setChatStatus } = useSandboxStore()

  const chat = useMemo(() => {
    return new Chat<ChatUIMessage>({
      onToolCall: () => mutate('/api/auth/info'),
      onData: (data: DataUIPart<DataPart>) => mapDataToStateRef.current(data),
      onError: (error) => {
        toast.error(`Communication error with the AI: ${error.message}`)
        console.error('Error sending message:', error)
        setChatStatus('ready')
      },
    })
  }, [setChatStatus])

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
