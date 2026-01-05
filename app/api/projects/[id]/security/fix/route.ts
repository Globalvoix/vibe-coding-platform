import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Sandbox } from '@vercel/sandbox'
import { recordUsageAndDeductCredits, getUserCredits } from '@/lib/credits'
import { generateText } from 'ai'
import { getModelOptions } from '@/ai/gateway'

interface SecurityIssue {
  id: string
  level: 'Error' | 'Warning'
  title: string
  filePath?: string
  lineNumber?: number
}

interface FixRequest {
  sandboxId: string
  issues: SecurityIssue[]
  modelId?: string
}

const SECURITY_FIX_COST_CREDITS = 5

async function readFileFromSandbox(sandbox: Awaited<ReturnType<typeof Sandbox.get>>, filePath: string): Promise<string | null> {
  try {
    const stream = await sandbox.readFile({ path: filePath })
    if (!stream) return null

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer)
    }
    return Buffer.concat(chunks).toString('utf-8')
  } catch {
    return null
  }
}

async function generateSecurityFixes(
  sandboxId: string,
  issues: SecurityIssue[],
  modelId?: string
): Promise<Map<string, string>> {
  const fixes = new Map<string, string>()

  try {
    const sandbox = await Sandbox.get({ sandboxId })

    // Read relevant files from sandbox
    const fileContents: Map<string, string> = new Map()
    const filePaths = new Set<string>()

    // Collect unique file paths from issues
    for (const issue of issues) {
      if (issue.filePath) {
        filePaths.add(issue.filePath)
      }
    }

    // Read each file
    for (const filePath of filePaths) {
      const content = await readFileFromSandbox(sandbox, filePath)
      if (content) {
        fileContents.set(filePath, content)
      }
    }

    // Prepare issue descriptions
    const issueDescriptions = issues
      .map(
        (issue) =>
          `- [${issue.level}] ${issue.title}${issue.filePath ? ` in ${issue.filePath}${issue.lineNumber ? `:${issue.lineNumber}` : ''}` : ''}`
      )
      .join('\n')

    // Prepare file contents for AI analysis
    const fileContexts = Array.from(fileContents.entries())
      .map(([path, content]) => `File: ${path}\n\`\`\`\n${content}\n\`\`\``)
      .join('\n\n')

    // Call AI to generate fixes
    const selectedModelId = modelId || 'anthropic/claude-3-5-sonnet-20241022'
    const modelOptions = getModelOptions(selectedModelId)
    const { text } = await generateText({
      ...modelOptions,
      system: `You are a security expert AI assistant. Your task is to fix security vulnerabilities in code.
For each security issue, provide the complete fixed file content.
Format your response as JSON with this structure:
{
  "fixes": [
    {
      "filePath": "path/to/file",
      "fixedContent": "complete fixed file content here"
    }
  ]
}

Be precise and only provide actual working code fixes. Include all necessary imports and dependencies.`,
      prompt: `Please fix the following security issues:

${issueDescriptions}

Here are the affected files:

${fileContexts}

Generate the fixed versions of these files. Return complete, working code.`,
    })

    // Parse AI response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as { fixes: Array<{ filePath: string; fixedContent: string }> }
        for (const fix of result.fixes) {
          fixes.set(fix.filePath, fix.fixedContent)
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // If parsing fails, return empty fixes to avoid applying invalid code
      return fixes
    }
  } catch (error) {
    console.error('Failed to generate security fixes:', error)
  }

  return fixes
}

async function applyFixesToSandbox(
  sandboxId: string,
  fixes: Map<string, string>
): Promise<boolean> {
  try {
    const sandbox = await Sandbox.get({ sandboxId })

    const filesToWrite: Array<{ path: string; content: Buffer }> = []

    for (const [filePath, content] of fixes) {
      filesToWrite.push({
        path: filePath,
        content: Buffer.from(content, 'utf-8'),
      })
    }

    if (filesToWrite.length > 0) {
      await sandbox.writeFiles(filesToWrite)
    }

    return true
  } catch (error) {
    console.error('Failed to apply fixes to sandbox:', error)
    return false
  }
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
    const body = (await req.json()) as FixRequest
    const { sandboxId, issues, modelId } = body

    if (!sandboxId || !issues || issues.length === 0) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Check if user has enough credits
    const credits = await getUserCredits(userId)
    if (credits.balance < SECURITY_FIX_COST_CREDITS) {
      return NextResponse.json(
        {
          error: 'Insufficient credits for security fixes',
          required: SECURITY_FIX_COST_CREDITS,
          available: credits.balance,
        },
        { status: 402 }
      )
    }

    // Generate fixes
    const fixes = await generateSecurityFixes(sandboxId, issues, modelId)

    // Only apply if we have fixes to apply
    if (fixes.size > 0) {
      const applied = await applyFixesToSandbox(sandboxId, fixes)

      if (!applied) {
        return NextResponse.json(
          { error: 'Failed to apply security fixes to sandbox' },
          { status: 500 }
        )
      }
    }

    // Deduct credits
    const deductionResult = await recordUsageAndDeductCredits({
      userId,
      modelId: 'security-fix',
      creditsRequired: SECURITY_FIX_COST_CREDITS,
      reference: params.id,
      metadata: {
        action: 'security_fix',
        issueCount: issues.length,
      },
    })

    if (!deductionResult) {
      return NextResponse.json(
        { error: 'Failed to deduct credits' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      creditsDeducted: deductionResult.deducted,
      creditsRemaining: deductionResult.remaining,
      fixesApplied: fixes.size,
    })
  } catch (error) {
    console.error('Security fix failed:', error)
    return NextResponse.json(
      { error: 'Security fix failed', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}
