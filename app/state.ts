import type { Command, CommandLog } from '@/components/commands-logs/types'
import type { DataPart } from '@/ai/messages/data-parts'
import type { ChatStatus, DataUIPart } from 'ai'
import { useMonitorState } from '@/components/error-monitor/state'
import { useMemo } from 'react'
import { create } from 'zustand'

interface ViewingVersion {
  id: string
  name: string
  sandboxState: {
    sandboxId?: string
    paths?: string[]
    url?: string
  } | null
}

interface SandboxStore {
  addGeneratedFiles: (files: string[]) => void
  addLog: (data: { sandboxId: string; cmdId: string; log: CommandLog }) => void
  addPaths: (paths: string[]) => void
  applySandboxState: (sandboxState: ViewingVersion['sandboxState']) => void
  chatStatus: ChatStatus
  clearGeneratedFiles: () => void
  commands: Command[]
  generatedFiles: Set<string>
  paths: string[]
  reset: () => void
  sandboxId?: string
  currentProjectId?: string | null
  setCurrentProjectId: (id: string | null) => void
  setChatStatus: (status: ChatStatus) => void
  setRevertInChatVersionId: (versionId: string | null) => void
  setSandboxId: (id: string) => void
  setStatus: (status: 'running' | 'stopped') => void
  setUrl: (url: string) => void
  setViewingVersion: (version: ViewingVersion | null) => void
  status?: 'running' | 'stopped'
  upsertCommand: (command: Omit<Command, 'startedAt'>) => void
  url?: string
  viewingVersion: ViewingVersion | null
  revertInChatVersionId: string | null
  device: 'desktop' | 'tablet' | 'mobile'
  setDevice: (device: 'desktop' | 'tablet' | 'mobile') => void
}

function getBackgroundCommandErrorLines(commands: Command[]) {
  return commands
    .flatMap(({ command, args, background, logs = [] }) =>
      logs.map((log) => ({ command, args, background, ...log }))
    )
    .sort((logA, logB) => logA.timestamp - logB.timestamp)
    .filter((log) => log.stream === 'stderr' && log.background)
}

export function useCommandErrorsLogs() {
  const { commands } = useSandboxStore()
  const errors = useMemo(
    () => getBackgroundCommandErrorLines(commands),
    [commands]
  )
  return { errors }
}

export const useSandboxStore = create<SandboxStore>()((set) => ({
  addGeneratedFiles: (files) =>
    set((state) => ({
      generatedFiles: new Set([...state.generatedFiles, ...files]),
    })),
  addLog: (data) => {
    set((state) => {
      const idx = state.commands.findIndex((c) => c.cmdId === data.cmdId)
      if (idx === -1) {
        console.warn(`Command with ID ${data.cmdId} not found.`)
        return state
      }
      const updatedCmds = [...state.commands]
      updatedCmds[idx] = {
        ...updatedCmds[idx],
        logs: [...(updatedCmds[idx].logs ?? []), data.log],
      }
      return { commands: updatedCmds }
    })
  },
  addPaths: (paths) =>
    set((state) => ({ paths: [...new Set([...state.paths, ...paths])] })),
  applySandboxState: (sandboxState) =>
    set((state) => {
      if (!sandboxState) {
        return state
      }

      const nextPaths = Array.isArray(sandboxState.paths) ? sandboxState.paths : []
      const nextUrl = typeof sandboxState.url === 'string' ? sandboxState.url : undefined

      const nextSandboxId = sandboxState.sandboxId ?? state.sandboxId

      return {
        sandboxId: nextSandboxId,
        status: nextSandboxId ? 'running' : state.status,
        paths: nextPaths.length > 0 ? nextPaths : state.paths,
        url: nextUrl,
      }
    }),
  chatStatus: 'ready',
  viewingVersion: null,
  revertInChatVersionId: null,
  device: 'desktop',
  setDevice: (device) => set(() => ({ device })),
  clearGeneratedFiles: () => set(() => ({ generatedFiles: new Set<string>() })),
  commands: [],
  generatedFiles: new Set<string>(),
  paths: [],
  currentProjectId: null,
  setCurrentProjectId: (id) => set(() => ({ currentProjectId: id })),
  setViewingVersion: (version) => set(() => ({ viewingVersion: version })),
  setRevertInChatVersionId: (versionId) => set(() => ({ revertInChatVersionId: versionId })),
  reset: () =>
    set(() => ({
      sandboxId: undefined,
      currentProjectId: null,
      commands: [],
      paths: [],
      url: undefined,
      generatedFiles: new Set<string>(),
      status: undefined,
      chatStatus: 'ready',
      viewingVersion: null,
      revertInChatVersionId: null,
    })),
  setChatStatus: (status) =>
    set((state) =>
      state.chatStatus === status ? state : { chatStatus: status }
    ),
  setSandboxId: (sandboxId) =>
    set(() => ({
      sandboxId,
      status: 'running',
      commands: [],
      paths: [],
      url: undefined,
      generatedFiles: new Set<string>(),
    })),
  setStatus: (status) => set(() => ({ status })),
  setUrl: (url) => set(() => ({ url })),
  upsertCommand: (cmd) => {
    set((state) => {
      const existingIdx = state.commands.findIndex((c) => c.cmdId === cmd.cmdId)
      const idx = existingIdx !== -1 ? existingIdx : state.commands.length
      const prev = state.commands[idx] ?? { startedAt: Date.now(), logs: [] }
      const cmds = [...state.commands]
      cmds[idx] = { ...prev, ...cmd }
      return { commands: cmds }
    })
  },
}))

interface FileExplorerStore {
  paths: string[]
  addPath: (path: string) => void
  reset: () => void
}

export const useFileExplorerStore = create<FileExplorerStore>()((set) => ({
  paths: [],
  addPath: (path) => {
    set((state) => {
      if (!state.paths.includes(path)) {
        return { paths: [...state.paths, path] }
      }
      return state
    })
  },
  reset: () => set(() => ({ paths: [] })),
}))

export function useDataStateMapper() {
  const { addPaths, setSandboxId, setUrl, upsertCommand, addGeneratedFiles } =
    useSandboxStore()
  const { errors } = useCommandErrorsLogs()
  const { setCursor } = useMonitorState()

  return (data: DataUIPart<DataPart>) => {
    switch (data.type) {
      case 'data-create-sandbox':
        if (data.data.sandboxId) {
          setSandboxId(data.data.sandboxId)
        }
        break
      case 'data-generating-files':
        if (data.data.status === 'uploaded') {
          setCursor(errors.length)
          addPaths(data.data.paths)
          addGeneratedFiles(data.data.paths)
        }
        break
      case 'data-run-command':
        if (
          data.data.commandId &&
          (data.data.status === 'executing' || data.data.status === 'running')
        ) {
          upsertCommand({
            background: data.data.status === 'running',
            sandboxId: data.data.sandboxId,
            cmdId: data.data.commandId,
            command: data.data.command,
            args: data.data.args,
          })
        }
        break
      case 'data-get-sandbox-url':
        if (data.data.url) {
          setUrl(data.data.url)
        }
        break
      default:
        break
    }
  }
}
