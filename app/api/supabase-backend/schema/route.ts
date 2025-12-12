import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseProject } from '@/lib/supabase-projects-db'

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

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

  try {
    const supabaseProject = await getSupabaseProject(userId, projectId)
    if (!supabaseProject) {
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

    const postgrestUrl = new URL(supabaseProject.supabase_project_ref, supabaseUrl)
    postgrestUrl.pathname = '/rest/v1/rpc/execute_sql'

    const response = await fetch(postgrestUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseProject.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })

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
