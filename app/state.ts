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

export type SandboxTabId = 'preview' | 'code' | 'console' | 'cloud' | 'security'

// ── Agent pipeline state ──────────────────────────────────────────────────

export type AgentName = 'historian' | 'architect' | 'craftsman' | 'adversary' | 'synthesizer' | 'executor'
export type AgentStatus = 'idle' | 'starting' | 'running' | 'done' | 'error'

export interface AgentState {
  name: AgentName
  status: AgentStatus
  message?: string
  startedAt?: number
  finishedAt?: number
  durationMs?: number
}

export interface SubtaskThread {
  threadId: string
  groupId: string
  description: string
  status: 'starting' | 'running' | 'done' | 'error'
  filesHandled: string[]
}

// ── Pending diff types ────────────────────────────────────────────────────

export interface PendingDiffFile {
  path: string
  action: 'create' | 'modify' | 'delete'
  content: string
  description: string
}

export interface PendingDiff {
  pendingId: string
  sandboxId: string
  sessionId: string
  projectId: string
  diffs: PendingDiffFile[]
  totalFiles: number
  summary: string
}

// ── Main store ────────────────────────────────────────────────────────────

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
  clearUrl: () => void
  setViewingVersion: (version: ViewingVersion | null) => void
  status?: 'running' | 'stopped'
  upsertCommand: (command: Omit<Command, 'startedAt'>) => void
  url?: string
  viewingVersion: ViewingVersion | null
  revertInChatVersionId: string | null
  device: 'desktop' | 'tablet' | 'mobile'
  setDevice: (device: 'desktop' | 'tablet' | 'mobile') => void
  activeTab: SandboxTabId
  setActiveTab: (tab: SandboxTabId) => void
  isRestoringEnvironment: boolean
  setIsRestoringEnvironment: (restoring: boolean) => void
  restoreError: 'missing_files' | 'unknown' | null
  setRestoreError: (error: 'missing_files' | 'unknown' | null) => void
  // Monaco file content: path → content
  fileContents: Record<string, string>
  setFileContent: (path: string, content: string) => void
  // ── Agent pipeline state ──────────────────────────────────────────────
  agents: Record<AgentName, AgentState>
  setAgentStatus: (name: AgentName, status: AgentStatus, message?: string, durationMs?: number) => void
  subtaskThreads: SubtaskThread[]
  upsertSubtaskThread: (thread: SubtaskThread) => void
  clearAgentPipeline: () => void
  // ── Pending diff state ────────────────────────────────────────────────
  pendingDiff: PendingDiff | null
  setPendingDiff: (diff: PendingDiff | null) => void
  pendingDiffResolved: boolean
  setPendingDiffResolved: (resolved: boolean) => void
}

