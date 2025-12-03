'use client'

import { Chat } from '../chat'
import { FileExplorer } from '../file-explorer'
import { Horizontal } from '@/components/layout/panels'
import { Logs } from '../logs'
import { Preview } from '../preview'
import { Sandbox } from '../sandbox'
import { TabContent, TabItem } from '@/components/tabs'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSandboxStore, useFileExplorerStore } from '../state'
import { useAuth } from '@clerk/nextjs'

interface ProjectResponse {
  id: string
  name: string
  initial_prompt: string | null
  sandbox_state: {
    sandboxId?: string
    paths?: string[]
    url?: string
    urlUUID?: string
  } | null
}

export default function WorkspacePage() {
  const searchParams = useSearchParams()
  const promptFromUrl = searchParams.get('prompt')
  const projectId = searchParams.get('projectId')
  const [initialPrompt, setInitialPrompt] = useState<string>('')
  const { userId } = useAuth()
  const [horizontalSizes, setHorizontalSizes] = useState<[number, number] | null>(
    null
  )
  const { sandboxId, paths: sandboxPaths, url, urlUUID } = useSandboxStore()

  useEffect(() => {
    const sandboxState = useSandboxStore.getState()
    const fileExplorerState = useFileExplorerStore.getState()

    sandboxState.reset()
    fileExplorerState.reset()

    return () => {
      useSandboxStore.getState().reset()
      useFileExplorerStore.getState().reset()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadProject() {
      if (!userId) return
      if (projectId) {
        try {
          const response = await fetch(`/api/projects/${projectId}`)
          if (!response.ok) {
            console.error('Failed to load project')
            return
          }
          const project = (await response.json()) as ProjectResponse
          if (cancelled) return

          setInitialPrompt(project.initial_prompt ?? '')

          const sandboxState = useSandboxStore.getState()
          const fileExplorerState = useFileExplorerStore.getState()
          sandboxState.reset()
          fileExplorerState.reset()

          if (project.sandbox_state) {
            const { sandboxId, paths, url, urlUUID } = project.sandbox_state
            if (sandboxId) {
              sandboxState.setSandboxId(sandboxId)
            }
            if (Array.isArray(paths) && paths.length > 0) {
              sandboxState.addPaths(paths)
            }
            if (url) {
              sandboxState.setUrl(url, urlUUID || sandboxState.urlUUID || crypto.randomUUID())
            }
          }
        } catch (error) {
          console.error('Error loading project', error)
        }
      } else if (promptFromUrl) {
        const decoded = decodeURIComponent(promptFromUrl)
        setInitialPrompt(decoded)
      }
    }

    loadProject()

    return () => {
      cancelled = true
    }
  }, [projectId, promptFromUrl])

  useEffect(() => {
    if (!projectId) return

    const timeoutId = window.setTimeout(async () => {
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sandboxState: {
              sandboxId,
              paths: sandboxPaths,
              url,
              urlUUID,
            },
          }),
        })
      } catch (error) {
        console.error('Failed to save project state', error)
      }
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [projectId, sandboxId, sandboxPaths, url, urlUUID])

  return (
    <>
      <AppSidebar />
      <div className="flex flex-col h-screen max-h-screen overflow-hidden">
        <ul className="flex space-x-5 font-mono text-sm tracking-tight px-1 py-2 md:hidden border-b border-border">
          <TabItem tabId="chat">Chat</TabItem>
          <TabItem tabId="preview">Preview</TabItem>
          <TabItem tabId="file-explorer">File Explorer</TabItem>
          <TabItem tabId="logs">Logs</TabItem>
        </ul>

        <div className="flex flex-1 w-full overflow-hidden md:hidden">
          <TabContent tabId="chat" className="flex-1">
            <Chat
              key={projectId ?? 'default'}
              className="flex-1 overflow-hidden"
              initialPrompt={initialPrompt}
            />
          </TabContent>
          <TabContent tabId="preview" className="flex-1">
            <Preview className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="file-explorer" className="flex-1">
            <FileExplorer className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="logs" className="flex-1">
            <Logs className="flex-1 overflow-hidden" />
          </TabContent>
        </div>

        <div className="hidden flex-1 w-full min-h-0 overflow-hidden md:flex">
          <Horizontal
            defaultLayout={horizontalSizes ?? [35, 65]}
            left={
              <Chat
                key={projectId ?? 'default'}
                className="flex-1 overflow-hidden"
                initialPrompt={initialPrompt}
              />
            }
            right={
              <Sandbox
                key={projectId ?? 'default'}
                className="flex-1 overflow-hidden"
              />
            }
          />
        </div>
      </div>
    </>
  )
}
