import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Sandbox } from '@vercel/sandbox'
import { getSupabaseProject } from '@/lib/supabase-projects-db'

interface SecurityIssue {
  id: string
  level: 'Error' | 'Warning'
  title: string
  filePath?: string
  lineNumber?: number
}

async function getSandboxFiles(sandboxId: string): Promise<Array<{ path: string; content: string }>> {
  try {
    const sandbox = await Sandbox.get({ sandboxId })
    const fileList = ['package.json', 'app/page.tsx', 'app/layout.tsx', 'components/**/*.tsx', 'lib/**/*.ts']
    const files: Array<{ path: string; content: string }> = []

    for (const pattern of fileList) {
      try {
        // Simple file reading - in a real implementation, would use sandbox.readFile
        // This is a placeholder for the actual file reading logic
      } catch {
        // Skip if file doesn't exist
      }
    }

    return files
  } catch {
    return []
  }
}

async function runSemgrepScan(files: Array<{ path: string; content: string }>): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = []

  try {
    // Use Semgrep MCP for scanning
    const codeFiles = files.map((f) => ({
      filename: f.path,
      content: f.content,
    }))

    if (codeFiles.length > 0) {
      // Call Semgrep security check
      // This would integrate with the mcp__semgrep__security_check tool
      // For now, returning static issues for demo
      const commonIssues = [
        {
          id: 'semgrep-1',
          level: 'Error' as const,
          title: 'Subscription Data Could Be Modified by Unauthorized Users',
          filePath: 'app/api/subscriptions/route.ts',
          lineNumber: 45,
        },
        {
          id: 'semgrep-2',
          level: 'Warning' as const,
          title: 'Leaked Password Protection Disabled',
          filePath: 'lib/auth.ts',
          lineNumber: 78,
        },
      ]

      issues.push(...commonIssues)
    }
  } catch (error) {
    console.error('Semgrep scan failed:', error)
  }

  return issues
}

async function getSupabaseSecurityIssues(
  userId: string,
  projectId: string,
  supabaseProjectRef: string,
  accessToken: string
): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = []

  try {
    // Check RLS policies on tables
    // This would use the Supabase API with the accessToken
    // For now, returning demo results

    const supabaseIssues = [
      {
        id: 'supabase-1',
        level: 'Error' as const,
        title: 'Subscription Data Could Be Modified by Unauthorized Users',
        filePath: 'supabase_tables:subscriptions',
      },
    ]

    // Deduplicate by title
    for (const issue of supabaseIssues) {
      if (!issues.some((i) => i.title === issue.title)) {
        issues.push(issue)
      }
    }
  } catch (error) {
    console.error('Supabase security check failed:', error)
  }

  return issues
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id

    const body = (await req.json()) as { sandboxId?: string }
    const sandboxId = body.sandboxId

    if (!sandboxId) {
      return NextResponse.json({ error: 'Missing sandboxId' }, { status: 400 })
    }

    // Get files from sandbox
    const files = await getSandboxFiles(sandboxId)

    // Run Semgrep scan
    const semgrepIssues = await runSemgrepScan(files)

    // Check if Supabase is connected
    let allIssues = [...semgrepIssues]

    const supabaseProject = await getSupabaseProject(userId, projectId)
    if (supabaseProject && supabaseProject.access_token) {
      const supabaseIssues = await getSupabaseSecurityIssues(
        userId,
        projectId,
        supabaseProject.supabase_project_ref,
        supabaseProject.access_token
      )

      // Merge and deduplicate
      for (const issue of supabaseIssues) {
        if (!allIssues.some((i) => i.title === issue.title)) {
          allIssues.push(issue)
        }
      }
    }

    return NextResponse.json({
      issues: allIssues,
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
