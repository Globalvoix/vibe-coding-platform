'use client'

import type { ReactNode } from 'react'
import { useState, useRef } from 'react'
import { Globe, Code2, LineChart, Cloud, Plus, ArrowUpRight, RotateCw, LayoutTemplate } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
          'inline-flex items-center justify-center transition-all duration-[400ms] ease-in-out',
          isActive
            ? 'h-[28px] px-3 bg-[#D2E3FC] border border-[#1A73E8] text-[#0F172A] rounded-md text-[11px] font-semibold shadow-sm'
            : 'h-[28px] w-[28px] bg-background border border-[#E5E7EB] text-[#111827]/80 rounded-md hover:bg-black/5 hover:border-[#111827]/40 hover:text-[#111827]'
        )}
        aria-pressed={isActive}
        aria-label={tab.label}
      >
        <div className="flex items-center justify-center shrink-0">
          {tab.icon}
        </div>
        <AnimatePresence initial={false}>
          {isActive && (
            <motion.span
              initial={{ width: 0, opacity: 0, marginLeft: 0 }}
              animate={{ width: "auto", opacity: 1, marginLeft: 6 }}
              exit={{ width: 0, opacity: 0, marginLeft: 0 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
              className="whitespace-nowrap overflow-hidden"
            >
              {tab.label}
            </motion.span>
          )}
        </AnimatePresence>
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
    <div className={cn('flex h-full min-h-0 flex-col bg-background', className)}>
      <div className="flex items-center justify-between border-b border-black/5 bg-background px-3 h-[50px]">
        <TooltipProvider>
          <div className="flex items-center gap-1.5 min-w-[240px]">
            {tabs.map(renderTabButton)}

            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="h-[28px] w-[28px] flex items-center justify-center bg-transparent text-[#111827]/70 hover:text-[#111827] hover:bg-[#F3F4F6] rounded-md transition-all duration-200"
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

        {activeTab === 'preview' ? (
          <div className="flex-1 flex justify-center px-4">
            <div className="flex items-center rounded-full border border-black/10 bg-background px-3 h-8 gap-2 w-full max-w-[300px] shadow-sm">
              <LayoutTemplate className="w-3.5 h-3.5 text-[#111827]" />

              <div
                className="min-w-0 flex-1 font-mono text-[11px] text-[#111827] truncate select-text"
                title={currentUrl || inputValue}
                aria-label="Current preview URL"
              >
                {(() => {
                  const raw = inputValue || currentUrl
                  if (!raw) return '/'
                  try {
                    const parsed = new URL(raw)
                    return parsed.pathname || '/'
                  } catch {
                    return raw
                  }
                })()}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={openInNewTab}
                  type="button"
                  className={cn(
                    'p-1 rounded-full hover:bg-black/5 text-[#111827] transition-colors',
                    !currentUrl && 'pointer-events-none opacity-50'
                  )}
                  title="Open in new tab"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRefresh}
                  type="button"
                  className={cn(
                    'p-1 rounded-full hover:bg-black/5 text-[#111827] transition-colors',
                    {
                      'animate-spin': isLoading,
                      'pointer-events-none opacity-50': !currentUrl,
                    }
                  )}
                  title="Refresh"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="min-w-[240px] flex justify-end">
          <button
            onClick={handlePublish}
            type="button"
            className="px-4 py-1.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold rounded-md transition-colors"
          >
            Publish
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div
          className={cn(
            'absolute inset-0 transition-all duration-300 ease-in-out',
            activeTab === 'preview'
              ? 'opacity-100 z-10'
              : 'opacity-0 z-0 pointer-events-none'
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
            'absolute inset-0 transition-all duration-300 ease-in-out',
            activeTab === 'code'
              ? 'opacity-100 z-10'
              : 'opacity-0 z-0 pointer-events-none'
          )}
        >
          <FileExplorer className="h-full w-full min-h-0 overflow-hidden" />
        </div>

        <div
          className={cn(
            'absolute inset-0 transition-all duration-300 ease-in-out',
            activeTab === 'cloud'
              ? 'opacity-100 z-10'
              : 'opacity-0 z-0 pointer-events-none'
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
            'absolute inset-0 transition-all duration-300 ease-in-out',
            activeTab === 'console'
              ? 'opacity-100 z-10'
              : 'opacity-0 z-0 pointer-events-none'
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
