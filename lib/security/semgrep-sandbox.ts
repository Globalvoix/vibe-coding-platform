import { Sandbox } from '@vercel/sandbox'

export type SemgrepFinding = {
  checkId: string
  message: string
  severity: 'ERROR' | 'WARNING' | 'INFO'
  path: string
  line: number | null
}

type SemgrepJson = {
  results?: Array<{
    check_id?: string
    path?: string
    start?: { line?: number }
    extra?: {
      message?: string
      severity?: string
    }
  }>
}

function normalizeSeverity(value: unknown): SemgrepFinding['severity'] {
  const v = typeof value === 'string' ? value.toUpperCase().trim() : ''
  if (v === 'ERROR') return 'ERROR'
  if (v === 'WARNING') return 'WARNING'
  return 'INFO'
}

function sanitizeStdoutToJson(stdout: string): unknown {
  const trimmed = stdout.trim()
  if (!trimmed) return null

  try {
    return JSON.parse(trimmed)
  } catch {
    // Try to find the JSON object if there is leading/trailing junk
    const firstBrace = trimmed.indexOf('{')
    const lastBrace = trimmed.lastIndexOf('}')

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const candidate = trimmed.slice(firstBrace, lastBrace + 1)
      try {
        return JSON.parse(candidate)
      } catch {
        // If it still fails, maybe it's multiple JSON objects or partial
        return null
      }
    }
    return null
  }
}

export async function runSemgrepInSandbox(params: {
  sandboxId: string
  timeoutSeconds?: number
}): Promise<{
  findings: SemgrepFinding[]
  rawExitCode: number | null
  stderr: string
  parsedOk: boolean
}> {
  const sandbox = await Sandbox.get({ sandboxId: params.sandboxId })
  const timeoutSeconds =
    typeof params.timeoutSeconds === 'number' && params.timeoutSeconds > 0
      ? Math.min(300, Math.max(10, params.timeoutSeconds))
      : 120

  const installAndRun = [
    'export PIP_DISABLE_PIP_VERSION_CHECK=1',
    'export PYTHONUNBUFFERED=1',
    'export PATH="$HOME/.local/bin:$PATH"',
    // Robust install/detect
    'if command -v semgrep >/dev/null 2>&1; then SEMGREP_CMD="semgrep";',
    'elif [ -f "$HOME/.local/bin/semgrep" ]; then SEMGREP_CMD="$HOME/.local/bin/semgrep";',
    'elif python3 -m semgrep --version >/dev/null 2>&1; then SEMGREP_CMD="python3 -m semgrep";',
    'else',
    '  python3 -m pip install --user -q semgrep >/dev/null 2>&1 || (python3 -m ensurepip --user >/dev/null 2>&1 && python3 -m pip install --user -q semgrep >/dev/null 2>&1) || true',
    '  if [ -f "$HOME/.local/bin/semgrep" ]; then SEMGREP_CMD="$HOME/.local/bin/semgrep";',
    '  elif python3 -m semgrep --version >/dev/null 2>&1; then SEMGREP_CMD="python3 -m semgrep";',
    '  else echo "semgrep installation failed" >&2; exit 1; fi',
    'fi',
    // Run scan
    [
      '$SEMGREP_CMD',
      `--config p/owasp-top-ten`,
      `--config p/security-audit`,
      `--config p/secrets`,
      `--config p/javascript`,
      `--config p/typescript`,
      `--json`,
      `--quiet`,
      `--metrics=off`,
      `--timeout ${timeoutSeconds}`,
      `--max-target-bytes 1000000`,
      `--exclude node_modules`,
      `--exclude .next`,
      `--exclude dist`,
      `--exclude build`,
      `--exclude coverage`,
      `--exclude .vercel`,
      `.`,
    ].join(' '),
  ].join('\n')

  const cmd = await sandbox.runCommand({
    cmd: 'bash',
    args: ['-lc', `${installAndRun}\n`],
  })

  const done = await cmd.wait().catch(() => null)
  const rawExitCode = done?.exitCode ?? null

  const [stdout, stderr] = await Promise.all([
    done?.stdout().catch(() => '') ?? Promise.resolve(''),
    done?.stderr().catch(() => '') ?? Promise.resolve(''),
  ])

  const parsed = sanitizeStdoutToJson(stdout)
  const json = parsed && typeof parsed === 'object' ? (parsed as SemgrepJson) : null
  const parsedOk = Boolean(json && typeof json === 'object' && Array.isArray(json.results))

  const results = Array.isArray(json?.results) ? json!.results! : []
  const findings: SemgrepFinding[] = results
    .map((r) => {
      const checkId = typeof r.check_id === 'string' ? r.check_id : 'semgrep.unknown'
      const path = typeof r.path === 'string' ? r.path : ''
      const message =
        typeof r.extra?.message === 'string' && r.extra.message.trim()
          ? r.extra.message.trim()
          : checkId
      const severity = normalizeSeverity(r.extra?.severity)
      const line = typeof r.start?.line === 'number' && Number.isFinite(r.start.line) ? r.start.line : null

      if (!path) return null

      return {
        checkId,
        message,
        severity,
        path,
        line,
      }
    })
    .filter((f): f is SemgrepFinding => Boolean(f))

  return { findings, rawExitCode, stderr, parsedOk }
}
