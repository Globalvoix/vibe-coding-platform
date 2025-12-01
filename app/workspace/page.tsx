"use client";

"use client";

import { Chat } from '../chat'
import { FileExplorer } from '../file-explorer'
import { Header } from '../header'
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

export default function WorkspacePage() {
  const searchParams = useSearchParams()
  const prompt = searchParams.get('prompt')
  const [initialPrompt, setInitialPrompt] = useState<string>('')
  const [horizontalSizes, setHorizontalSizes] = useState<[number, number] | null>(null)
  const { createApp, currentAppId } = useAppStore()
  const hasCreatedAppFromPromptRef = useRef(false)

  useEffect(() => {
    if (prompt) {
      const decoded = decodeURIComponent(prompt)
      setInitialPrompt(decoded)

      if (!hasCreatedAppFromPromptRef.current && decoded.trim()) {
        const name = decoded.length > 60 ? decoded.slice(0, 57) + '...' : decoded
        createApp(name, decoded)
        hasCreatedAppFromPromptRef.current = true
      }
    }
  }, [prompt, createApp])

  useEffect(() => {
    useSandboxStore.getState().reset()
    useFileExplorerStore.getState().reset()
  }, [currentAppId])

  return (
    <>
      <AppSidebar />
      <div className="flex flex-col h-screen max-h-screen overflow-hidden p-2 space-x-2">
        <Header className="flex items-center w-full" />
        <ul className="flex space-x-5 font-mono text-sm tracking-tight px-1 py-2 md:hidden">
          <TabItem tabId="chat">Chat</TabItem>
          <TabItem tabId="preview">Preview</TabItem>
          <TabItem tabId="file-explorer">File Explorer</TabItem>
          <TabItem tabId="logs">Logs</TabItem>
        </ul>

        {/* Mobile layout tabs taking the whole space*/}
        <div className="flex flex-1 w-full overflow-hidden pt-2 md:hidden">
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

        {/* Desktop layout with horizontal and vertical panels */}
        <div className="hidden flex-1 w-full min-h-0 overflow-hidden pt-2 md:flex">
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
