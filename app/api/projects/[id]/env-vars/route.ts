import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getProject } from '@/lib/projects-db'
import {
  createOrUpdateEnvVar,
  getEnvVar,
  listEnvVars,
  deleteEnvVar,
} from '@/lib/env-vars-db'

interface EnvVarParams {
  id: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<EnvVarParams> }
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

  const envVars = await listEnvVars(projectParams.id)
  
  // Return env vars without exposing sensitive values in list
  const safeEnvVars = envVars.map((v) => ({
    id: v.id,
    key: v.key,
    is_sensitive: v.is_sensitive,
    has_value: !!v.value,
  }))

  return NextResponse.json({ envVars: safeEnvVars })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<EnvVarParams> }
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
    key?: string
    value?: string
    is_sensitive?: boolean
  }

  const key = typeof body.key === 'string' ? body.key.trim() : ''
  const value = typeof body.value === 'string' ? body.value : ''
  const isSensitive = typeof body.is_sensitive === 'boolean' ? body.is_sensitive : true

  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 })
  }

  if (!value) {
    return NextResponse.json({ error: 'Value is required' }, { status: 400 })
  }

  // Validate key format (alphanumeric, underscore, uppercase)
  if (!/^[A-Z0-9_]+$/.test(key)) {
    return NextResponse.json(
      { error: 'Key must be uppercase alphanumeric with underscores' },
      { status: 400 }
    )
  }

  await createOrUpdateEnvVar(projectParams.id, userId, key, value, isSensitive)

  return NextResponse.json({
    success: true,
    message: `Environment variable "${key}" created/updated`,
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<EnvVarParams> }
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

  const body = (await req.json().catch(() => ({}))) as { key?: string }
  const key = typeof body.key === 'string' ? body.key.trim() : ''

  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 })
  }

  await deleteEnvVar(projectParams.id, key)

  return NextResponse.json({
    success: true,
    message: `Environment variable "${key}" deleted`,
  })
}
