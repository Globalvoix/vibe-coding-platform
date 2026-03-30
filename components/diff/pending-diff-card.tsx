'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { CheckIcon, XIcon, ChevronDownIcon, ChevronRightIcon, FileIcon, FilePlusIcon, FileMinusIcon, AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSandboxStore } from '@/app/state'

const MonacoDiffEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.DiffEditor),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Loading editor…</div> }
)

export interface PendingDiffFile {
  path: string
  action: 'create' | 'modify' | 'delete'
  content: string
  description: string
}

interface Props {
  pendingId: string
  sandboxId: string
  projectId: string
  diffs: PendingDiffFile[]
  summary: string
  onDecision?: (decision: 'approved' | 'rejected', appliedFiles: number) => void
}

function ActionBadge({ action }: { action: PendingDiffFile['action'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide',
        action === 'create' && 'bg-green-100 text-green-700',
        action === 'modify' && 'bg-blue-100 text-blue-700',
        action === 'delete' && 'bg-red-100 text-red-700'
      )}
    >
      {action === 'create' && <FilePlusIcon className="w-2.5 h-2.5" />}
      {action === 'modify' && <FileIcon className="w-2.5 h-2.5" />}
      {action === 'delete' && <FileMinusIcon className="w-2.5 h-2.5" />}
      {action}
    </span>
  )
}

export function PendingDiffCard({ pendingId, sandboxId, projectId, diffs, summary, onDecision }: Props) {
  const [selectedFile, setSelectedFile] = useState<PendingDiffFile | null>(diffs[0] ?? null)
  const [expanded, setExpanded] = useState(true)
  const [applying, setApplying] = useState(false)
  const [resolved, setResolved] = useState<'approved' | 'rejected' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { fileContents } = useSandboxStore()

  const handleDecision = useCallback(async (decision: 'approved' | 'rejected') => {
    setApplying(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/diffs/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingId, decision }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Server error: ${res.status}`)
      }

      const data = (await res.json()) as { appliedFiles?: number }
      setResolved(decision)
      onDecision?.(decision, data.appliedFiles ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply changes')
    } finally {
      setApplying(false)
    }
  }, [pendingId, projectId, onDecision])

  const beforeContent = selectedFile
    ? (fileContents[selectedFile.path] ?? '')
    : ''

  const afterContent = selectedFile
    ? (selectedFile.action === 'delete' ? '' : selectedFile.content)
    : ''

  const getLanguage = (path: string) => {
    if (path.endsWith('.tsx') || path.endsWith('.jsx')) return 'typescriptreact'
    if (path.endsWith('.ts')) return 'typescript'
    if (path.endsWith('.js')) return 'javascript'
    if (path.endsWith('.json')) return 'json'
    if (path.endsWith('.css') || path.endsWith('.scss')) return 'css'
    if (path.endsWith('.md')) return 'markdown'
    if (path.endsWith('.html')) return 'html'
    return 'plaintext'
  }

  if (resolved) {
    return (
      <div className={cn(
        'flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium',
        resolved === 'approved'
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-neutral-50 border-neutral-200 text-neutral-600'
      )}>
        {resolved === 'approved' ? (
          <>
            <CheckIcon className="w-4 h-4 text-green-600 shrink-0" />
            Changes applied — {diffs.length} file{diffs.length > 1 ? 's' : ''} written to sandbox.
          </>
        ) : (
          <>
            <XIcon className="w-4 h-4 text-neutral-500 shrink-0" />
            Changes discarded.
          </>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-black/[0.08] bg-[#FAFAF9] shadow-sm overflow-hidden w-full max-w-[740px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] bg-white">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-left min-w-0"
        >
          {expanded
            ? <ChevronDownIcon className="w-4 h-4 text-foreground/40 shrink-0" />
            : <ChevronRightIcon className="w-4 h-4 text-foreground/40 shrink-0" />
          }
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground/90 truncate">
              Review changes before applying
            </p>
            <p className="text-[11px] text-foreground/55 mt-0.5">{summary}</p>
          </div>
        </button>

        {/* Approve / Reject */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {error && (
            <span className="flex items-center gap-1 text-[11px] text-red-600">
              <AlertCircleIcon className="w-3.5 h-3.5" />
              {error}
            </span>
          )}
          <button
            onClick={() => handleDecision('rejected')}
            disabled={applying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-black/[0.08] bg-white hover:bg-neutral-50 text-[12px] font-semibold text-foreground/70 disabled:opacity-40 transition-colors"
          >
            <XIcon className="w-3.5 h-3.5" />
            Discard
          </button>
          <button
            onClick={() => handleDecision('approved')}
            disabled={applying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F172A] hover:bg-[#1A202C] text-white text-[12px] font-semibold disabled:opacity-40 transition-colors"
          >
            {applying ? (
              <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckIcon className="w-3.5 h-3.5" />
            )}
            {applying ? 'Applying…' : 'Apply Changes'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex" style={{ height: 360 }}>
          {/* File list sidebar */}
          <div className="w-52 shrink-0 border-r border-black/[0.06] overflow-y-auto bg-white">
            {diffs.map((diff) => (
              <button
                key={diff.path}
                onClick={() => setSelectedFile(diff)}
                className={cn(
                  'w-full flex flex-col gap-0.5 px-3 py-2 text-left border-b border-black/[0.04] transition-colors text-[12px]',
                  selectedFile?.path === diff.path
                    ? 'bg-[#F0F4FF] text-[#1A73E8]'
                    : 'hover:bg-[#FAFAF9] text-foreground/70'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate font-medium text-[11px]">
                    {diff.path.split('/').pop()}
                  </span>
                  <ActionBadge action={diff.action} />
                </div>
                <span className="truncate text-[10px] text-foreground/40">
                  {diff.path}
                </span>
              </button>
            ))}
          </div>

          {/* Monaco diff editor */}
          <div className="flex-1 min-w-0">
            {selectedFile ? (
              <MonacoDiffEditor
                original={beforeContent}
                modified={afterContent}
                language={getLanguage(selectedFile.path)}
                theme="vs"
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  glyphMargin: false,
                  folding: false,
                  scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Select a file to preview changes
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
