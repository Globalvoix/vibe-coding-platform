'use client'

import { useEffect, useRef } from 'react'
import type { ChatUIMessage } from '@/components/chat/types'

export function useChatPersistence(
  projectId: string | null,
  messages: ChatUIMessage[],
  setMessages: (messages: ChatUIMessage[]) => void
) {
  const hasRestoredRef = useRef(false)
  const projectIdRef = useRef(projectId)

  // Restore messages from localStorage when projectId changes or on mount
  useEffect(() => {
    if (!projectId) {
      hasRestoredRef.current = false
      return
    }

    // Only restore once per projectId
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
        setMessages(restoredMessages)
      }
    } catch (error) {
      console.error('Failed to restore chat messages:', error)
    }
  }, [projectId, setMessages])

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
}
