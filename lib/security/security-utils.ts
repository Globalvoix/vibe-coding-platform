import { Sandbox } from '@vercel/sandbox'

export interface SecurityIssue {
  id: string
  level: 'Error' | 'Warning'
  title: string
  filePath?: string
  lineNumber?: number
}

export async function readFileFromSandbox(
  sandbox: Awaited<ReturnType<typeof Sandbox.get>>,
  filePath: string
): Promise<string | null> {
  try {
    const stream = await sandbox.readFile({ path: filePath })
    if (!stream) return null

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer)
    }

    return Buffer.concat(chunks).toString('utf-8')
  } catch {
    return null
  }
}

export async function getSandboxFiles(
  sandboxId: string,
  filePaths: string[]
): Promise<Array<{ path: string; content: string }>> {
  const sandbox = await Sandbox.get({ sandboxId })
  const files: Array<{ path: string; content: string }> = []

  for (const filePath of filePaths) {
    const content = await readFileFromSandbox(sandbox, filePath)
    if (typeof content === 'string') {
      files.push({ path: filePath, content })
    }
  }

  return files
}

function findLineNumber(content: string, predicate: (line: string) => boolean): number | undefined {
  const lines = content.split('\n')
  const idx = lines.findIndex(predicate)
  if (idx < 0) return undefined
  return idx + 1
}

