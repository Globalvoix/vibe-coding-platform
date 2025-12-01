'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Globe, Code2, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Preview } from './preview'
import { FileExplorer } from './file-explorer'
import { Logs } from './logs'

interface Props {
  className?: string
}

type SandboxTabId = 'preview' | 'code' | 'console'

interface TabConfig {
  id: SandboxTabId
  label: string
  icon: ReactNode
}

export function Sandbox({ className }: Props) {
  const [activeTab, setActiveTab] = useState<SandboxTabId>('preview')

  const tabs: TabConfig[] = [
    {
      id: 'preview',
      label: 'Preview',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      id: 'code',
      label: 'Code',
      icon: <Code2 className="w-4 h-4" />,
    },
    {
      id: 'console',
      label: 'Console',
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ]

  const renderTabButton = (tab: TabConfig) => {
    const isActive = activeTab === tab.id

    return (
      <button
        type="button"
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={cn(
          'inline-flex items-center justify-center rounded-full border text-xs font-medium transition-colors duration-150',
          isActive
            ? 'h-8 px-4 bg-blue-100 border-blue-300 text-blue-800'
            : 'h-8 w-8 bg-background border-border text-muted-foreground hover:bg-muted/40',
          !isActive && 'sm:h-8 sm:w-8'
        )}
        aria-pressed={isActive}
        aria-label={tab.label}
      >
        <span className="flex items-center gap-2">
          {tab.icon}
          {isActive && <span className="hidden sm:inline">{tab.label}</span>}
        </span>
      </button>
    )
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="flex items-center gap-2 border-b border-primary/18 bg-background px-3 py-2">
        {tabs.map(renderTabButton)}
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
