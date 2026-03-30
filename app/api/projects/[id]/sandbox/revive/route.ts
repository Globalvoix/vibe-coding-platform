import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Sandbox, SandboxNotFoundError } from 'e2b'
import { getProject, updateProjectSandboxState } from '@/lib/projects-db'
import { listProjectFiles, listProjectFilePaths } from '@/lib/project-files-db'
import { syncProjectEnvToSandbox } from '@/ai/tools/project-env'
import { isFeatureEnabled } from '@/lib/generation-config'
import { generationLogger } from '@/ai/tools/generation-logger'

const E2B_API_KEY = process.env.E2B_API_KEY

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
    const sandbox = await Sandbox.connect(sandboxId, { apiKey: E2B_API_KEY })
    await sandbox.commands.run('echo status', { timeoutMs: 5000 })
    return false
  } catch (error) {
    if (error instanceof SandboxNotFoundError) return true
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('not found') || msg.includes('does not exist')) return true
    throw error
  }
}

function selectPackageManager(filePaths: string[]) {
  if (filePaths.includes('pnpm-lock.yaml')) return 'pnpm'
  if (filePaths.includes('yarn.lock')) return 'yarn'
  return 'npm'
}

function buildInstallCommand(pm: 'npm' | 'pnpm' | 'yarn') {
  const corepack = 'corepack enable >/dev/null 2>&1 || true'

  if (pm === 'pnpm') {
    return [
      corepack,
      '(command -v pnpm >/dev/null 2>&1 || corepack prepare pnpm@latest --activate)',
      'pnpm install',
    ].join(' && ')
  }

  if (pm === 'yarn') {
    return [
      corepack,
      '(command -v yarn >/dev/null 2>&1 || corepack prepare yarn@stable --activate)',
      '(yarn install --immutable || yarn install)',
    ].join(' && ')
  }

  return 'npm install'
}

function buildInstallCommandWithFallback() {
  const corepack = 'corepack enable >/dev/null 2>&1 || true'

  const installCommands = [
    '(command -v pnpm >/dev/null 2>&1 || corepack prepare pnpm@latest --activate) && (pnpm install --force || pnpm install) && echo "pnpm-install-success"',
    '(command -v yarn >/dev/null 2>&1 || corepack prepare yarn@stable --activate) && (yarn install --ignore-engines || yarn install) && echo "yarn-install-success"',
    'npm install --legacy-peer-deps || npm install && echo "npm-install-success"',
  ]

  return [corepack, `(${installCommands.join(' || ')})`].join(' && ')
}

function buildDevCommand(pm: 'npm' | 'pnpm' | 'yarn', port: number) {
  if (pm === 'pnpm') {
    return `(PORT=${port} pnpm dev -- --port ${port} || PORT=${port} pnpm dev)`
  }

  if (pm === 'yarn') {
    return `(PORT=${port} yarn dev -- --port ${port} || PORT=${port} yarn dev)`
  }

  return `(PORT=${port} npm run dev -- --port ${port} || PORT=${port} npm run dev)`
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

async function isPortAvailable(sandbox: Sandbox, port: number): Promise<boolean> {
  try {
    const result = await sandbox.commands.run(
      `bash -c '! lsof -i :${port} >/dev/null 2>&1'`,
      { timeoutMs: 10000 }
    )
    return result.exitCode === 0
  } catch {
    return false
  }
}

async function findAvailablePort(
  sandbox: Sandbox,
  preferredPort: number,
  startRange: number = preferredPort + 1,
  endRange: number = preferredPort + 10
): Promise<number> {
  for (let port = startRange; port <= endRange; port++) {
    if (await isPortAvailable(sandbox, port)) {
      generationLogger.progress('port_resolution', `Found available port: ${port}`)
      return port
    }
  }

  generationLogger.progress('port_resolution', `No available ports in range ${startRange}-${endRange}, using preferred port ${preferredPort}`)
  return preferredPort
}

export async function POST(
  req: NextRequest,
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

  const force = ['1', 'true', 'yes'].includes(req.nextUrl.searchParams.get('force') ?? '')

  // Try to check if the existing sandbox is still running
  if (existingState?.sandboxId) {
    try {
      const stopped = await isSandboxStopped(existingState.sandboxId)

      if (!stopped && !force) {
        const sandbox = await Sandbox.connect(existingState.sandboxId, { apiKey: E2B_API_KEY })
        const host = sandbox.getHost(port)
        const url = `https://${host}`
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
      console.error('Failed to check sandbox status:', error)
    }
  }

  // Sandbox is stopped or doesn't exist — rebuild from persisted files
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
    timeoutMs: 45 * 60 * 1000,
    apiKey: E2B_API_KEY,
  })

  try {
    await syncProjectEnvToSandbox({ sandbox, userId, projectId })
  } catch {
    // best-effort
  }

  // Write all files to E2B in parallel
  await Promise.all(
    files.map((f) => {
      const content =
        f.encoding === 'base64'
          ? Buffer.from(f.content, 'base64').toString('utf8')
          : f.content
      return sandbox.files.write(f.path, content)
    })
  )

  let install: string
  if (isFeatureEnabled('fallbackStrategies')) {
    generationLogger.progress('sandbox_setup', 'Using package manager fallback strategy')
    install = buildInstallCommandWithFallback()
  } else {
    generationLogger.progress('sandbox_setup', 'Using single package manager (fallback disabled)')
    install = buildInstallCommand(pm)
  }
  await sandbox.commands.run(`bash -lc '${install}'`, { timeoutMs: 300_000 })

  let finalPort = port

  if (isFeatureEnabled('autoPortResolution')) {
    generationLogger.progress('port_resolution', `Checking if port ${port} is available`)
    const portAvailable = await isPortAvailable(sandbox, port)

    if (!portAvailable) {
      generationLogger.progress('port_resolution', `Port ${port} is in use, finding alternative`)
      finalPort = await findAvailablePort(sandbox, port)

      if (finalPort !== port) {
        generationLogger.success('port_resolution', `Selected alternate port ${finalPort}`)
      }
    } else {
      generationLogger.progress('port_resolution', `Port ${port} is available`)
    }
  }

  const dev = buildDevCommand(pm, finalPort)
  await sandbox.commands.run(`bash -lc '${dev}'`, { background: true })

  try {
    const wait = buildWaitForPortCommand(finalPort, 120_000)
    await sandbox.commands.run(wait, { timeoutMs: 130_000 })
  } catch {
    generationLogger.progress('port_resolution', `Wait for port ${finalPort} timed out, continuing anyway`)
  }

  const host = sandbox.getHost(finalPort)
  const url = `https://${host}`
  const urlUUID = crypto.randomUUID()
  const nextState = {
    sandboxId: sandbox.sandboxId,
    paths: filePaths,
    url,
    urlUUID,
    port: finalPort,
  }

  await updateProjectSandboxState(userId, projectId, nextState)

  return NextResponse.json({ sandbox_state: nextState })
}
