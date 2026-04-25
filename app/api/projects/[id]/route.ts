import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  deleteProject,
  getProject,
  renameProject,
  updateProjectSandboxState,
  updateProjectCloudEnabled,
  updateProjectPreviewImageUrl,
  updateProjectChatState,
} from '@/lib/projects-db'
import { auth } from '@clerk/nextjs/server'

interface ProjectParams {
  id: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<ProjectParams> }
) {
  const projectParams = await params
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const project = await getProject(userId, projectParams.id)
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<ProjectParams> }
) {
  const projectParams = await params
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as {
    name?: string
    sandboxState?: unknown
    cloudEnabled?: boolean
    previewImageUrl?: string
    chatState?: unknown
  }

  let project = null

  if (typeof body.name === 'string' && body.name.trim()) {
    project = await renameProject(userId, projectParams.id, body.name.trim())
  }

  if (body.sandboxState !== undefined) {
    project = await updateProjectSandboxState(userId, projectParams.id, body.sandboxState)
  }

  if (typeof body.cloudEnabled === 'boolean') {
    project = await updateProjectCloudEnabled(userId, projectParams.id, body.cloudEnabled)
  }

  if (typeof body.previewImageUrl === 'string') {
    project = await updateProjectPreviewImageUrl(userId, projectParams.id, body.previewImageUrl)
  }

  if (body.chatState !== undefined) {
    project = await updateProjectChatState(userId, projectParams.id, body.chatState)
  }

  if (!project) {
    project = await getProject(userId, projectParams.id)
  }

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<ProjectParams> }
) {
  const projectParams = await params
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await deleteProject(userId, projectParams.id)
  return NextResponse.json({ ok: true })
}
