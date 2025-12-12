import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseConnection } from '@/lib/supabase-connections-db'

interface SchemaRequest {
  action: 'create_table' | 'create_function' | 'enable_realtime' | 'execute_sql'
  query?: string
  table?: {
    name: string
    columns: Array<{
      name: string
      type: string
      nullable?: boolean
      unique?: boolean
      primaryKey?: boolean
    }>
  }
  function?: {
    name: string
    language: 'plpgsql' | 'sql'
    definition: string
    returns?: string
  }
  table_name?: string
}

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
    const connection = await getSupabaseConnection(userId, projectId)

    if (!connection) {
      return NextResponse.json(
        { error: 'Supabase not connected for this project' },
        { status: 400 }
      )
    }

    const body = (await req.json()) as SchemaRequest

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    let query: string | null = null

    if (body.action === 'create_table' && body.table) {
      const columns = body.table.columns
        .map((col) => {
          const parts = [col.name, col.type]
          if (col.primaryKey) parts.push('PRIMARY KEY')
          if (!col.nullable) parts.push('NOT NULL')
          if (col.unique) parts.push('UNIQUE')
          return parts.join(' ')
        })
        .join(', ')

      query = `
        CREATE TABLE IF NOT EXISTS public.${body.table.name} (
          ${columns}
        );
        ALTER TABLE public.${body.table.name} ENABLE ROW LEVEL SECURITY;
      `
    } else if (body.action === 'create_function' && body.function) {
      query = `
        CREATE OR REPLACE FUNCTION public.${body.function.name}()
        RETURNS ${body.function.returns || 'void'}
        LANGUAGE ${body.function.language}
        AS $$
        ${body.function.definition}
        $$;
      `
    } else if (body.action === 'enable_realtime' && body.table_name) {
      query = `
        ALTER PUBLICATION supabase_realtime ADD TABLE public.${body.table_name};
      `
    } else if (body.action === 'execute_sql' && body.query) {
      query = body.query
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Invalid schema request' },
        { status: 400 }
      )
    }

    const response = await fetch(
      new URL('/rest/v1/rpc/execute_sql', supabaseUrl).toString(),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Supabase schema error:', error)
      return NextResponse.json(
        { error: 'Failed to execute schema operation', details: error },
        { status: 400 }
      )
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      action: body.action,
      result,
    })
  } catch (error) {
    console.error('Failed to manage schema:', error)
    return NextResponse.json(
      { error: 'Failed to manage schema' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: projectId } = await params

  try {
    const connection = await getSupabaseConnection(userId, projectId)

    if (!connection) {
      return NextResponse.json(
        { error: 'Supabase not connected for this project' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const tablesResponse = await fetch(
      new URL(
        '/rest/v1/information_schema.tables?table_schema=eq.public',
        supabaseUrl
      ).toString(),
      {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!tablesResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch tables' },
        { status: 400 }
      )
    }

    const tables = await tablesResponse.json()

    return NextResponse.json({
      tables,
      projectRef: connection.supabase_project_ref,
      projectName: connection.supabase_project_name,
    })
  } catch (error) {
    console.error('Failed to fetch schema:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schema' },
      { status: 500 }
    )
  }
}
