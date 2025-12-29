'use client'

import type { ReactNode } from 'react'
import { useState, useRef } from 'react'
import { Globe, Code2, LineChart, Cloud, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Preview } from './preview'
import { FileExplorer } from './file-explorer'
import { Logs } from './logs'
import { ComingSoonModal } from '@/components/modals/coming-soon-modal'
import { useSearchParams } from 'next/navigation'

interface Props {
  className?: string
}

type SandboxTabId = 'preview' | 'code' | 'console' | 'cloud'

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
      icon: <Globe className="w-3.5 h-3.5" />,
    },
    {
      id: 'cloud',
      label: 'Cloud',
      icon: <Cloud className="w-3.5 h-3.5" />,
    },
    {
      id: 'code',
      label: 'Code',
      icon: <Code2 className="w-3.5 h-3.5" />,
    },
    {
      id: 'console',
      label: 'Console',
      icon: <LineChart className="w-3.5 h-3.5" />,
    },
  ]

  const renderTabButton = (tab: TabConfig) => {
    const isActive = activeTab === tab.id

    const button = (
      <button
        type="button"
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-200 ease-in-out',
          isActive
            ? 'h-[30px] px-3 bg-[#D2E3FC] border border-[#1A73E8] text-[#0F172A] rounded-md gap-1.5 text-xs font-semibold shadow-sm'
            : 'h-[30px] w-[30px] bg-white border border-[#E5E7EB] text-[#111827]/80 rounded-md hover:bg-[#F8F9FA] hover:border-[#111827]/40 hover:text-[#111827]'
        )}
        aria-pressed={isActive}
        aria-label={tab.label}
      >
        <div className="flex items-center justify-center shrink-0">
          {tab.icon}
        </div>
        {isActive && <span className="whitespace-nowrap">{tab.label}</span>}
      </button>
    )

    if (isActive) return button

    return (
      <Tooltip key={tab.id} delayDuration={0}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={6}
          className="bg-[#111827] text-white border-transparent px-2 py-1 text-[11px] rounded-md"
        >
          {tab.label}
        </TooltipContent>
      </Tooltip>
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
      <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-3 py-2 h-[50px]">
        <TooltipProvider>
          <div className="flex items-center gap-1.5">
            {tabs.map(renderTabButton)}

            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="h-[30px] w-[30px] flex items-center justify-center bg-transparent text-[#111827]/70 hover:text-[#111827] hover:bg-[#F3F4F6] rounded-md transition-all duration-200"
                  aria-label="Add tab"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent
          side="bottom"
          sideOffset={6}
          className="bg-[#111827] text-white border-transparent px-2 py-1 text-[11px] rounded-md"
        >
                Add
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

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

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div
          className={cn(
            'absolute inset-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[opacity,transform] transform-gpu',
            activeTab === 'preview'
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-1 scale-[0.995] pointer-events-none'
          )}
        >
          <Preview
            className="h-full w-full overflow-hidden"
            onUrlChange={setCurrentUrl}
            onInputChange={setInputValue}
            onLoadingChange={setIsLoading}
            onRefreshRef={previewRefreshRef}
            hideControls={true}
          />
        </div>

        <div
          className={cn(
            'absolute inset-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[opacity,transform] transform-gpu',
            activeTab === 'code'
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-1 scale-[0.995] pointer-events-none'
          )}
        >
          <FileExplorer className="h-full w-full min-h-0 overflow-hidden" />
        </div>

        <div
          className={cn(
            'absolute inset-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[opacity,transform] transform-gpu',
            activeTab === 'cloud'
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-1 scale-[0.995] pointer-events-none'
          )}
        >
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Cloud className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">Cloud features coming soon</p>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'absolute inset-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[opacity,transform] transform-gpu',
            activeTab === 'console'
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-1 scale-[0.995] pointer-events-none'
          )}
        >
          <Logs className="h-full w-full min-h-0 overflow-hidden" />
        </div>
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
