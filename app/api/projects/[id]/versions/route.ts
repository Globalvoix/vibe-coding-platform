import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  listProjectVersions,
  getProject,
  updateProjectSandboxState,
  getProjectVersion,
  createProjectVersion,
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

  const versions = await listProjectVersions(userId, projectParams.id)
  return NextResponse.json(versions)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<ProjectParams> }
) {
  const projectParams = await params
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const project = await getProject(userId, projectParams.id)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string
    versionId?: string
  }

  if (body.action === 'revert' && body.versionId) {
    const version = await getProjectVersion(userId, body.versionId)
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    const updated = await updateProjectSandboxState(userId, projectParams.id, version.sandbox_state)
    return NextResponse.json(updated)
  }

  if (body.action === 'save') {
    const body2 = (await req.json().catch(() => ({}))) as {
      action?: string
      versionId?: string
      name?: string
    }
    const name = body2.name || `Version at ${new Date().toLocaleString()}`
    const created = await createProjectVersion(userId, projectParams.id, name, project.sandbox_state)
    return NextResponse.json(created)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
