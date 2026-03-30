import { NextResponse, type NextRequest } from 'next/server'

interface Params {
  sandboxId: string
  cmdId: string
}

// E2B uses callback-based log streaming at command start time rather than
// a pull-based log API. Background command logs are unavailable via this route.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { sandboxId, cmdId } = await params
  void sandboxId
  void cmdId

  const encoder = new TextEncoder()
  return new NextResponse(
    new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              data: 'Log streaming is handled via E2B callbacks during command execution.\n',
              stream: 'stdout',
              timestamp: Date.now(),
            }) + '\n'
          )
        )
        controller.close()
      },
    }),
    { headers: { 'Content-Type': 'application/x-ndjson' } }
  )
}
