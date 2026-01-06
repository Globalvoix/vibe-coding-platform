import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createGithubInstallState } from '@/lib/github-install-state'
import { getGithubAppSlug } from '@/lib/github-app'

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

  let slug: string
  try {
    slug = getGithubAppSlug()
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'GitHub App configuration missing',
      },
      { status: 500 }
    )
  }

  const state = createGithubInstallState({ userId, projectId })

  const url = new URL(`https://github.com/apps/${slug}/installations/new`)
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString())
}
