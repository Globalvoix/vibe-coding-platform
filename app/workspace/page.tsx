'use client'

import { Chat } from '../chat'
import { FileExplorer } from '../file-explorer'
import { Horizontal } from '@/components/layout/panels'
import { Logs } from '../logs'
import { Preview } from '../preview'
import { Sandbox } from '../sandbox'
import { TabContent, TabItem } from '@/components/tabs'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { EnvVarsManager } from '@/components/env-vars/env-vars-manager'
import { useEffect, useState } from 'react'
import { useSandboxStore, useFileExplorerStore } from '../state'
import { Suspense } from 'react'
import { WorkspaceProvider } from './workspace-provider'

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

function WorkspaceContent({
  projectId,
  promptFromUrl,
}: {
  projectId: string | null
  promptFromUrl: string | null
}) {
  const [initialPrompt, setInitialPrompt] = useState<string>('')
  const [horizontalSizes] = useState<[number, number] | null>(null)
  const { sandboxId, paths: sandboxPaths, url, currentProjectId } = useSandboxStore()

  useEffect(() => {
    const sandboxState = useSandboxStore.getState()
    const fileExplorerState = useFileExplorerStore.getState()

    // Only reset if switching to a different project
    if (sandboxState.currentProjectId && sandboxState.currentProjectId !== projectId) {
      sandboxState.reset()
      fileExplorerState.reset()
    }

    sandboxState.setCurrentProjectId(projectId)
  }, [projectId])

  useEffect(() => {
    let cancelled = false

    async function loadProject() {
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

          sandboxState.setCurrentProjectId(projectId)

          if (project.sandbox_state) {
            const { sandboxId, paths, url } = project.sandbox_state
            if (sandboxId) {
              sandboxState.setSandboxId(sandboxId)
            }
            if (Array.isArray(paths) && paths.length > 0) {
              sandboxState.addPaths(paths)
            }
            if (url) {
              sandboxState.setUrl(url)
            }

            if (sandboxId) {
              try {
                const reviveRes = await fetch(`/api/projects/${projectId}/sandbox/revive`, {
                  method: 'POST',
                })

                if (!reviveRes.ok) return

                const revived = (await reviveRes.json()) as {
                  sandbox_state: {
                    sandboxId?: string
                    paths?: string[]
                    url?: string
                    urlUUID?: string
                  } | null
                }

                if (cancelled) return

                if (revived.sandbox_state) {
                  sandboxState.applySandboxState(revived.sandbox_state)
                }
              } catch {
                // ignore
              }
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
    if (!projectId || !currentProjectId || projectId !== currentProjectId) return

    const timeoutId = window.setTimeout(async () => {
      try {
        const sandboxState = {
          sandboxId,
          paths: sandboxPaths,
          url,
        }

        await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sandboxState }),
        })

        await fetch(`/api/projects/${projectId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            name: `Version at ${new Date().toLocaleString()}`,
          }),
        })
      } catch (error) {
        console.error('Failed to save project state', error)
      }
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [projectId, currentProjectId, sandboxId, sandboxPaths, url])

  return (
    <>
      <AppSidebar />
      <div className="flex flex-col h-screen max-h-screen overflow-hidden">
        <ul className="flex space-x-5 font-mono text-sm tracking-tight px-1 py-2 md:hidden border-b border-border overflow-x-auto">
          <TabItem tabId="chat">Chat</TabItem>
          <TabItem tabId="preview">Preview</TabItem>
          <TabItem tabId="file-explorer">Files</TabItem>
          <TabItem tabId="env-vars">Env Vars</TabItem>
          <TabItem tabId="logs">Logs</TabItem>
        </ul>

        <div className="flex flex-1 w-full overflow-hidden md:hidden">
          <TabContent tabId="chat" className="flex-1">
            <Chat
              className="flex-1 overflow-hidden"
              initialPrompt={initialPrompt}
              projectId={projectId}
            />
          </TabContent>
          <TabContent tabId="preview" className="flex-1">
            <Preview className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="file-explorer" className="flex-1">
            <FileExplorer className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="env-vars" className="flex-1">
            <EnvVarsManager projectId={projectId || undefined} />
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
                projectId={projectId}
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

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="w-full h-screen flex items-center justify-center text-muted-foreground">Loading...</div>}>
      <WorkspaceProvider>
        {(projectId, promptFromUrl) => (
          <WorkspaceContent projectId={projectId} promptFromUrl={promptFromUrl} />
        )}
      </WorkspaceProvider>
    </Suspense>
  )
}
