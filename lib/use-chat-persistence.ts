'use client'

import { useEffect, useRef } from 'react'
import type { ChatUIMessage } from '@/components/chat/types'
import type { Chat } from '@ai-sdk/react'

export function useChatPersistence(
  projectId: string | null,
  messages: ChatUIMessage[],
  chat: Chat<ChatUIMessage>
) {
  const projectIdRef = useRef(projectId)
  const hasRestoredRef = useRef(false)

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!projectId || messages.length === 0) return

    if (typeof window === 'undefined') return

    try {
      const storageKey = `chat-messages-${projectId}`
      localStorage.setItem(storageKey, JSON.stringify(messages))
    } catch (error) {
      console.error('Failed to save chat messages:', error)
    }
  }, [projectId, messages])

  // Restore messages from localStorage when projectId changes
  useEffect(() => {
    if (!projectId) {
      hasRestoredRef.current = false
      return
    }

    // Only restore if projectId has changed
    if (projectIdRef.current === projectId && hasRestoredRef.current) {
      return
    }

    projectIdRef.current = projectId
    hasRestoredRef.current = true

    if (typeof window === 'undefined') return

    try {
      const storageKey = `chat-messages-${projectId}`
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const restoredMessages = JSON.parse(stored) as ChatUIMessage[]
        
        // Restore messages by directly manipulating the chat's internal state
        if (chat && typeof (chat as unknown as Record<string, unknown>).setMessages === 'function') {
          ((chat as unknown) as { setMessages: (msgs: ChatUIMessage[]) => void }).setMessages(restoredMessages)
        }
      }
    } catch (error) {
      console.error('Failed to restore chat messages:', error)
    }
  }, [projectId, chat])
}
