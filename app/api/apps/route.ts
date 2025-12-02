import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const { rows } = await db.query(
    'select id, name, description, created_at, updated_at from public.apps where user_id = $1 order by updated_at desc',
    [userId]
  )

  return NextResponse.json({ apps: rows })
}

export async function POST(request: NextRequest) {
  const { userId } = auth()

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