const DEFAULT_AGENTS: Record<AgentName, AgentState> = {
  historian: { name: 'historian', status: 'idle' },
  architect: { name: 'architect', status: 'idle' },
  craftsman: { name: 'craftsman', status: 'idle' },
  adversary: { name: 'adversary', status: 'idle' },
  synthesizer: { name: 'synthesizer', status: 'idle' },
  executor: { name: 'executor', status: 'idle' },
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
      if (!sandboxState) return state
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
  activeTab: 'preview',
  setActiveTab: (tab) => set(() => ({ activeTab: tab })),
  isRestoringEnvironment: false,
  setIsRestoringEnvironment: (restoring) => set(() => ({ isRestoringEnvironment: restoring })),
  restoreError: null,
  setRestoreError: (error) => set(() => ({ restoreError: error })),
  clearGeneratedFiles: () => set(() => ({ generatedFiles: new Set<string>() })),
  commands: [],
  generatedFiles: new Set<string>(),
  paths: [],
  currentProjectId: null,
  setCurrentProjectId: (id) => set(() => ({ currentProjectId: id })),
  setViewingVersion: (version) => set(() => ({ viewingVersion: version })),
  setRevertInChatVersionId: (versionId) => set(() => ({ revertInChatVersionId: versionId })),
  fileContents: {},
  setFileContent: (path, content) =>
    set((state) => ({ fileContents: { ...state.fileContents, [path]: content } })),
  // ── Agent pipeline ──────────────────────────────────────────────────────
  agents: { ...DEFAULT_AGENTS },
  setAgentStatus: (name, status, message, durationMs) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [name]: {
          ...state.agents[name],
          name,
          status,
          message,
          durationMs,
          startedAt: status === 'starting' ? Date.now() : state.agents[name]?.startedAt,
          finishedAt: (status === 'done' || status === 'error') ? Date.now() : state.agents[name]?.finishedAt,
        },
      },
    })),
  subtaskThreads: [],
  upsertSubtaskThread: (thread) =>
    set((state) => {
      const idx = state.subtaskThreads.findIndex((t) => t.threadId === thread.threadId)
      if (idx === -1) return { subtaskThreads: [...state.subtaskThreads, thread] }
      const updated = [...state.subtaskThreads]
      updated[idx] = thread
      return { subtaskThreads: updated }
    }),
  clearAgentPipeline: () =>
    set(() => ({
      agents: { ...DEFAULT_AGENTS },
      subtaskThreads: [],
    })),
  // ── Pending diffs ────────────────────────────────────────────────────────
  pendingDiff: null,
  setPendingDiff: (diff) => set(() => ({ pendingDiff: diff, pendingDiffResolved: false })),
  pendingDiffResolved: false,
  setPendingDiffResolved: (resolved) => set(() => ({ pendingDiffResolved: resolved })),
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
      device: 'desktop',
      activeTab: 'preview',
      isRestoringEnvironment: false,
      restoreError: null,
      fileContents: {},
      agents: { ...DEFAULT_AGENTS },
      subtaskThreads: [],
      pendingDiff: null,
      pendingDiffResolved: false,
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
      agents: { ...DEFAULT_AGENTS },
      subtaskThreads: [],
      pendingDiff: null,
      pendingDiffResolved: false,
    })),
  setStatus: (status) => set(() => ({ status })),
  setUrl: (url) => set(() => ({ url })),
  clearUrl: () => set(() => ({ url: undefined })),
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

// ── File explorer store ──────────────────────────────────────────────────

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

// ── Data state mapper hook ────────────────────────────────────────────────

export function useDataStateMapper() {
  const {
    addPaths,
    setSandboxId,
    setUrl,
    upsertCommand,
    addGeneratedFiles,
    setFileContent,
    setAgentStatus,
    upsertSubtaskThread,
    setPendingDiff,
    setPendingDiffResolved,
  } = useSandboxStore()
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
      case 'data-file-content':
        setFileContent(data.data.path, data.data.content)
        break
      // ── Agent pipeline events ─────────────────────────────────────────
      case 'data-agent-status':
        setAgentStatus(
          data.data.agentName as Parameters<typeof setAgentStatus>[0],
          data.data.status as Parameters<typeof setAgentStatus>[1],
          data.data.message,
          data.data.durationMs
        )
        break
      case 'data-subtask-thread':
        upsertSubtaskThread({
          threadId: data.data.threadId,
          groupId: data.data.groupId,
          description: data.data.description,
          status: data.data.status,
          filesHandled: data.data.filesHandled,
        })
        break
      // ── Diff preview events ────────────────────────────────────────────
      case 'data-pending-diff':
        setPendingDiff({
          pendingId: data.data.pendingId,
          sandboxId: data.data.sandboxId,
          sessionId: data.data.sessionId,
          projectId: data.data.projectId,
          diffs: data.data.diffs,
          totalFiles: data.data.totalFiles,
          summary: data.data.summary,
        })
        break
      case 'data-diff-decision':
        if (data.data.decision === 'approved' || data.data.decision === 'rejected') {
          setPendingDiffResolved(true)
        }
        break
      case 'data-adversary-findings':
      case 'data-synthesis-ready':
      case 'data-execution-retry':
        break
      default:
        break
    }
  }
}
