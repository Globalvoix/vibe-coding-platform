import { NextResponse } from 'next/server'
import {
  deleteProject,
  getProject,
  renameProject,
  updateProjectSandboxState,
} from '@/lib/projects-db'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  _req: Request,
  { params }: any
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const project = await getProject(userId, params.id)
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function PATCH(req: Request, { params }: any) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as {
    name?: string
    sandboxState?: unknown
  }

  let project = null

  if (typeof body.name === 'string' && body.name.trim()) {
    project = await renameProject(userId, params.id, body.name.trim())
  }

  if (body.sandboxState !== undefined) {
    project = await updateProjectSandboxState(userId, params.id, body.sandboxState)
  }

  if (!project) {
    project = await getProject(userId, params.id)
  }

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function DELETE(
  _req: Request,
  { params }: any
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await deleteProject(userId, params.id)
  return NextResponse.json({ ok: true })
}
