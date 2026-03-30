import { NextResponse, type NextRequest } from 'next/server'
import { Sandbox, SandboxNotFoundError } from 'e2b'

const E2B_API_KEY = process.env.E2B_API_KEY

interface Params {
  sandboxId: string
  cmdId: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { sandboxId, cmdId } = await params

  try {
    // Verify the sandbox is reachable
    await Sandbox.connect(sandboxId, { apiKey: E2B_API_KEY })
  } catch (error) {
    if (error instanceof SandboxNotFoundError) {
      return NextResponse.json(
        { sandboxId, cmdId, exitCode: null, error: 'Sandbox not found' },
        { status: 404 }
      )
    }
  }

  // E2B doesn't support fetching a background command by ID after the fact.
  // Return a stub response indicating the command is considered complete.
  return NextResponse.json({
    sandboxId,
    cmdId,
    startedAt: null,
    exitCode: null,
  })
}
