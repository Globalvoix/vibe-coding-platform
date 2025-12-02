import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { randomUUID } from 'crypto'
import { getDb } from '@/lib/db'

interface DbAppRow {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: number
  updated_at: number
}

function mapRowToApp(row: DbAppRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()

  try {
    const { rows } = await db.query<DbAppRow>(
      'select id, user_id, name, description, created_at, updated_at from public.apps where user_id = $1 order by updated_at desc',
      [userId]
    )

    const apps = rows.map(mapRowToApp)
    return NextResponse.json({ apps })
  } catch (error) {
    console.error('Failed to fetch apps:', error)
    return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, description } = (body ?? {}) as {
    name?: string
    description?: string
  }

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Missing app name' }, { status: 400 })
  }

  const db = getDb()

  try {
    const id = randomUUID()
    const now = Date.now()

    const { rows } = await db.query<DbAppRow>(
      `insert into public.apps (id, user_id, name, description, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6)
       returning id, user_id, name, description, created_at, updated_at`,
      [id, userId, name.trim(), description ?? '', now, now]
    )

    const app = mapRowToApp(rows[0])
    return NextResponse.json({ app }, { status: 201 })
  } catch (error) {
    console.error('Failed to create app:', error)
    return NextResponse.json({ error: 'Failed to create app' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing app id' }, { status: 400 })
  }

  const db = getDb()

  try {
    const { rows } = await db.query<{ id: string }>(
      'delete from public.apps where id = $1 and user_id = $2 returning id',
      [id, userId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'App not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete app:', error)
    return NextResponse.json({ error: 'Failed to delete app' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, name, description } = (body ?? {}) as {
    id?: string
    name?: string
    description?: string
  }

  if (!id) {
    return NextResponse.json({ error: 'Missing app id' }, { status: 400 })
  }

  const updates: string[] = []
  const params: unknown[] = []

  if (typeof name === 'string') {
    updates.push(`name = $${params.length + 1}`)
    params.push(name.trim())
  }

  if (typeof description === 'string') {
    updates.push(`description = $${params.length + 1}`)
    params.push(description)
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const now = Date.now()
  updates.push(`updated_at = $${params.length + 1}`)
  params.push(now)

  const db = getDb()

  try {
    const setClause = updates.join(', ')
    const idParamIndex = params.length + 1
    const userIdParamIndex = params.length + 2

    const query = `update public.apps set ${setClause} where id = $${idParamIndex} and user_id = $${userIdParamIndex} returning id, user_id, name, description, created_at, updated_at`

    params.push(id, userId)

    const { rows } = await db.query<DbAppRow>(query, params)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'App not found or unauthorized' }, { status: 404 })
    }

    const app = mapRowToApp(rows[0])
    return NextResponse.json({ app })
  } catch (error) {
    console.error('Failed to update app:', error)
    return NextResponse.json({ error: 'Failed to update app' }, { status: 500 })
  }
}
