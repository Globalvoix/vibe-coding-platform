import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Sandbox } from '@vercel/sandbox'
import { recordUsageAndDeductCredits, getUserCredits } from '@/lib/credits'

interface SecurityIssue {
  id: string
  level: 'Error' | 'Warning'
  title: string
}

interface FixRequest {
  sandboxId: string
  issues: SecurityIssue[]
}

const SECURITY_FIX_COST_CREDITS = 5

async function generateSecurityFixes(issues: SecurityIssue[]): Promise<Map<string, string>> {
  const fixes = new Map<string, string>()

  // In a real implementation, this would call the AI to generate fixes
  // For now, returning mock fixes
  for (const issue of issues) {
    if (issue.title === 'Subscription Data Could Be Modified by Unauthorized Users') {
      fixes.set('subscriptions-rls', `
-- Enable RLS on subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to prevent unauthorized modifications
CREATE POLICY "Users can only access their own subscription data"
ON subscriptions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
      `)
    } else if (issue.title === 'Leaked Password Protection Disabled') {
      fixes.set('password-hashing', `
-- Ensure passwords are properly hashed
-- Update your authentication logic to use bcrypt or similar
import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
      `)
    }
  }

  return fixes
}

async function applyFixesToSandbox(sandboxId: string, fixes: Map<string, string>): Promise<boolean> {
  try {
    const sandbox = await Sandbox.get({ sandboxId })

    // Create files for each fix
    const filesToWrite: Array<{ path: string; content: Buffer }> = []

    let fileIndex = 0
    for (const [_, content] of fixes) {
      filesToWrite.push({
        path: `docs/security-fixes-${fileIndex++}.md`,
        content: Buffer.from(content, 'utf8'),
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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as FixRequest
    const { sandboxId, issues } = body

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
    const fixes = await generateSecurityFixes(issues)

    // Apply fixes to sandbox
    const applied = await applyFixesToSandbox(sandboxId, fixes)

    if (!applied) {
      return NextResponse.json(
        { error: 'Failed to apply security fixes to sandbox' },
        { status: 500 }
      )
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
