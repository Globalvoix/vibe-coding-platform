'use client'

import { Chat } from '../chat'
import { FileExplorer } from '../file-explorer'
import { Horizontal } from '@/components/layout/panels'
import { Logs } from '../logs'
import { Preview } from '../preview'
import { Sandbox } from '../sandbox'
import { SecurityScan } from '@/components/security-scan'
import { TabContent, TabItem } from '@/components/tabs'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { EnvVarsManager } from '@/components/env-vars/env-vars-manager'
import { useEffect, useRef, useState } from 'react'
import { useSandboxStore, useFileExplorerStore } from '../state'
import { Suspense } from 'react'
import { WorkspaceProvider } from './workspace-provider'

interface ProjectResponse {
  id: string
  name: string
  initial_prompt: string | null
  chat_state?: {
    messages?: unknown
  } | null
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
  const [projectName, setProjectName] = useState<string>('')
  const [initialChatMessages, setInitialChatMessages] = useState<unknown[] | null>(null)
  const [horizontalSizes] = useState<[number, number] | null>(null)
  const { sandboxId, paths: sandboxPaths, url, currentProjectId } = useSandboxStore()
  const lastPreviewSnapshotRef = useRef<{ url: string; capturedAt: number } | null>(null)
  const lastUrlRef = useRef<string | null>(null)

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
          setProjectName(project.name)

          const chatMessages = Array.isArray(project.chat_state?.messages)
            ? (project.chat_state?.messages as unknown[])
            : null
          setInitialChatMessages(chatMessages)

          const sandboxState = useSandboxStore.getState()

          sandboxState.setCurrentProjectId(projectId)

          sandboxState.setRestoreError(null)

          const cached = project.sandbox_state
          const hasAnySandboxState =
            !!cached &&
            (typeof cached.sandboxId === 'string' ||
              typeof cached.url === 'string' ||
              (Array.isArray(cached.paths) && cached.paths.length > 0))

          // If the project has any prior sandbox state, restore what we can immediately for a fast preview,
          // while we also try to revive / rebuild in the background.
          if (hasAnySandboxState) {
            if (cached?.sandboxId) {
              sandboxState.setSandboxId(cached.sandboxId)
            }

            // Optimistically restore the last known URL so preview loads immediately if the sandbox is still alive.
            // If the sandbox is stopped, the revive step below will update the URL.
            if (typeof cached?.url === 'string' && cached.url) {
              sandboxState.setUrl(cached.url)
            } else {
              sandboxState.clearUrl()
            }

            if (Array.isArray(cached?.paths) && cached.paths.length > 0) {
              sandboxState.addPaths(cached.paths)
            }

            sandboxState.setIsRestoringEnvironment(true)
            try {
              const reviveRes = await fetch(`/api/projects/${projectId}/sandbox/revive`, {
                method: 'POST',
              })

              if (cancelled) return

              if (reviveRes.ok) {
                const revived = (await reviveRes.json()) as {
                  sandbox_state: {
                    sandboxId?: string
                    paths?: string[]
                    url?: string
                    urlUUID?: string
                  } | null
                }

                if (revived.sandbox_state) {
                  sandboxState.applySandboxState(revived.sandbox_state)
                }
              } else if (reviveRes.status === 409) {
                // If the sandbox cannot be revived because the project has no persisted files, don't show a stale URL.
                sandboxState.clearUrl()
                sandboxState.setRestoreError('missing_files')
              } else {
                sandboxState.setRestoreError('unknown')
              }
            } catch {
              sandboxState.setRestoreError('unknown')
            } finally {
              if (!cancelled) {
                sandboxState.setIsRestoringEnvironment(false)
              }
            }
          } else if (cached) {
            sandboxState.applySandboxState(cached)
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

    // If URL just became available, trigger an immediate save instead of waiting for the debounce.
    const urlJustBecameAvailable = !lastUrlRef.current && !!url
    lastUrlRef.current = url || null

    const performSave = async () => {
      try {
        const sandboxState = {
          sandboxId: sandboxId ?? null,
          paths: sandboxPaths,
          url: url ?? null,
        }

        const body: {
          sandboxState: {
            sandboxId: string | null
            paths: string[]
            url: string | null
          }
          previewImageUrl?: string
        } = { sandboxState }

        // If we have a URL, also update the preview image URL to act as a "latest banner".
        // We store the *direct screenshot URL* returned by Microlink so it stays valid even if the sandbox later stops.
        if (url) {
          const now = Date.now()
          const last = lastPreviewSnapshotRef.current
          const shouldCapture = !last || last.url !== url || now - last.capturedAt > 5 * 60 * 1000

          if (shouldCapture) {
            try {
              // We use a shorter timeout and skip the complex JSON check if we can.
              const microlinkRes = await fetch(
                `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&ttl=30d`
              )

              if (microlinkRes.ok) {
                const microlinkJson = (await microlinkRes.json()) as {
                  data?: { screenshot?: { url?: string } }
                }
                const screenshotUrl = microlinkJson?.data?.screenshot?.url

                if (typeof screenshotUrl === 'string') {
                  body.previewImageUrl = screenshotUrl
                  lastPreviewSnapshotRef.current = { url, capturedAt: now }
                }
              }
            } catch (err) {
              console.warn('Failed to capture snapshot from Microlink:', err)
            }
          }
        }

        await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        // Also create a version entry
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
    }

    if (urlJustBecameAvailable) {
      performSave()
      return
    }

    const timeoutId = window.setTimeout(performSave, 1000)

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
          <TabItem tabId="security">Security</TabItem>
          <TabItem tabId="env-vars">Env Vars</TabItem>
          <TabItem tabId="logs">Logs</TabItem>
        </ul>

        <div className="flex flex-1 w-full overflow-hidden md:hidden">
          <TabContent tabId="chat" className="flex-1">
            <Chat
              className="flex-1 overflow-hidden"
              initialPrompt={initialPrompt}
              projectId={projectId}
              projectName={projectName}
            />
          </TabContent>
          <TabContent tabId="preview" className="flex-1">
            <Preview className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="file-explorer" className="flex-1">
            <FileExplorer className="flex-1 overflow-hidden" />
          </TabContent>
          <TabContent tabId="security" className="flex-1">
            <SecurityScan />
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
                className="flex-1 overflow-hidden"
                initialPrompt={initialPrompt}
                projectId={projectId}
                projectName={projectName}
              />
            }
            right={
              <Sandbox
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
