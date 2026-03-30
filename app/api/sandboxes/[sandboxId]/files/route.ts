import { NextResponse, type NextRequest } from 'next/server'
import { Sandbox } from 'e2b'
import z from 'zod/v3'

const FileParamsSchema = z.object({
  sandboxId: z.string(),
  path: z.string(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const { sandboxId } = await params
  const fileParams = FileParamsSchema.safeParse({
    path: request.nextUrl.searchParams.get('path'),
    sandboxId,
  })

  if (fileParams.success === false) {
    return NextResponse.json(
      { error: 'Invalid parameters. You must pass a `path` as query' },
      { status: 400 }
    )
  }

  try {
    const sandbox = await Sandbox.connect(fileParams.data.sandboxId, {
      apiKey: process.env.E2B_API_KEY,
    })
    const content = await sandbox.files.read(fileParams.data.path)
    return new NextResponse(content)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('not found') || msg.includes('ENOENT') || msg.includes('FileNotFound')) {
      return NextResponse.json({ error: 'File not found in the sandbox' }, { status: 404 })
    }
    throw error
  }
}
