import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { saveGithubProject } from '@/lib/github-projects-db'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 })
  }

  let stateData
  try {
    stateData = JSON.parse(state)
  } catch {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  const { userId, projectId } = stateData

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'GitHub OAuth configuration missing' },
      { status: 500 }
    )
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token received' }, { status: 400 })
    }

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to get GitHub user info')
    }

    const userData = await userResponse.json()

    // Save to DB
    await saveGithubProject({
      userId,
      projectId,
      githubUserId: userData.id.toString(),
      githubUsername: userData.login,
      githubAvatarUrl: userData.avatar_url,
      accessToken,
    })

    // Redirect back to project workspace
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${appUrl}/workspace?projectId=${projectId}`)
  } catch (error) {
    console.error('Error in GitHub OAuth callback', error)
    return NextResponse.json(
      { error: 'Failed to complete GitHub OAuth' },
      { status: 500 }
    )
  }
}
