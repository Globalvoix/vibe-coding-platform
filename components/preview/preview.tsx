'use client'

import { BarLoader } from 'react-spinners'
import { Panel } from '@/components/panels/panels'
import { ScrollArea } from '@radix-ui/react-scroll-area'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  disabled?: boolean
  url?: string
  isRestoringEnvironment?: boolean
  restoreError?: 'missing_files' | 'unknown' | null
  hideControls?: boolean
  onUrlChange?: (url: string) => void
  onInputChange?: (value: string) => void
  onLoadingChange?: (loading: boolean) => void
  onRefreshRef?: React.MutableRefObject<(() => void) | null>
  device?: 'desktop' | 'tablet' | 'mobile'
}

export function Preview({
  className,
  disabled,
  url,
  isRestoringEnvironment = false,
  restoreError = null,
  hideControls,
  onUrlChange,
  onInputChange,
  onLoadingChange,
  onRefreshRef,
  device = 'desktop',
}: Props) {
  const [currentUrl, setCurrentUrl] = useState(url)
  const [error, setError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState(url || '')
  const [isLoading, setIsLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const loadStartTime = useRef<number | null>(null)

  useEffect(() => {
    setCurrentUrl(url)
    setInputValue(url || '')
    onUrlChange?.(url || '')
    onInputChange?.(url || '')
  }, [url, onUrlChange, onInputChange])

  useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading, onLoadingChange])

  const refreshIframe = () => {
    if (iframeRef.current && currentUrl) {
      setIsLoading(true)
      setError(null)
      loadStartTime.current = Date.now()
      iframeRef.current.src = ''
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentUrl
        }
      }, 10)
    }
  }

  const loadNewUrl = () => {
    if (iframeRef.current && inputValue) {
      if (inputValue !== currentUrl) {
        setIsLoading(true)
        setError(null)
        loadStartTime.current = Date.now()
        iframeRef.current.src = inputValue
      } else {
        refreshIframe()
      }
    }
  }

  const handleIframeLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setError('Failed to load the page')
  }

  // Expose refresh method to parent via ref
  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef.current = refreshIframe
    }
  }, [onRefreshRef, currentUrl])

  return (
    <Panel className={cn('border-t-0', className)}>
      <div className={cn(
        "flex h-full flex-col relative transition-colors duration-300",
        device !== 'desktop' ? "bg-[#F7F4ED] p-10 overflow-auto items-center" : "bg-white"
      )}>
        {currentUrl && !disabled ? (
          <div className={cn(
            "relative transition-all duration-500 ease-in-out shadow-2xl bg-white",
            device === 'desktop' && "w-full h-full",
            device === 'tablet' && "w-[768px] h-[1024px] rounded-[48px] border-[16px] border-[#111827] shrink-0",
            device === 'mobile' && "w-[375px] h-[750px] rounded-[48px] border-[16px] border-[#111827] shrink-0"
          )}>
            {/* Device Speaker for Mobile/Tablet */}
            {device !== 'desktop' && (
              <>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#111827] rounded-b-[24px] z-20 flex items-center justify-center">
                  <div className="w-10 h-1.5 rounded-full bg-zinc-800" />
                </div>
                {/* Side buttons for aesthetics */}
                <div className="absolute top-24 -left-[18px] w-1 h-12 bg-[#111827] rounded-l-md" />
                <div className="absolute top-40 -left-[18px] w-1 h-12 bg-[#111827] rounded-l-md" />
                <div className="absolute top-24 -right-[18px] w-1 h-16 bg-[#111827] rounded-r-md" />
              </>
            )}

            <iframe
              ref={iframeRef}
              src={currentUrl}
              className={cn(
                "w-full h-full border-none transition-all duration-300",
                device !== 'desktop' ? "rounded-[32px]" : ""
              )}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title="Browser content"
            />

            {isLoading && !error && (
              <div className={cn(
                "absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center flex-col gap-2 z-10",
                device !== 'desktop' && "rounded-[28px]"
              )}>
                <BarLoader color="#666" />
                <span className="text-gray-500 text-xs">Loading...</span>
              </div>
            )}

            {error && (
              <div className={cn(
                "absolute inset-0 bg-white flex items-center justify-center flex-col gap-2 z-10",
                device !== 'desktop' && "rounded-[28px]"
              )}>
                <span className="text-red-500">Failed to load page</span>
                <button
                  className="text-blue-500 hover:underline text-sm"
                  type="button"
                  onClick={() => {
                    if (currentUrl) {
                      setIsLoading(true)
                      setError(null)
                      const newUrl = new URL(currentUrl)
                      newUrl.searchParams.set('t', Date.now().toString())
                      setCurrentUrl(newUrl.toString())
                    }
                  }}
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-xs text-muted-foreground">
              <div className="h-10 w-10 rounded-full border-2 border-dashed border-border animate-spin" />
              <p className="text-center max-w-[220px]">
                {restoreError === 'missing_files'
                  ? 'Preview can’t be restored yet for this project. Generate the app again to start a new preview.'
                  : restoreError === 'unknown'
                    ? 'Preview couldn’t be restored. Please try again.'
                    : isRestoringEnvironment
                      ? 'Restoring your environment...'
                      : 'Preview will appear here once your app is generated or the sandbox is running.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
