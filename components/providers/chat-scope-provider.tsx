'use client'

import { ChatProvider } from '@/lib/chat-context'
import type { ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function ChatScopeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isWorkspace = pathname === '/workspace'
  const projectId = isWorkspace ? searchParams.get('projectId') : null

  const scopeKey = isWorkspace && projectId ? `workspace:${projectId}` : 'global'

  return <ChatProvider scopeKey={scopeKey}>{children}</ChatProvider>
}
