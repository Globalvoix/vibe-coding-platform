'use client'

import { type ChatUIMessage } from '@/components/chat/types'
import { type ReactNode } from 'react'
import { Chat } from '@ai-sdk/react'
import { DataPart } from '@/ai/messages/data-parts'
import { DataUIPart } from 'ai'
import { createContext, useContext, useMemo, useRef } from 'react'
import { useDataStateMapper } from '@/app/state'
import { mutate } from 'swr'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/app-store'

interface ChatContextValue {
  chat: Chat<ChatUIMessage>
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const mapDataToState = useDataStateMapper()
  const mapDataToStateRef = useRef(mapDataToState)
  mapDataToStateRef.current = mapDataToState
  const { currentAppId } = useAppStore()

  const chatsRef = useRef<Map<string, Chat<ChatUIMessage>>>(new Map())

  const activeChatKey = currentAppId ?? 'default'

  const chat = useMemo(() => {
    const existing = chatsRef.current.get(activeChatKey)
    if (existing) {
      return existing
    }

    const newChat = new Chat<ChatUIMessage>({
      onToolCall: () => mutate('/api/auth/info'),
      onData: (data: DataUIPart<DataPart>) => mapDataToStateRef.current(data),
      onError: (error) => {
        toast.error(`Communication error with the AI: ${error.message}`)
        console.error('Error sending message:', error)
      },
    })

    chatsRef.current.set(activeChatKey, newChat)
    return newChat
  }, [activeChatKey])

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
