import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()

  try {
    const { rows } = await db.query(
      'select id, name, description, created_at, updated_at from public.apps where user_id = $1 order by updated_at desc',
      [userId]
    ) as {
      rows: Array<{
        id: string
        name: string
        description: string
        created_at: number
        updated_at: number
      }>
    }

    return NextResponse.json({ apps: rows })
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

  const body = await request.json()
  const { id, name, description, createdAt, updatedAt } = body as {
    id: string
    name: string
    description: string
    createdAt: number
    updatedAt: number
  }

  if (!id || !name) {
    return NextResponse.json({ error: 'Missing id or name' }, { status: 400 })
  }

  const db = getDb()

  await db.query(
    `insert into public.apps (id, user_id, name, description, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (id) do update set
       name = excluded.name,
       description = excluded.description,
       updated_at = excluded.updated_at`,
    [id, userId, name, description ?? '', createdAt, updatedAt]
  )

  return NextResponse.json({ success: true })
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
    const { rows } = await db.query(
      'delete from public.apps where id = $1 and user_id = $2 returning id',
      [id, userId]
    ) as { rows: Array<{ id: string }> }

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

  const body = await request.json()
  const { id, name, description } = body as {
    id: string
    name?: string
    description?: string
  }

  if (!id) {
    return NextResponse.json({ error: 'Missing app id' }, { status: 400 })
  }

  const db = getDb()

  try {
    let query = 'update public.apps set'
    const params: unknown[] = []
    const updates: string[] = []

    if (name !== undefined) {
      updates.push(`name = $${params.length + 1}`)
      params.push(name)
    }

    if (description !== undefined) {
      updates.push(`description = $${params.length + 1}`)
      params.push(description)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.push(`updated_at = $${params.length + 1}`)
    params.push(Date.now())

    query += ' ' + updates.join(', ') + ` where id = $${params.length + 1} and user_id = $${params.length + 2} returning id, name, description, created_at, updated_at`
    params.push(id, userId)

    const { rows } = await db.query(query, params) as {
      rows: Array<{
        id: string
        name: string
        description: string
        created_at: number
        updated_at: number
      }>
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'App not found or unauthorized' }, { status: 404 })
    }

    const app = rows[0]
    return NextResponse.json({
      app: {
        id: app.id,
        name: app.name,
        description: app.description,
        createdAt: app.created_at,
        updatedAt: app.updated_at,
      },
    })
  } catch (error) {
    console.error('Failed to update app:', error)
    return NextResponse.json({ error: 'Failed to update app' }, { status: 500 })
  }
}
