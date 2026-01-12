import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createGithubInstallState } from '@/lib/github-install-state'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

  try {
    const appSlug = process.env.GITHUB_APP_SLUG
    if (!appSlug) {
      throw new Error('GITHUB_APP_SLUG is not configured')
    }

    const state = createGithubInstallState({ userId, projectId })

    const githubUrl = new URL(`https://github.com/apps/${appSlug}/installations/new`)
    githubUrl.searchParams.set('state', state)

    return NextResponse.redirect(githubUrl.toString())
  } catch (error) {
    console.error('[GitHub Start] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to start GitHub installation',
      },
      { status: 500 }
    )
  }
}
