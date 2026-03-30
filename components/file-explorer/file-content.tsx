'use client'

import { MonacoEditor } from './monaco-editor'
import { PulseLoader } from 'react-spinners'
import { memo } from 'react'
import { useSandboxStore } from '@/app/state'
import useSWR from 'swr'

interface Props {
  sandboxId: string
  path: string
}

export const FileContent = memo(function FileContent({ sandboxId, path }: Props) {
  const { fileContents } = useSandboxStore()

  // If we have the content from the streamed data-part, use it immediately
  const cachedContent = fileContents[path]

  const searchParams = new URLSearchParams({ path })
  const fetched = useSWR(
    // Only fetch if we don't already have the content cached
    !cachedContent ? `/api/sandboxes/${sandboxId}/files?${searchParams.toString()}` : null,
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) return null
      return response.text()
    },
    { refreshInterval: 2000 }
  )

  const code = cachedContent ?? fetched.data ?? null

  if (code === null) {
    if (fetched.isLoading || !cachedContent) {
      return (
        <div className="absolute w-full h-full flex items-center text-center">
          <div className="flex-1">
            <PulseLoader className="opacity-60" size={8} />
          </div>
        </div>
      )
    }
  }

  return (
    <div className="absolute inset-0">
      <MonacoEditor path={path} code={code ?? ''} readOnly={false} />
    </div>
  )
})
