import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseProject } from '@/lib/supabase-projects-db'
import { dedupeIssues, getSandboxFiles, getSupabaseSecurityIssues, scanFilesForIssues, type SecurityIssue } from '@/lib/security/security-utils'

const DEFAULT_SANDBOX_SCAN_PATHS = [
  'package.json',
  'app/page.tsx',
  'app/layout.tsx',
  'middleware.ts',
  'app/api/subscriptions/route.ts',
  'lib/auth.ts',
  'lib/database.ts',
]

function issueSortKey(issue: SecurityIssue) {
  return `${issue.level}:${issue.title}:${issue.filePath ?? ''}`
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const projectId = params.id

    const body = (await req.json()) as { sandboxId?: string }
    const sandboxId = body.sandboxId

    if (!sandboxId) {
      return NextResponse.json({ error: 'Missing sandboxId' }, { status: 400 })
    }

    const files = await getSandboxFiles(sandboxId, DEFAULT_SANDBOX_SCAN_PATHS)
    const codeIssues = scanFilesForIssues(files)

    const allIssues: SecurityIssue[] = [...codeIssues]

    const supabaseProject = await getSupabaseProject(userId, projectId)
    if (supabaseProject?.access_token && supabaseProject.supabase_project_ref) {
      try {
        const supabaseIssues = await getSupabaseSecurityIssues({
          projectRef: supabaseProject.supabase_project_ref,
          accessToken: supabaseProject.access_token,
        })
        allIssues.push(...supabaseIssues)
      } catch {
        // If the Supabase query fails, we still return code scan results.
      }
    }

    const issues = dedupeIssues(allIssues).sort((a, b) => issueSortKey(a).localeCompare(issueSortKey(b)))

    return NextResponse.json({
      issues,
      scannedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Security scan failed:', error)
    return NextResponse.json(
      { error: 'Security scan failed', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}
