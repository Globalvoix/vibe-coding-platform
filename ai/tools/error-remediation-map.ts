import { generationLogger } from './generation-logger'

export type ErrorCategory =
  | 'MODULE_NOT_FOUND'
  | 'PEER_DEPENDENCY_CONFLICT'
  | 'PERMISSION_DENIED'
  | 'EADDRINUSE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SYNTAX_ERROR'
  | 'UNKNOWN'

export interface RemediationAction {
  type:
    | 'auto_install'
    | 'pm_fallback_with_flags'
    | 'auto_port_resolution'
    | 'retry_with_backoff'
    | 'retry_with_timeout_increase'
    | 'skip_validation'
    | 'report_to_user'
  params: Record<string, unknown>
  fallback?: RemediationAction
  maxAttempts?: number
}

export interface ErrorRemediationEntry {
  category: ErrorCategory
  patterns: RegExp[]
  actions: RemediationAction[]
  severity: 'transient' | 'recoverable' | 'permanent'
  description: string
}

/**
 * Error remediation map: Maps error categories to recovery actions
 */
const ERROR_REMEDIATION_MAP: ErrorRemediationEntry[] = [
  {
    category: 'MODULE_NOT_FOUND',
    patterns: [/Cannot find module ['"]([^'"]+)['"]/i, /MODULE_NOT_FOUND/i, /no such file or directory/i],
    actions: [
      {
        type: 'auto_install',
        params: { extractPackageFromError: true },
        fallback: {
          type: 'report_to_user',
          params: { message: 'Could not auto-install missing package, please add to package.json' },
        },
      },
      {
        type: 'retry_with_backoff',
        params: { initialDelayMs: 1000, maxAttempts: 3 },
        maxAttempts: 3,
      },
    ],
    severity: 'recoverable',
    description: 'Missing module or dependency',
  },
  {
    category: 'PEER_DEPENDENCY_CONFLICT',
    patterns: [
      /peer dependency/i,
      /peerDependencies/i,
      /peer.*conflict/i,
      /requires.*but you have/i,
      /conflicting versions/i,
    ],
    actions: [
      {
        type: 'pm_fallback_with_flags',
        params: {
          flags: ['--legacy-peer-deps', '--force', '--ignore-engines'],
          preferredOrder: ['pnpm', 'yarn', 'npm'],
        },
        maxAttempts: 3,
      },
      {
        type: 'report_to_user',
        params: {
          message: 'Peer dependency conflict detected. Attempted auto-resolution with compatibility flags.',
          suggestion: 'Review package.json peer dependencies for conflicts',
        },
      },
    ],
    severity: 'recoverable',
    description: 'Peer dependency version mismatch or conflict',
  },
  {
    category: 'PERMISSION_DENIED',
    patterns: [/EACCES/i, /permission denied/i, /access denied/i],
    actions: [
      {
        type: 'skip_validation',
        params: { operation: 'sudo' },
      },
      {
        type: 'report_to_user',
        params: {
          message: 'Permission error occurred',
          suggestion: 'Check file permissions or run with appropriate privileges',
        },
      },
    ],
    severity: 'permanent',
    description: 'File system permission error',
  },
  {
    category: 'EADDRINUSE',
    patterns: [/EADDRINUSE/i, /port.*already in use/i, /address already in use/i],
    actions: [
      {
        type: 'auto_port_resolution',
        params: { portRange: '3001-3010', retryCount: 3 },
        maxAttempts: 3,
      },
      {
        type: 'report_to_user',
        params: {
          message: 'Port conflict detected, attempting to use alternate port',
        },
      },
    ],
    severity: 'recoverable',
    description: 'Port is already in use',
  },
  {
    category: 'NETWORK_ERROR',
    patterns: [
      /ENOTFOUND/i,
      /ECONNREFUSED/i,
      /ECONNRESET/i,
      /getaddrinfo/i,
      /network.*error/i,
      /registry.*error/i,
    ],
    actions: [
      {
        type: 'retry_with_backoff',
        params: { initialDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2 },
        maxAttempts: 5,
      },
      {
        type: 'report_to_user',
        params: {
          message: 'Network error occurred, retrying...',
          suggestion: 'Check internet connection or registry availability',
        },
      },
    ],
    severity: 'transient',
    description: 'Network or registry connection error',
  },
  {
    category: 'TIMEOUT',
    patterns: [/timeout/i, /ETIMEDOUT/i, /timed out/i],
    actions: [
      {
        type: 'retry_with_timeout_increase',
        params: { currentTimeoutMs: 300000, increasePercentage: 50 },
        maxAttempts: 3,
      },
      {
        type: 'report_to_user',
        params: {
          message: 'Operation timed out, retrying with increased timeout',
        },
      },
    ],
    severity: 'transient',
    description: 'Operation timeout',
  },
  {
    category: 'SYNTAX_ERROR',
    patterns: [/SyntaxError/i, /TypeError/i, /ReferenceError/i, /is not a function/i],
    actions: [
      {
        type: 'report_to_user',
        params: {
          message: 'Syntax or runtime error detected',
          suggestion: 'Review generated code for syntax errors',
        },
      },
    ],
    severity: 'permanent',
    description: 'Syntax or runtime error in generated code',
  },
]

