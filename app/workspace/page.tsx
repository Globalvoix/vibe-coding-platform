'use client'

import { Chat } from '../chat'
import { FileExplorer } from '../file-explorer'
import { Horizontal } from '@/components/layout/panels'
import { Logs } from '../logs'
import { Preview } from '../preview'
import { Sandbox } from '../sandbox'
import { TabContent, TabItem } from '@/components/tabs'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { useAppStore } from '@/lib/app-store'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useSandboxStore, useFileExplorerStore } from '../state'
import { useAuth } from '@clerk/nextjs'
import { createAppAction, saveAppStateAction } from '@/app/actions/apps'
import { useAppsSync } from '@/hooks/useAppsSync'

export default function WorkspacePage() {
  const searchParams = useSearchParams()
  const prompt = searchParams.get('prompt')
  const [initialPrompt, setInitialPrompt] = useState<string>('')
  const [horizontalSizes, setHorizontalSizes] = useState<[number, number] | null>(null)
  const { currentAppId, setCurrentApp } = useAppStore()
  const hasCreatedAppFromPromptRef = useRef(false)
  const { userId } = useAuth()
  const { sandboxId, paths: sandboxPaths, url, urlUUID } = useSandboxStore()
  const { apps } = useAppsSync()

  const currentApp = apps.find((a) => a.id === currentAppId)

  useEffect(() => {
    if (prompt) {
      const decoded = decodeURIComponent(prompt)
      setInitialPrompt(decoded)

      if (!hasCreatedAppFromPromptRef.current && decoded.trim()) {
        const name = decoded.length > 60 ? decoded.slice(0, 57) + '...' : decoded

        createAppAction(name, decoded).then((newApp) => {
          if (newApp) {
            setCurrentApp(newApp.id)
          }
        })

        hasCreatedAppFromPromptRef.current = true
      }
    }
  }, [prompt, setCurrentApp])

  useEffect(() => {
    const sandboxState = useSandboxStore.getState()
    const fileExplorerState = useFileExplorerStore.getState()

    sandboxState.reset()
    fileExplorerState.reset()

    if (currentApp?.files) {
      const filesSnapshot = currentApp.files as
        | { sandboxId?: string; paths?: string[]; url?: string; urlUUID?: string }
        | undefined

      if (filesSnapshot) {
        if (filesSnapshot.sandboxId) {
          sandboxState.setSandboxId(filesSnapshot.sandboxId)
        }

        if (Array.isArray(filesSnapshot.paths) && filesSnapshot.paths.length > 0) {
          sandboxState.addPaths(filesSnapshot.paths)
        }

        if (filesSnapshot.url) {
          sandboxState.setUrl(
            filesSnapshot.url,
            filesSnapshot.urlUUID || sandboxState.urlUUID || crypto.randomUUID()
          )
        }
      }
    }
  }, [currentAppId, currentApp])

  useEffect(() => {
    if (!currentAppId) return

    const saveState = async () => {
      try {
        await saveAppStateAction(currentAppId, {
          sandboxId,
          paths: sandboxPaths,
          url,
          urlUUID,
        })
      } catch (error) {
        console.error('Failed to save app state:', error)
      }
    }

    const timeoutId = setTimeout(saveState, 1000)

    return () => clearTimeout(timeoutId)
  }, [currentAppId, sandboxId, sandboxPaths, url, urlUUID])

  useEffect(() => {
    return () => {
      useSandboxStore.getState().reset()
      useFileExplorerStore.getState().reset()
    }
  }, [])

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
              key={currentAppId ?? 'default'}
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
                key={currentAppId ?? 'default'}
                className="flex-1 overflow-hidden"
                initialPrompt={initialPrompt}
              />
            }
            right={
              <Sandbox
                key={currentAppId ?? 'default'}
                className="flex-1 overflow-hidden"
              />
            }
          />
        </div>
      </div>
    </>
  )
}
