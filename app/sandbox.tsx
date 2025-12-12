'use client'

import type { ReactNode } from 'react'
import { useState, useRef } from 'react'
import { Globe, Code2, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Preview } from './preview'
import { FileExplorer } from './file-explorer'
import { Logs } from './logs'
import { ComingSoonModal } from '@/components/modals/coming-soon-modal'
import { useSearchParams } from 'next/navigation'

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
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')

  const [activeTab, setActiveTab] = useState<SandboxTabId>('preview')
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [inputValue, setInputValue] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [showComingSoon, setShowComingSoon] = useState(false)
  const previewRefreshRef = useRef<(() => void) | null>(null)

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
          'inline-flex items-center justify-center rounded-lg border text-xs font-bold transition-all duration-300 ease-in-out',
          isActive
            ? 'h-8 px-4 bg-blue-100 border-blue-300 text-black'
            : 'h-8 w-8 bg-background border-border text-muted-foreground hover:bg-muted/40'
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

  const openInNewTab = () => {
    if (currentUrl) {
      window.open(currentUrl, '_blank')
    }
  }

  const handleRefresh = () => {
    if (previewRefreshRef.current) {
      previewRefreshRef.current()
    }
  }

  const handlePublish = () => {
    setShowComingSoon(true)
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-primary/18 bg-background px-3 py-2">
        <div className="flex items-center gap-2">
          {tabs.map(renderTabButton)}
        </div>

        {activeTab === 'preview' && currentUrl && (
          <div className="flex items-center gap-2 flex-1 min-w-0 max-w-md">
            <input
              type="text"
              className="font-mono text-xs h-6 border border-gray-300 px-3 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px] flex-1"
              onChange={(event) => setInputValue(event.target.value)}
              onClick={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
              value={inputValue}
              placeholder="Enter URL..."
            />
            <button
              onClick={handleRefresh}
              type="button"
              className={cn(
                'p-1 rounded hover:bg-gray-200 transition-colors',
                {
                  'animate-spin': isLoading,
                }
              )}
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={openInNewTab}
              type="button"
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              title="Open in new tab"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        )}

        <button
          onClick={handlePublish}
          type="button"
          className="ml-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors"
        >
          Publish
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'preview' && (
          <Preview
            className="flex-1 overflow-hidden"
            onUrlChange={setCurrentUrl}
            onInputChange={setInputValue}
            onLoadingChange={setIsLoading}
            onRefreshRef={previewRefreshRef}
            hideControls={true}
          />
        )}

        {activeTab === 'code' && (
          <FileExplorer className="flex-1 min-h-0 overflow-hidden" />
        )}

        {activeTab === 'console' && (
          <Logs className="flex-1 min-h-0 overflow-hidden" />
        )}
      </div>
      <ComingSoonModal
        isOpen={showComingSoon}
        onClose={() => setShowComingSoon(false)}
        title="Publish"
        description="Publishing and deploying your projects is coming soon!"
      />
    </div>
  )
}