/**
 * Classify error and get remediation actions
 */
export function classifyErrorAndGetRemediation(
  errorOutput: string
): { category: ErrorCategory; actions: RemediationAction[]; description: string; severity: 'transient' | 'recoverable' | 'permanent' } | null {
  for (const entry of ERROR_REMEDIATION_MAP) {
    for (const pattern of entry.patterns) {
      if (pattern.test(errorOutput)) {
        generationLogger.progress('error_remediation', `Classified error as: ${entry.category}`)
        return {
          category: entry.category,
          actions: entry.actions,
          description: entry.description,
          severity: entry.severity,
        }
      }
    }
  }

  generationLogger.progress('error_remediation', 'Could not classify error into known categories')
  return null
}

/**
 * Get next remediation action to attempt
 */
export function getNextRemediationAction(
  category: ErrorCategory,
  attemptIndex: number = 0
): RemediationAction | null {
  const entry = ERROR_REMEDIATION_MAP.find((e) => e.category === category)
  if (!entry) return null

  const action = entry.actions[attemptIndex]
  return action || null
}

/**
 * Get remediation description
 */
export function getRemediationDescription(category: ErrorCategory): string {
  const entry = ERROR_REMEDIATION_MAP.find((e) => e.category === category)
  return entry?.description || 'Unknown error'
}

/**
 * Check if error is recoverable
 */
export function isErrorRecoverable(category: ErrorCategory): boolean {
  const entry = ERROR_REMEDIATION_MAP.find((e) => e.category === category)
  return entry ? entry.severity !== 'permanent' : false
}

/**
 * Get all remediation suggestions for an error category
 */
export function getRemediationSuggestions(category: ErrorCategory): string[] {
  const entry = ERROR_REMEDIATION_MAP.find((e) => e.category === category)
  if (!entry) return []

  const suggestions: string[] = []

  for (const action of entry.actions) {
    switch (action.type) {
      case 'auto_install':
        suggestions.push('Attempting to auto-install missing packages')
        break
      case 'pm_fallback_with_flags':
        const flags = (action.params.flags as string[]) || []
        suggestions.push(`Will try with compatibility flags: ${flags.join(', ')}`)
        break
      case 'auto_port_resolution':
        suggestions.push('Will automatically select an available port')
        break
      case 'retry_with_backoff':
        suggestions.push('Will retry with exponential backoff')
        break
      case 'retry_with_timeout_increase':
        suggestions.push('Will retry with increased timeout')
        break
      case 'skip_validation':
        suggestions.push('Skipping validation for this operation')
        break
      case 'report_to_user':
        const msg = action.params.message as string
        suggestions.push(msg)
        break
    }
  }

  return suggestions
}

export const errorRemediationModule = {
  classifyErrorAndGetRemediation,
  getNextRemediationAction,
  getRemediationDescription,
  isErrorRecoverable,
  getRemediationSuggestions,
  ERROR_REMEDIATION_MAP,
}
