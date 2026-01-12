import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createGithubInstallState } from '@/lib/github-install-state'
import { getGithubAppSlug } from '@/lib/github-app'

/**
 * Initiates GitHub App installation flow
 * Redirects user to GitHub to install the app and select account/organization
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json(
      { error: 'Missing projectId' },
      { status: 400 }
    )
  }

  try {
    const appSlug = getGithubAppSlug()
    const state = createGithubInstallState({ userId, projectId })

    // Redirect to GitHub to start installation flow
    const githubUrl = new URL(`https://github.com/apps/${appSlug}/installations/new`)
    githubUrl.searchParams.set('state', state)

    return NextResponse.redirect(githubUrl.toString())
  } catch (error) {
    console.error('[GitHub Start] Error:', error)
    return NextResponse.json(
      { error: 'Failed to start GitHub installation' },
      { status: 500 }
    )
  }
}
