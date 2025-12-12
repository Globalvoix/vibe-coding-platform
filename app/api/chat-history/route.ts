import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import type { ChatUIMessage } from '@/components/chat/types'

export async function GET(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return new Response(JSON.stringify({ error: 'Missing projectId' }), {
      status: 400,
    })
  }

  try {
    const messages = await db.query(
      `SELECT messages FROM projects WHERE id = $1 AND user_id = $2`,
      [projectId, userId]
    )

    if (messages.rows.length === 0) {
      return new Response(JSON.stringify({ messages: [] }), {
        status: 200,
      })
    }

    const storedMessages = messages.rows[0].messages || []
    return new Response(JSON.stringify({ messages: storedMessages }), {
      status: 200,
    })
  } catch (error) {
    console.error('Failed to retrieve chat history:', error)
    return new Response(JSON.stringify({ error: 'Failed to retrieve chat history' }), {
      status: 500,
    })
  }
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    })
  }

  try {
    const body = (await request.json()) as {
      projectId: string
      messages: ChatUIMessage[]
    }
    const { projectId, messages } = body

    if (!projectId || !messages) {
      return new Response(JSON.stringify({ error: 'Missing projectId or messages' }), {
        status: 400,
      })
    }

    await db.query(
      `UPDATE projects SET messages = $1 WHERE id = $2 AND user_id = $3`,
      [JSON.stringify(messages), projectId, userId]
    )

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    })
  } catch (error) {
    console.error('Failed to save chat history:', error)
    return new Response(JSON.stringify({ error: 'Failed to save chat history' }), {
      status: 500,
    })
  }
}
