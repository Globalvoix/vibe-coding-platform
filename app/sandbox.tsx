'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Preview } from './preview'
import { FileExplorer } from './file-explorer'
import { Logs } from './logs'

interface Props {
  className?: string
}

type SandboxTabId = 'preview' | 'code' | 'console'

export function Sandbox({ className }: Props) {
  const [activeTab, setActiveTab] = useState<SandboxTabId>('preview')

  const renderTabButton = (id: SandboxTabId, label: ReactNode) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={cn(
        'px-2 py-1 text-xs font-mono uppercase tracking-tight border-b-2 border-transparent',
        'hover:text-foreground/80',
        activeTab === id && 'border-foreground text-foreground'
      )}
    >
      {label}
    </button>
  )

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="flex items-center gap-2 border-b border-primary/18 bg-background px-2 py-1">
        {renderTabButton('preview', 'Preview')}
        {renderTabButton('code', 'Code')}
        {renderTabButton('console', 'Console')}
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'preview' && (
          <Preview className="flex-1 overflow-hidden" />
        )}

        {activeTab === 'code' && (
          <FileExplorer className="flex-1 min-h-0 overflow-hidden" />
        )}

        {activeTab === 'console' && (
          <Logs className="flex-1 min-h-0 overflow-hidden" />
        )}
      </div>
    </div>
  )
}
