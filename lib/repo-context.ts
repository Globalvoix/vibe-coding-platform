export type RepoContextFile = {
  path: string
  content: string
  encoding?: 'utf8' | 'base64' | string
}

const EXCLUDED_PATH_PREFIXES = [
  'node_modules/',
  '.git/',
  '.next/',
  'dist/',
  'build/',
  'coverage/',
  '.vercel/',
]

const EXCLUDED_FILE_NAMES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
])

function shouldExcludePath(path: string): boolean {
  if (!path) return true

  for (const prefix of EXCLUDED_PATH_PREFIXES) {
    if (path.startsWith(prefix)) return true
  }

  const base = path.split('/').pop() ?? path

  if (EXCLUDED_FILE_NAMES.has(base)) return true

  const lower = base.toLowerCase()
  if (lower === '.env' || lower.startsWith('.env.')) return true
  if (lower.endsWith('.pem') || lower.endsWith('.key') || lower.endsWith('.p12')) return true
  if (lower === 'id_rsa' || lower === 'id_ed25519') return true

  return false
}

function safeTrim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function truncateText(text: string, maxChars: number): string {
  if (maxChars <= 0) return ''
  if (text.length <= maxChars) return text
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`
}

function summarizePaths(paths: string[], maxLines: number): string {
  const groups = new Map<string, number>()
  for (const p of paths) {
    const top = p.split('/')[0] ?? p
    groups.set(top, (groups.get(top) ?? 0) + 1)
  }

  const lines = Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxLines)
    .map(([folder, count]) => `- ${folder}/ (${count})`)

  return lines.length ? lines.join('\n') : '- (none)'
}

function parsePackageJson(content: string): {
  name?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  packageManager?: string
} | null {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    const scripts = parsed.scripts && typeof parsed.scripts === 'object' ? (parsed.scripts as Record<string, unknown>) : null
    const dependencies =
      parsed.dependencies && typeof parsed.dependencies === 'object' ? (parsed.dependencies as Record<string, unknown>) : null
    const devDependencies =
      parsed.devDependencies && typeof parsed.devDependencies === 'object'
        ? (parsed.devDependencies as Record<string, unknown>)
        : null

    return {
      name: safeTrim(parsed.name),
      packageManager: safeTrim(parsed.packageManager),
      scripts: scripts
        ? Object.fromEntries(
            Object.entries(scripts)
              .filter(([, v]) => typeof v === 'string')
              .map(([k, v]) => [k, v as string])
          )
        : undefined,
      dependencies: dependencies
        ? Object.fromEntries(
            Object.entries(dependencies)
              .filter(([, v]) => typeof v === 'string')
              .map(([k, v]) => [k, v as string])
          )
        : undefined,
      devDependencies: devDependencies
        ? Object.fromEntries(
            Object.entries(devDependencies)
              .filter(([, v]) => typeof v === 'string')
              .map(([k, v]) => [k, v as string])
          )
        : undefined,
    }
  } catch {
    return null
  }
}

function chooseInterestingPaths(paths: string[], limit: number): string[] {
  const preferred = [
    'README.md',
    'readme.md',
    'package.json',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mjs',
    'app/',
    'src/',
    'pages/',
    'components/',
    'server/',
    'api/',
  ]

  const score = (p: string): number => {
    let s = 0
    for (let i = 0; i < preferred.length; i++) {
      const pref = preferred[i]
      if (pref.endsWith('/')) {
        if (p.startsWith(pref)) s += 100 - i
      } else {
        if (p === pref) s += 200 - i
      }
    }

    if (p.split('/').length === 1) s += 10
    if (p.endsWith('.ts') || p.endsWith('.tsx')) s += 5
    if (p.endsWith('.js') || p.endsWith('.jsx')) s += 3
    if (p.endsWith('.md')) s += 2

    return s
  }

  return [...paths]
    .sort((a, b) => score(b) - score(a) || a.localeCompare(b))
    .slice(0, limit)
}

export function buildRepoContextFromFiles(params: {
  repoFullName: string
  defaultBranch: string
  files: RepoContextFile[]
  maxChars?: number
}): string {
  const maxChars = typeof params.maxChars === 'number' && params.maxChars > 0 ? params.maxChars : 9000

  const textFiles = params.files.filter(
    (f) =>
      f &&
      typeof f.path === 'string' &&
      f.path &&
      !shouldExcludePath(f.path) &&
      (f.encoding ?? 'utf8') !== 'base64' &&
      typeof f.content === 'string'
  )

  const allPaths = textFiles.map((f) => f.path)
  const interestingPaths = chooseInterestingPaths(allPaths, 80)

  const packageJson = textFiles.find((f) => f.path === 'package.json')
  const readme = textFiles.find((f) => /^readme\.md$/i.test(f.path))

  const pkg = packageJson ? parsePackageJson(packageJson.content) : null

  const lines: string[] = []
  lines.push('# REPOSITORY CONTEXT (Imported from GitHub)')
  lines.push('')
  lines.push(`Repository: ${params.repoFullName}`)
  lines.push(`Default branch: ${params.defaultBranch}`)
  lines.push('')

  lines.push('## High-level structure')
  lines.push(summarizePaths(allPaths, 25))
  lines.push('')

  if (pkg) {
    lines.push('## package.json summary')
    if (pkg.name) lines.push(`- name: ${pkg.name}`)
    if (pkg.packageManager) lines.push(`- packageManager: ${pkg.packageManager}`)

    const scripts = pkg.scripts ? Object.entries(pkg.scripts) : []
    if (scripts.length > 0) {
      lines.push('- scripts:')
      for (const [k, v] of scripts.slice(0, 20)) {
        lines.push(`  - ${k}: ${v}`)
      }
      if (scripts.length > 20) lines.push(`  - … (${scripts.length - 20} more)`) 
    }

    const depsCount = pkg.dependencies ? Object.keys(pkg.dependencies).length : 0
    const devDepsCount = pkg.devDependencies ? Object.keys(pkg.devDependencies).length : 0
    lines.push(`- dependencies: ${depsCount}`)
    lines.push(`- devDependencies: ${devDepsCount}`)
    lines.push('')
  }

  if (readme) {
    lines.push('## README (first section)')
    lines.push('```')
    lines.push(truncateText(readme.content.trim(), 1800))
    lines.push('```')
    lines.push('')
  }

  lines.push('## Interesting files/paths')
  if (interestingPaths.length === 0) {
    lines.push('- (none)')
  } else {
    for (const p of interestingPaths) lines.push(`- ${p}`)
  }

  const combined = lines.join('\n')
  return truncateText(combined, maxChars)
}
