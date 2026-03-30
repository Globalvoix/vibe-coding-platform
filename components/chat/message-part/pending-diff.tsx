'use client'

import { useSandboxStore } from '@/app/state'
import { PendingDiffCard } from '@/components/diff/pending-diff-card'
import { useCallback } from 'react'

interface Props {
  pendingId: string
  sandboxId: string
  sessionId: string
  projectId: string
  diffs: Array<{
    path: string
    action: 'create' | 'modify' | 'delete'
    content: string
    description: string
  }>
  totalFiles: number
  summary: string
}

export function PendingDiffPart({
  pendingId,
  sandboxId,
  sessionId,
  projectId,
  diffs,
  totalFiles,
  summary,
}: Props) {
  const { setPendingDiffResolved } = useSandboxStore()

  const handleDecision = useCallback(
    (_decision: 'approved' | 'rejected', _appliedFiles: number) => {
      setPendingDiffResolved(true)
    },
    [setPendingDiffResolved]
  )

  return (
    <PendingDiffCard
      pendingId={pendingId}
      sandboxId={sandboxId}
      projectId={projectId}
      diffs={diffs}
      summary={summary}
      onDecision={handleDecision}
    />
  )
}
