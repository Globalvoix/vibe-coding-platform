import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json(
      { error: 'Missing projectId query parameter' },
      { status: 400 }
    )
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URL

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'GitHub OAuth configuration missing' },
      { status: 500 }
    )
  }

  // Scope: repo, user
  const scope = 'repo user'
  const state = JSON.stringify({ userId, projectId })
  
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize')
  githubAuthUrl.searchParams.set('client_id', clientId)
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri)
  githubAuthUrl.searchParams.set('scope', scope)
  githubAuthUrl.searchParams.set('state', state)

  return NextResponse.redirect(githubAuthUrl.toString())
}
