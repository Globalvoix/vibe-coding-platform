import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({ connectionString })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: projectId } = await params

  try {
    await pool.query(
      `DELETE FROM supabase_connections WHERE user_id = $1 AND project_id = $2`,
      [userId, projectId]
    )

    await pool.query(
      `UPDATE projects SET cloud_enabled = FALSE WHERE user_id = $1 AND id = $2`,
      [userId, projectId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to disconnect Supabase:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
