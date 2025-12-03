import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { pool } from '@/lib/supabase-db'

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

  try {
    const tableName = `${projectParams.id}_app_data`.replace(/[^a-z0-9_]/g, '_')

    const tableExistsResult = await pool.query(
      `SELECT to_regclass($1) AS table_exists`,
      [`public.${tableName}`]
    )

    if (!tableExistsResult.rows[0]?.table_exists) {
      return NextResponse.json({ tables: [] })
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM "${tableName}"`
    )

    const columnsResult = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [tableName]
    )

    const tables = [
      {
        tableName,
        rowCount: parseInt(countResult.rows[0]?.count || '0', 10),
        columns: columnsResult.rows.map((row: any) => row.column_name),
      },
    ]

    return NextResponse.json({ tables })
  } catch (error) {
    console.error('Failed to fetch database info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch database info' },
      { status: 500 }
    )
  }
}
