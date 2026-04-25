import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { APIError } from '@vercel/sandbox/dist/api-client/api-error'
import { Sandbox } from '@vercel/sandbox'
import { getProject, updateProjectSandboxState } from '@/lib/projects-db'
import { listProjectFiles, listProjectFilePaths } from '@/lib/project-files-db'
import { syncProjectEnvToSandbox } from '@/ai/tools/project-env'
import { isFeatureEnabled } from '@/lib/generation-config'
import { generationLogger } from '@/ai/tools/generation-logger'

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

/**
 * Build install command with fallback strategy
 * Tries to install with preferred PM, falls back to others if it fails
 */
function buildInstallCommandWithFallback() {
  const corepack = 'corepack enable >/dev/null 2>&1 || true'

  // Try pnpm first, then yarn, then npm
  const installCommands = [
    // pnpm: try with force flag first (for peer dependency issues)
    '(command -v pnpm >/dev/null 2>&1 || corepack prepare pnpm@latest --activate) && (pnpm install --force || pnpm install) && echo "pnpm-install-success"',
    // yarn: fallback if pnpm fails
    '(command -v yarn >/dev/null 2>&1 || corepack prepare yarn@stable --activate) && (yarn install --ignore-engines || yarn install) && echo "yarn-install-success"',
    // npm: final fallback
    'npm install --legacy-peer-deps || npm install && echo "npm-install-success"',
  ]

  return [corepack, `(${installCommands.join(' || ')})`].join(' && ')
}

function buildDevCommand(pm: 'npm' | 'pnpm' | 'yarn', port: number) {
  // Broad compatibility:
  // - Next/Vite generally accept "-- --port".
  // - CRA and others may not; fallback to plain dev with PORT env.
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

/**
 * Check if a port is available in the sandbox
 */
async function isPortAvailable(sandbox: Sandbox, port: number): Promise<boolean> {
  try {
    const result = await sandbox.runCommand({
      cmd: 'bash',
      args: ['-c', `! lsof -i :${port} >/dev/null 2>&1`],
      detached: false,
    })
    return result.exitCode === 0
  } catch {
    return false
  }
}

/**
 * Find an available port in the given range
 */
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

  // If no available port found in range, return preferred port anyway (will likely fail but we tried)
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
    files.map((f) => ({
      path: f.path,
      content: Buffer.from(f.content, f.encoding === 'base64' ? 'base64' : 'utf8'),
    }))
  )

  // Use fallback strategy for more resilient installation
  // This will try pnpm (with --force for peer deps), then yarn, then npm
  let install: string
  if (isFeatureEnabled('fallbackStrategies')) {
    generationLogger.progress('sandbox_setup', 'Using package manager fallback strategy')
    install = buildInstallCommandWithFallback()
  } else {
    generationLogger.progress('sandbox_setup', 'Using single package manager (fallback disabled)')
    install = buildInstallCommand(pm)
  }
  await sandbox.runCommand({ cmd: 'bash', args: ['-lc', install] })

  // Determine which port to use (may be auto-resolved if port is in use)
  let finalPort = port

  // Try auto-port resolution if enabled
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

  // Use the detected PM for dev command for consistency with final port
  const dev = buildDevCommand(pm, finalPort)
  await sandbox.runCommand({ cmd: 'bash', args: ['-lc', dev], detached: true })

  try {
    const wait = buildWaitForPortCommand(finalPort, 120_000)
    await sandbox.runCommand({ cmd: 'bash', args: ['-lc', wait] })
  } catch {
    // best-effort
    generationLogger.progress('port_resolution', `Wait for port ${finalPort} timed out or failed, continuing anyway`)
  }

  const url = sandbox.domain(finalPort)
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
