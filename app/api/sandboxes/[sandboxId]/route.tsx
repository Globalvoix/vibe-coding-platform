import { NextRequest, NextResponse } from 'next/server'
import { Sandbox, SandboxNotFoundError } from 'e2b'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const { sandboxId } = await params
  try {
    const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
    await sandbox.commands.run('echo "health check"', { timeoutMs: 5000 })
    return NextResponse.json({ status: 'running' })
  } catch (error) {
    if (error instanceof SandboxNotFoundError) {
      return NextResponse.json({ status: 'stopped' })
    }
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('not found') || msg.includes('does not exist')) {
      return NextResponse.json({ status: 'stopped' })
    }
    throw error
  }
}
