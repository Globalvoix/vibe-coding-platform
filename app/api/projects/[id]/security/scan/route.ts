import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Sandbox } from '@vercel/sandbox'
import { getSupabaseProject } from '@/lib/supabase-projects-db'
import { dedupeIssues, readFileFromSandbox, getSupabaseSecurityIssues, scanFilesForIssues, type SecurityIssue } from '@/lib/security/security-utils'

function issueSortKey(issue: SecurityIssue) {
  return `${issue.level}:${issue.title}:${issue.filePath ?? ''}`
}

async function discoverAndScanFiles(sandboxId: string): Promise<Array<{ path: string; content: string }>> {
  const sandbox = await Sandbox.get({ sandboxId })
  const filesToCheck = [
    'package.json',
    'app/page.tsx',
    'app/layout.tsx',
    'middleware.ts',
    'lib/auth.ts',
    'lib/database.ts',
    'app/api/route.ts',
    'app/api/auth/route.ts',
    'lib/api.ts',
    'src/index.ts',
    'src/app.ts',
  ]

  const discoveredFiles: Array<{ path: string; content: string }> = []

  for (const filePath of filesToCheck) {
    const content = await readFileFromSandbox(sandbox, filePath)
    if (content) {
      discoveredFiles.push({ path: filePath, content })
    }
  }

  return discoveredFiles
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

    let files: Array<{ path: string; content: string }> = []

    try {
      files = await discoverAndScanFiles(sandboxId)
    } catch (error) {
      console.error('Failed to discover/scan files:', error)
      return NextResponse.json(
        { error: 'Failed to access sandbox files', details: error instanceof Error ? error.message : undefined },
        { status: 500 }
      )
    }

    if (files.length === 0) {
      return NextResponse.json({
        issues: [],
        scannedAt: new Date().toISOString(),
        filesScanned: 0,
      })
    }

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
      } catch (error) {
        console.warn('Supabase security check skipped:', error instanceof Error ? error.message : undefined)
      }
    }

    const issues = dedupeIssues(allIssues).sort((a, b) => issueSortKey(a).localeCompare(issueSortKey(b)))

    return NextResponse.json({
      issues,
      filesScanned: files.length,
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
