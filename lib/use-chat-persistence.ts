'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChatUIMessage } from '@/components/chat/types'

function getMessageKey(message: ChatUIMessage): string {
  if (typeof message.id === 'string' && message.id) return message.id
  return JSON.stringify({ role: message.role, parts: message.parts })
}

function dedupeMessages(messages: ChatUIMessage[]): ChatUIMessage[] {
  const out: ChatUIMessage[] = []
  const indexByKey = new Map<string, number>()

  for (const message of messages) {
    const key = getMessageKey(message)
    const existingIndex = indexByKey.get(key)

    if (existingIndex === undefined) {
      indexByKey.set(key, out.length)
      out.push(message)
      continue
    }

    out[existingIndex] = message
  }

  return out
}

export function useChatPersistence(
  projectId: string | null,
  messages: ChatUIMessage[],
  seedMessages?: ChatUIMessage[] | null
) {
  const [restoredMessages, setRestoredMessages] = useState<ChatUIMessage[]>([])
  const [hasRestored, setHasRestored] = useState(false)
  const projectIdRef = useRef(projectId)
  const hasRestoredRef = useRef(false)

  const allMessages = useMemo(() => {
    return dedupeMessages([...restoredMessages, ...messages])
  }, [restoredMessages, messages])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!projectId || allMessages.length === 0) return
    if (typeof window === 'undefined') return

    try {
      const storageKey = `chat-messages-${projectId}`
      localStorage.setItem(storageKey, JSON.stringify(allMessages))
    } catch (error) {
      console.error('Failed to save chat messages:', error)
    }
  }, [projectId, allMessages])

  // Restore messages from localStorage (or seed from server) when projectId changes
  useEffect(() => {
    if (!projectId) {
      hasRestoredRef.current = false
      setHasRestored(false)
      setRestoredMessages([])
      return
    }

    if (projectIdRef.current === projectId && hasRestoredRef.current) {
      setHasRestored(true)
      return
    }

    projectIdRef.current = projectId
    hasRestoredRef.current = true
    setHasRestored(true)

    if (typeof window === 'undefined') return

    try {
      const storageKey = `chat-messages-${projectId}`
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const restored = JSON.parse(stored) as ChatUIMessage[]
        setRestoredMessages(dedupeMessages(restored))
      } else if (Array.isArray(seedMessages) && seedMessages.length > 0) {
        // Seed from server when local storage is empty (helps restore across devices / cleared cache)
        const seeded = dedupeMessages(seedMessages)
        setRestoredMessages(seeded)
        localStorage.setItem(storageKey, JSON.stringify(seeded))
      } else {
        setRestoredMessages([])
      }
    } catch (error) {
      console.error('Failed to restore chat messages:', error)
      setRestoredMessages([])
    }
  }, [projectId, seedMessages])

  return { restoredMessages, allMessages, hasRestored }
}
