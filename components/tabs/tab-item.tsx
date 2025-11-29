'use client'

import type { ReactNode } from 'react'
import { useTabState } from './use-tab-state'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  tabId: string
}

export function TabItem({ children, tabId }: Props) {
  const [activeTabId, setTabId] = useTabState()
  return (
    <li
      onClick={() => setTabId(tabId)}
      className={cn(
        'cursor-pointer rounded-full px-3 py-1 text-xs font-mono uppercase tracking-tight transition-colors',
        activeTabId === tabId
          ? 'bg-foreground text-background shadow-sm'
          : 'text-foreground/70 hover:bg-secondary/60 hover:text-foreground'
      )}
    >
      {children}
    </li>
  )
}
