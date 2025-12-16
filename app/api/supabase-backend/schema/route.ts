import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseProjectWithRefresh } from '@/lib/supabase-projects-db'
import { getSupabaseDatabaseQueryUrl } from '@/lib/supabase-platform'

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

function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

function qualifyRoutineName(name: string) {
  const parts = name.split('.').filter(Boolean)
  if (parts.length === 1) return `public.${quoteIdent(parts[0])}`
  if (parts.length === 2) return `${quoteIdent(parts[0])}.${quoteIdent(parts[1])}`
  throw new Error('Invalid routine name')
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

  const oauthClientId =
    process.env.SUPABASE_OAUTH_CLIENT_ID ||
    process.env.NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID
  const oauthClientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET

  if (!oauthClientId || !oauthClientSecret) {
    return NextResponse.json(
      { error: 'Supabase OAuth not configured on server' },
      { status: 500 }
    )
  }

  try {
    const supabaseProject = await getSupabaseProjectWithRefresh(
      userId,
      projectId,
      oauthClientId,
      oauthClientSecret
    )

    if (!supabaseProject) {
      return NextResponse.json(
        { error: 'Supabase not connected for this project' },
        { status: 400 }
      )
    }

    if (!supabaseProject.supabase_project_ref?.trim()) {
      return NextResponse.json(
        { error: 'Invalid Supabase project reference' },
        { status: 400 }
      )
    }

    if (!supabaseProject.access_token?.trim()) {
      return NextResponse.json(
        { error: 'Supabase access token is missing or invalid' },
        { status: 400 }
      )
    }

    const body = (await req.json()) as SchemaRequest

    let sql: string | null = null

    if (body.action === 'create_table' && body.table) {
      const tableName = body.table.name
      const columns = body.table.columns
        .map((col) => {
          const parts: string[] = [quoteIdent(col.name), col.type]
          if (col.primaryKey) parts.push('PRIMARY KEY')
          if (!col.nullable) parts.push('NOT NULL')
          if (col.unique) parts.push('UNIQUE')
          return parts.join(' ')
        })
        .join(', ')

      sql = [
        `CREATE TABLE IF NOT EXISTS public.${quoteIdent(tableName)} (${columns});`,
        `ALTER TABLE public.${quoteIdent(tableName)} ENABLE ROW LEVEL SECURITY;`,
      ].join('\n')
    } else if (body.action === 'create_function' && body.function) {
      const routineName = qualifyRoutineName(body.function.name)
      sql = [
        `CREATE OR REPLACE FUNCTION ${routineName}()`,
        `RETURNS ${body.function.returns || 'void'}`,
        `LANGUAGE ${body.function.language}`,
        `AS $$`,
        body.function.definition,
        `$$;`,
      ].join('\n')
    } else if (body.action === 'enable_realtime' && body.table_name) {
      sql = `ALTER PUBLICATION supabase_realtime ADD TABLE public.${quoteIdent(body.table_name)};`
    } else if (body.action === 'execute_sql' && body.query) {
      sql = body.query
    }

    if (!sql) {
      return NextResponse.json(
        { error: 'Invalid schema request' },
        { status: 400 }
      )
    }

    const response = await fetch(
      getSupabaseDatabaseQueryUrl(supabaseProject.supabase_project_ref),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseProject.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase database query error:', errorText)
      return NextResponse.json(
        { error: 'Failed to execute schema operation', details: errorText },
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
