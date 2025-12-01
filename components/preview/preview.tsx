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
  hideControls?: boolean
  onUrlChange?: (url: string) => void
  onInputChange?: (value: string) => void
  onLoadingChange?: (loading: boolean) => void
  onRefreshRef?: React.MutableRefObject<(() => void) | null>
}

export function Preview({
  className,
  disabled,
  url,
  hideControls,
  onUrlChange,
  onInputChange,
  onLoadingChange,
  onRefreshRef,
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
      <div className="flex h-full flex-col relative">
        {currentUrl && !disabled && (
          <>
            <ScrollArea className="w-full flex-1">
              <iframe
                ref={iframeRef}
                src={currentUrl}
                className="w-full h-full"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title="Browser content"
              />
            </ScrollArea>

            {isLoading && !error && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center flex-col gap-2">
                <BarLoader color="#666" />
                <span className="text-gray-500 text-xs">Loading...</span>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 bg-white flex items-center justify-center flex-col gap-2">
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
          </>
        )}
      </div>
    </Panel>
  )
}
