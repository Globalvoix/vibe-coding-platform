import { NextResponse } from 'next/server'
import {
  deleteProject,
  getProject,
  renameProject,
  updateProjectSandboxState,
} from '@/lib/projects-db'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const project = await getProject(userId, params.id)
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
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
  req: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  await deleteProject(userId, params.id)
  return NextResponse.json({ ok: true })
}
