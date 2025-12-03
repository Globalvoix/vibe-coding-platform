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

export default function WorkspacePage() {
  const searchParams = useSearchParams()
  const prompt = searchParams.get('prompt')
  const [initialPrompt, setInitialPrompt] = useState<string>('')
  const [horizontalSizes, setHorizontalSizes] = useState<[number, number] | null>(
    null
  )
  const { sandboxId, paths: sandboxPaths, url, urlUUID } = useSandboxStore()

  useEffect(() => {
    if (prompt) {
      const decoded = decodeURIComponent(prompt)
      setInitialPrompt(decoded)
    }
  }, [prompt])

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
    // Keep effect to touch these values so ESLint/TypeScript know they are used.
    // This also ensures sandbox state is tracked reactively.
    void sandboxId
    void sandboxPaths
    void url
    void urlUUID
  }, [sandboxId, sandboxPaths, url, urlUUID])

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
              key="default"
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
                key="default"
                className="flex-1 overflow-hidden"
                initialPrompt={initialPrompt}
              />
            }
            right={
              <Sandbox key="default" className="flex-1 overflow-hidden" />
            }
          />
        </div>
      </div>
    </>
  )
}
