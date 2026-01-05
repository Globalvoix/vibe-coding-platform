import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { APIError } from '@vercel/sandbox/dist/api-client/api-error'
import { Sandbox } from '@vercel/sandbox'
import { getProject, updateProjectSandboxState } from '@/lib/projects-db'
import { listProjectFiles, listProjectFilePaths } from '@/lib/project-files-db'
import { syncProjectEnvToSandbox } from '@/ai/tools/project-env'

function coerceSandboxState(value: unknown): {
  sandboxId?: string
  paths?: string[]
  url?: string
  urlUUID?: string
  port?: number
} | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>

  return {
    sandboxId: typeof v.sandboxId === 'string' ? v.sandboxId : undefined,
    paths: Array.isArray(v.paths) ? (v.paths.filter((p) => typeof p === 'string') as string[]) : undefined,
    url: typeof v.url === 'string' ? v.url : undefined,
    urlUUID: typeof v.urlUUID === 'string' ? v.urlUUID : undefined,
    port: typeof v.port === 'number' && Number.isFinite(v.port) ? v.port : undefined,
  }
}

async function isSandboxStopped(sandboxId: string) {
  try {
    const sandbox = await Sandbox.get({ sandboxId })
    await sandbox.runCommand({ cmd: 'echo', args: ['status'] })
    return false
  } catch (error) {
    if (error instanceof APIError && error.json.error.code === 'sandbox_stopped') {
      return true
    }
    throw error
  }
}

function selectPackageManager(filePaths: string[]) {
  if (filePaths.includes('pnpm-lock.yaml')) return 'pnpm'
  if (filePaths.includes('yarn.lock')) return 'yarn'
  return 'npm'
}

function buildInstallCommand(pm: 'npm' | 'pnpm' | 'yarn') {
  return pm === 'npm' ? 'npm install' : pm === 'pnpm' ? 'pnpm install' : 'yarn install'
}

function buildDevCommand(pm: 'npm' | 'pnpm' | 'yarn', port: number) {
  // Keep this broadly compatible across frameworks (Next, Vite, etc.).
  // Many CLIs support --port, while --host/--hostname differs and can crash some frameworks.
  return pm === 'npm'
    ? `npm run dev -- --port ${port}`
    : pm === 'pnpm'
      ? `pnpm dev -- --port ${port}`
      : `yarn dev -- --port ${port}`
}

function buildWaitForPortCommand(port: number, timeoutMs: number) {
  const script = `
const http = require('http');
const start = Date.now();
const timeoutMs = ${timeoutMs};

function attempt() {
  const req = http.get({ host: '127.0.0.1', port: ${port}, path: '/' }, (res) => {
    res.resume();
    process.exit(0);
  });

  req.on('error', () => {
    if (Date.now() - start > timeoutMs) process.exit(1);
    setTimeout(attempt, 500);
  });
}

attempt();
`.trim();

  return `node -e ${JSON.stringify(script)}`
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const project = await getProject(userId, projectId)
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const existingState = coerceSandboxState(project.sandbox_state)
  const port = existingState?.port ?? 3000

  // Try to check if the existing sandbox is still running
  if (existingState?.sandboxId) {
    try {
      const stopped = await isSandboxStopped(existingState.sandboxId)

      if (!stopped) {
        // Sandbox is still running, just update the URL UUID and return it
        const sandbox = await Sandbox.get({ sandboxId: existingState.sandboxId })
        const url = sandbox.domain(port)
        const urlUUID = crypto.randomUUID()
        const nextState = {
          ...existingState,
          url,
          urlUUID,
          port,
        }

        await updateProjectSandboxState(userId, projectId, nextState)
        return NextResponse.json({ sandbox_state: nextState })
      }
    } catch (error) {
      // If we can't check the sandbox status, log but continue to try rebuilding
      console.error('Failed to check sandbox status:', error)
    }
  }

  // Sandbox is stopped or doesn't exist, try to rebuild from persisted files
  const files = await listProjectFiles({ userId, projectId })
  if (files.length === 0) {
    return NextResponse.json(
      {
        error: 'No persisted files for this project yet',
        status: 'missing_files',
      },
      { status: 409 }
    )
  }

  const filePaths = await listProjectFilePaths({ userId, projectId })
  const pm = selectPackageManager(filePaths)

  const sandbox = await Sandbox.create({
    timeout: 45 * 60 * 1000,
    ports: [port],
  })

  try {
    await syncProjectEnvToSandbox({ sandbox, userId, projectId })
  } catch {
    // best-effort
  }

  await sandbox.writeFiles(
    files.map((f) => ({ path: f.path, content: Buffer.from(f.content, 'utf8') }))
  )

  const install = buildInstallCommand(pm)
  await sandbox.runCommand({ cmd: 'bash', args: ['-lc', `PORT=${port} ${install}`] })

  const dev = buildDevCommand(pm, port)
  await sandbox.runCommand({ cmd: 'bash', args: ['-lc', `PORT=${port} ${dev}`], detached: true })

  try {
    const wait = buildWaitForPortCommand(port, 120_000)
    await sandbox.runCommand({ cmd: 'bash', args: ['-lc', wait] })
  } catch {
    // best-effort
  }

  const url = sandbox.domain(port)
  const urlUUID = crypto.randomUUID()
  const nextState = {
    sandboxId: sandbox.sandboxId,
    paths: filePaths,
    url,
    urlUUID,
    port,
  }

  await updateProjectSandboxState(userId, projectId, nextState)

  return NextResponse.json({ sandbox_state: nextState })
}
