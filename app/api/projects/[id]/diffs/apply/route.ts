import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getPendingDiffs, resolvePendingDiffs } from '@/lib/diff'
import { Sandbox } from 'e2b'
import { appendEvent } from '@/lib/orchestrator/event-log'

interface Params {
  params: Promise<{ id: string }>
}

interface ApplyBody {
  pendingId: string
  decision: 'approved' | 'rejected'
}

export async function POST(req: Request, { params }: Params) {
  const { id: projectId } = await params

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ApplyBody
  try {
    body = (await req.json()) as ApplyBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { pendingId, decision } = body

  if (!pendingId || !decision) {
    return NextResponse.json({ error: 'pendingId and decision are required' }, { status: 400 })
  }

  // Fetch the pending diffs
  const record = await getPendingDiffs(pendingId)
  if (!record) {
    return NextResponse.json({ error: 'Pending diff not found' }, { status: 404 })
  }

  if (record.status !== 'pending') {
    return NextResponse.json(
      { error: `Diff already resolved with status: ${record.status}` },
      { status: 409 }
    )
  }

  // Verify project ownership
  if (record.projectId !== projectId) {
    return NextResponse.json({ error: 'Project ID mismatch' }, { status: 403 })
  }

  // Mark as resolved
  await resolvePendingDiffs(pendingId, decision)

  if (decision === 'rejected') {
    await appendEvent({
      sessionId: record.sessionId,
      projectId,
      userId,
      eventType: 'diff_rejected',
      data: { pendingId },
    })
    return NextResponse.json({ success: true, decision: 'rejected', appliedFiles: 0 })
  }

  // ── APPROVED: Write files to E2B sandbox ──────────────────────────────
  let sandbox: Sandbox
  try {
    sandbox = await Sandbox.connect(record.sandboxId, { apiKey: process.env.E2B_API_KEY })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cannot connect to sandbox'
    return NextResponse.json({ error: `Sandbox connect failed: ${msg}` }, { status: 500 })
  }

  const appliedPaths: string[] = []
  const errors: string[] = []

  for (const diff of record.diffs) {
    try {
      if (diff.action === 'delete') {
        await sandbox.files.remove(diff.path)
      } else {
        // create or modify
        await sandbox.files.write(diff.path, diff.content)
      }
      appliedPaths.push(diff.path)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${diff.path}: ${msg}`)
      console.error(`[diffs/apply] Failed to write ${diff.path}:`, err)
    }
  }

  await appendEvent({
    sessionId: record.sessionId,
    projectId,
    userId,
    eventType: 'diff_applied',
    data: { pendingId, appliedFiles: appliedPaths.length, errors },
  })

  if (errors.length > 0) {
    return NextResponse.json(
      { success: false, appliedFiles: appliedPaths.length, errors },
      { status: 207 }
    )
  }

  return NextResponse.json({
    success: true,
    decision: 'approved',
    appliedFiles: appliedPaths.length,
    paths: appliedPaths,
  })
}
