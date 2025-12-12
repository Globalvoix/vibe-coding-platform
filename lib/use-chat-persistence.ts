'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChatUIMessage } from '@/components/chat/types'

export function useChatPersistence(projectId: string | null, messages: ChatUIMessage[]) {
  const [restoredMessages, setRestoredMessages] = useState<ChatUIMessage[]>([])
  const projectIdRef = useRef(projectId)
  const hasRestoredRef = useRef(false)
  const messageCountRef = useRef(0)

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!projectId || messages.length === 0) return

    if (typeof window === 'undefined') return

    try {
      const storageKey = `chat-messages-${projectId}`
      const allMessages = [...restoredMessages, ...messages]
      localStorage.setItem(storageKey, JSON.stringify(allMessages))
    } catch (error) {
      console.error('Failed to save chat messages:', error)
    }
  }, [projectId, messages, restoredMessages])

  // Restore messages from localStorage when projectId changes
  useEffect(() => {
    if (!projectId) {
      hasRestoredRef.current = false
      setRestoredMessages([])
      return
    }

    // Only restore if projectId has changed
    if (projectIdRef.current === projectId && hasRestoredRef.current) {
      return
    }

    projectIdRef.current = projectId
    hasRestoredRef.current = true
    messageCountRef.current = 0

    if (typeof window === 'undefined') return

    try {
      const storageKey = `chat-messages-${projectId}`
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const restoredMsgs = JSON.parse(stored) as ChatUIMessage[]
        setRestoredMessages(restoredMsgs)
      }
    } catch (error) {
      console.error('Failed to restore chat messages:', error)
    }
  }, [projectId])

  return { restoredMessages, allMessages: [...restoredMessages, ...messages] }
}
