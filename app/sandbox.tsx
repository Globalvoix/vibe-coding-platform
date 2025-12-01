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

  const renderTabButton = (tab: TabConfig) => (
    <button
      type="button"
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={cn(
        'relative inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
        'text-sm font-medium tracking-tight',
        activeTab === tab.id
          ? 'bg-primary/10 text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
      )}
      title={tab.label}
    >
      {tab.icon}
      <span className="hidden sm:inline">{tab.label}</span>
    </button>
  )

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="flex items-center gap-1 border-b border-primary/18 bg-background px-2 py-2">
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
