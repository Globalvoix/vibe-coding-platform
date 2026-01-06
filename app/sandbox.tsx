'use client'

import type { ReactNode } from 'react'
import { useEffect, useState, useRef } from 'react'
import { Globe, Code2, LineChart, Cloud, Shield, ArrowUpRight, RotateCw, LayoutTemplate, X, Laptop, Tablet, Smartphone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Preview } from './preview'
import { FileExplorer } from './file-explorer'
import { Logs } from './logs'
import { ComingSoonModal } from '@/components/modals/coming-soon-modal'
import { SupabaseOAuthButton } from '@/components/supabase-connect/supabase-oauth-button'
import { GithubOAuthButton } from '@/components/github-connect/github-oauth-button'
import { LargeSettingsModal } from '@/components/settings/large-settings-modal'
import { SupabaseCloudPanel } from '@/components/supabase-connect/supabase-cloud-panel'
import { SecurityScan } from '@/components/security-scan'
import { useSearchParams } from 'next/navigation'
import { useSandboxStore } from './state'
import type { SandboxTabId } from './state'

interface Props {
  className?: string
}

interface TabConfig {
  id: SandboxTabId
  label: string
  icon: ReactNode
}

export function Sandbox({ className }: Props) {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')

  const [restorePopoverOpen, setRestorePopoverOpen] = useState(false)
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [inputValue, setInputValue] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [showComingSoon, setShowComingSoon] = useState(false)
  const previewRefreshRef = useRef<(() => void) | null>(null)

  const { viewingVersion, setViewingVersion, setRevertInChatVersionId, applySandboxState, device, setDevice, activeTab, setActiveTab } = useSandboxStore()

  const toggleDevice = () => {
    if (device === 'desktop') setDevice('tablet')
    else if (device === 'tablet') setDevice('mobile')
    else setDevice('desktop')
  }

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
    {
      id: 'security',
      label: 'Security',
      icon: <Shield className="w-3.5 h-3.5" />,
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
            ? 'h-[30px] px-3 bg-[#D2E3FC] border border-[#1A73E8] text-[#0F172A] rounded-md text-xs font-semibold shadow-sm'
            : 'h-[30px] w-[30px] bg-background border border-[#E5E7EB] text-[#111827]/80 rounded-md hover:bg-black/5 hover:border-[#111827]/40 hover:text-[#111827]'
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

  useEffect(() => {
    if (viewingVersion) {
      setActiveTab('preview')
    }
  }, [viewingVersion])

  const exitViewingMode = async () => {
    setViewingVersion(null)
    setRevertInChatVersionId(null)

    if (!projectId) return

    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) return
      const data = (await res.json()) as {
        sandbox_state: {
          sandboxId?: string
          paths?: string[]
          url?: string
          urlUUID?: string
        } | null
      }
      applySandboxState(data.sandbox_state ?? null)
    } catch {
      // ignore
    }
  }

  const openViewingInNewTab = () => {
    const url = viewingVersion?.sandboxState?.url
    if (url) window.open(url, '_blank')
  }

  const revertToViewingVersion = async () => {
    if (!projectId || !viewingVersion?.id) return

    try {
      const response = await fetch(`/api/projects/${projectId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revert', versionId: viewingVersion.id }),
      })

      if (!response.ok) return

      setRestorePopoverOpen(false)
      setViewingVersion(null)
      setRevertInChatVersionId(null)

      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) {
        const data = (await res.json()) as {
          sandbox_state: {
            sandboxId?: string
            paths?: string[]
            url?: string
            urlUUID?: string
          } | null
        }
        applySandboxState(data.sandbox_state ?? null)
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-background', className)}>
      <div className="flex items-center justify-between border-b border-black/5 bg-background px-3 h-[50px]">
        {viewingVersion ? (
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[12px] font-medium text-foreground/60">Viewing:</span>
              <div className="inline-flex items-center gap-2 max-w-[360px] rounded-full bg-black/5 border border-black/10 px-3 h-7">
                <span className="truncate text-[12px] font-semibold text-foreground">
                  {viewingVersion.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={openViewingInNewTab}
                className={cn(
                  'h-7 w-7 inline-flex items-center justify-center rounded-md border border-black/10 bg-background hover:bg-black/5 transition-colors',
                  !viewingVersion.sandboxState?.url && 'pointer-events-none opacity-50'
                )}
                aria-label="Preview version in new tab"
                title="Preview version"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-[#111827]" />
              </button>

              <Popover open={restorePopoverOpen} onOpenChange={setRestorePopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-7 px-3 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-[12px] font-semibold rounded-md transition-colors"
                  >
                    Restore this version
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="end"
                  className="w-[440px] p-0 bg-[#F7F4ED] border-black/10 shadow-lg rounded-xl"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-foreground">
                          Revert to this version?
                        </p>
                        <p className="text-[13px] text-foreground/65 mt-1 leading-[1.35]">
                          This will revert your project to how it looked at that point. Recent changes after this version can be reapplied anytime.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openViewingInNewTab}
                        className={cn(
                          'inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground/70 hover:text-foreground transition-colors shrink-0',
                          !viewingVersion.sandboxState?.url && 'pointer-events-none opacity-50'
                        )}
                      >
                        <span>Preview version</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRestorePopoverOpen(false)
                        setRevertInChatVersionId(viewingVersion.id)
                      }}
                      className="flex-1 h-10 rounded-lg border border-black/[0.06] bg-white/60 hover:bg-white text-[13px] font-semibold text-foreground/80 transition-colors"
                    >
                      View in chat
                    </button>
                    <button
                      type="button"
                      onClick={revertToViewingVersion}
                      className="flex-1 h-10 rounded-lg bg-[#1A73E8] hover:bg-[#1557B0] text-white text-[13px] font-semibold transition-colors"
                    >
                      Revert
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              <button
                type="button"
                onClick={exitViewingMode}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-black/10 bg-background hover:bg-black/5 transition-colors"
                aria-label="Exit version preview"
                title="Exit"
              >
                <X className="w-3.5 h-3.5 text-[#111827]" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <TooltipProvider>
              <div className="flex items-center gap-1.5 min-w-[240px]">
                {tabs.map(renderTabButton)}
              </div>
            </TooltipProvider>

            {activeTab === 'preview' ? (
              <div className="flex-1 flex justify-center px-4">
                <div className="flex items-center rounded-full border border-black/10 bg-background px-3 h-8 gap-2 w-full max-w-[300px] shadow-sm overflow-hidden">
                  <button
                    onClick={toggleDevice}
                    className="flex items-center justify-center shrink-0 hover:bg-black/5 p-1 -ml-1 rounded-md transition-colors"
                    title={`Switch to ${device === 'desktop' ? 'tablet' : device === 'tablet' ? 'mobile' : 'desktop'} view`}
                  >
                    {device === 'desktop' && <Laptop className="w-3.5 h-3.5 text-[#111827]" />}
                    {device === 'tablet' && <Tablet className="w-3.5 h-3.5 text-[#111827]" />}
                    {device === 'mobile' && <Smartphone className="w-3.5 h-3.5 text-[#111827]" />}
                  </button>

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

            <div className="min-w-[240px] flex justify-end items-center gap-2">
              <SupabaseOAuthButton projectId={projectId || undefined} compact={true} />
              <GithubOAuthButton projectId={projectId || undefined} compact={true} />
              <button
                onClick={handlePublish}
                type="button"
                className="px-4 py-1.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold rounded-md transition-colors"
              >
                Publish
              </button>
            </div>
          </>
        )}
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
            device={device}
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
          <SupabaseCloudPanel projectId={projectId || undefined} />
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

        <div
          className={cn(
            'absolute inset-0 transition-all duration-300 ease-in-out',
            activeTab === 'security'
              ? 'opacity-100 z-10'
              : 'opacity-0 z-0 pointer-events-none'
          )}
        >
          <SecurityScan />
        </div>
      </div>
      <ComingSoonModal
        isOpen={showComingSoon}
        onClose={() => setShowComingSoon(false)}
        title="Publish"
        description="Publishing and deploying your projects is coming soon!"
      />
      <LargeSettingsModal />
    </div>
  )
}