function hasApiAuth(content: string): boolean {
  return /\bauth\s*\(/.test(content) || /from\s+['\"]@clerk\/.+['\"]/.test(content)
}

function hasInsecureHttpUrl(content: string): boolean {
  const httpIdx = content.indexOf('http://')
  if (httpIdx === -1) return false

  const snippet = content.slice(Math.max(0, httpIdx - 40), httpIdx + 80)
  return !snippet.includes('localhost') && !snippet.includes('127.0.0.1')
}

function hasPotentialSqlInjection(content: string): boolean {
  const queryCall = /\b(query|execute)\s*\(/.test(content)
  if (!queryCall) return false

  const concatenation = /\+\s*[^\n]*\b(query|execute)\s*\(|\b(query|execute)\s*\([^\)]*\+/.test(content)
  const templateLiteral = /\b(query|execute)\s*\(\s*`[\s\S]*\$\{/.test(content)
  return concatenation || templateLiteral
}

function hasPotentialHardcodedSecret(content: string): boolean {
  const patterns = [
    /\b(API_KEY|SECRET|TOKEN|PASSWORD)\b\s*[:=]\s*['\"][^'\"]{8,}['\"]/i,
    /\b(API_KEY|SECRET|TOKEN|PASSWORD)\b\s*[:=]\s*`[^`]{8,}`/i,
  ]

  return patterns.some((re) => re.test(content))
}

export function scanFilesForIssues(files: Array<{ path: string; content: string }>): SecurityIssue[] {
  const issues: SecurityIssue[] = []

  for (const file of files) {
    const { path, content } = file

    if (path.includes('/api/') && !hasApiAuth(content)) {
      issues.push({
        id: `missing-auth:${path}`,
        level: 'Error',
        title: 'API Endpoint Missing Authentication',
        filePath: path,
        lineNumber: 1,
      })
    }

    if (hasPotentialSqlInjection(content)) {
      issues.push({
        id: `sql-injection:${path}`,
        level: 'Error',
        title: 'Potential SQL Injection Vulnerability',
        filePath: path,
        lineNumber: findLineNumber(content, (line) => /\b(query|execute)\s*\(/.test(line)),
      })
    }

    if (hasPotentialHardcodedSecret(content)) {
      issues.push({
        id: `hardcoded-secret:${path}`,
        level: 'Warning',
        title: 'Potential Hardcoded Secret or Credential',
        filePath: path,
        lineNumber: findLineNumber(content, (line) => /\b(API_KEY|SECRET|TOKEN|PASSWORD)\b/i.test(line)),
      })
    }

    if (hasInsecureHttpUrl(content)) {
      issues.push({
        id: `insecure-transport:${path}`,
        level: 'Warning',
        title: 'Insecure Transport (HTTP instead of HTTPS)',
        filePath: path,
        lineNumber: findLineNumber(content, (line) => line.includes('http://')),
      })
    }
  }

  return issues
}

export function dedupeIssues(issues: SecurityIssue[]): SecurityIssue[] {
  const seen = new Set<string>()
  const result: SecurityIssue[] = []

  for (const issue of issues) {
    const key = `${issue.title}::${issue.filePath ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(issue)
  }

  return result
}

function isSafeSqlIdentifier(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

async function supabaseDatabaseQuery(params: {
  projectRef: string
  accessToken: string
  query: string
}): Promise<unknown[]> {
  const response = await fetch(`https://api.supabase.com/v1/projects/${params.projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: params.query }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Supabase database query failed (${response.status}): ${text}`)
  }

  const data = (await response.json()) as { result?: unknown[] }
  return Array.isArray(data.result) ? data.result : []
}

export async function getSupabaseSecurityIssues(params: {
  projectRef: string
  accessToken: string
}): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = []

  const tables = await supabaseDatabaseQuery({
    projectRef: params.projectRef,
    accessToken: params.accessToken,
    query:
      "SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r';",
  })

  const rlsByTable = new Map<string, boolean>()
  for (const row of tables) {
    if (typeof row !== 'object' || row === null) continue
    const record = row as Record<string, unknown>
    const tableName = typeof record.table_name === 'string' ? record.table_name : null
    const rlsEnabled = typeof record.rls_enabled === 'boolean' ? record.rls_enabled : null
    if (!tableName || rlsEnabled === null) continue
    rlsByTable.set(tableName, rlsEnabled)

    if (!rlsEnabled) {
      issues.push({
        id: `supabase-rls-disabled:${tableName}`,
        level: 'Error',
        title: `Row Level Security disabled on public.${tableName}`,
        filePath: `supabase_tables:${tableName}`,
      })
    }
  }

  const policies = await supabaseDatabaseQuery({
    projectRef: params.projectRef,
    accessToken: params.accessToken,
    query:
      "SELECT tablename AS table_name, COUNT(*)::int AS policy_count FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename;",
  })

  const policiesByTable = new Map<string, number>()
  for (const row of policies) {
    if (typeof row !== 'object' || row === null) continue
    const record = row as Record<string, unknown>
    const tableName = typeof record.table_name === 'string' ? record.table_name : null
    const policyCount = typeof record.policy_count === 'number' ? record.policy_count : null
    if (!tableName || policyCount === null) continue
    policiesByTable.set(tableName, policyCount)
  }

  for (const [tableName, rlsEnabled] of rlsByTable) {
    if (!rlsEnabled) continue
    if ((policiesByTable.get(tableName) ?? 0) === 0) {
      issues.push({
        id: `supabase-no-policies:${tableName}`,
        level: 'Warning',
        title: `No RLS policies found for public.${tableName}`,
        filePath: `supabase_tables:${tableName}`,
      })
    }
  }

  return issues
}

export async function tryFixSupabaseIssue(params: {
  projectRef: string
  accessToken: string
  issue: SecurityIssue
}): Promise<{ applied: boolean; error?: string }> {
  const filePath = params.issue.filePath
  if (!filePath?.startsWith('supabase_tables:')) return { applied: false }

  const tableName = filePath.replace('supabase_tables:', '').trim()
  if (!isSafeSqlIdentifier(tableName)) {
    return { applied: false, error: 'Invalid table name' }
  }

  const columns = await supabaseDatabaseQuery({
    projectRef: params.projectRef,
    accessToken: params.accessToken,
    query: `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}';`,
  })

  const columnNames = new Set<string>()
  for (const row of columns) {
    if (typeof row !== 'object' || row === null) continue
    const record = row as Record<string, unknown>
    const col = typeof record.column_name === 'string' ? record.column_name : null
    if (col) columnNames.add(col)
  }

  const ownerColumn = columnNames.has('user_id')
    ? 'user_id'
    : columnNames.has('owner_id')
      ? 'owner_id'
      : null

  if (!ownerColumn) {
    return { applied: false, error: `Cannot safely generate policy (missing user_id/owner_id on public.${tableName})` }
  }

  const policyName = 'users_own_rows'

  const ddl = [
    `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS ${policyName} ON public.${tableName};`,
    `CREATE POLICY ${policyName} ON public.${tableName} FOR ALL USING (auth.uid() = ${ownerColumn}) WITH CHECK (auth.uid() = ${ownerColumn});`,
  ].join('\n')

  await supabaseDatabaseQuery({
    projectRef: params.projectRef,
    accessToken: params.accessToken,
    query: ddl,
  })

  return { applied: true }
}
