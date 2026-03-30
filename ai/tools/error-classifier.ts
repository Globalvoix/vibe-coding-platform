export type ErrorCategory = 'transient' | 'permanent' | 'recoverable' | 'critical'
export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface ClassifiedError {
  category: ErrorCategory
  severity: Severity
  message: string
  code?: string
  recoveryHints: string[]
  isRetryable: boolean
  shouldNotify: boolean
  context?: Record<string, unknown>
}

/**
 * Classifies errors into categories for intelligent handling
 * - transient: temporary failures that may succeed on retry (network, busy, timeout)
 * - permanent: failures that won't succeed on retry (syntax, missing file, auth)
 * - recoverable: failures that need specific action to recover (peer deps, port in use)
 * - critical: failures that require human intervention (sandbox crashed, corrupted data)
 */
export class ErrorClassifier {
  private transientPatterns = [
    /timeout/i,
    /ETIMEDOUT/,
    /ECONNREFUSED/,
    /ECONNRESET/,
    /socket hang up/i,
    /ENOTFOUND/,
    /temporarily unavailable/i,
    /temporarily stopped/i,
    /sandbox_stopped/,
    /temporarily/i,
    /try again/i,
    /rate limit/i,
    /too many requests/i,
    /ECONNABORTED/,
    /ERR_HTTP2_STREAM_ERROR/i,
    /getaddrinfo.*ENOTFOUND/i,
    /connect.*ECONNREFUSED/i,
    /network.*error/i,
    /registry.*unreachable/i,
    /npm.*registry.*timeout/i,
    /disk.*full/i,
    /out of memory/i,
    /insufficient.*space/i,
  ]

  private permanentPatterns = [
    /syntax error/i,
    /SyntaxError/,
    /ReferenceError/,
    /TypeError/,
    /Cannot find module/i,
    /MODULE_NOT_FOUND/,
    /not defined/i,
    /is not a function/i,
    /ENOENT.*no such file/i,
    /permission denied/i,
    /EACCES/,
    /unauthorized/i,
    /401|403/,
    /invalid syntax/i,
    /parse error/i,
    /expected.*but/i,
    /unexpected token/i,
    /AssertionError/,
    /does not exist/i,
    /not found in package/i,
    /ERR_MODULE_NOT_FOUND/i,
    /invalid package name/i,
    /ERR_INVALID_/i,
  ]

  private recoverablePatterns = [
    /peer dependency/i,
    /peer dependencies/i,
    /unsatisfied peer/i,
    /port.*already in use/i,
    /EADDRINUSE/,
    /conflicting versions/i,
    /version mismatch/i,
    /incompatible/i,
    /downgrade/i,
    /requires.*but you have/i,
    /conflicting peer/i,
    /ERR!.*peer/i,
    /pnpm.*peer.*conflict/i,
    /ignore.*peer.*dependencies/i,
  ]

  classify(error: unknown, context?: Record<string, unknown>): ClassifiedError {
    const errorMessage = this.extractMessage(error)
    const errorCode = this.extractCode(error)
    const errorText = this.extractText(error)

    // Check for critical errors first
    if (this.isCritical(errorMessage, errorCode)) {
      return {
        category: 'critical',
        severity: 'critical',
        message: errorMessage,
        code: errorCode,
        recoveryHints: [
          'This is a critical error that requires manual investigation.',
          'Check sandbox health and retry the operation.',
        ],
        isRetryable: false,
        shouldNotify: true,
        context,
      }
    }

    // Check for transient errors
    if (this.isTransient(errorMessage, errorText, errorCode)) {
      return {
        category: 'transient',
        severity: this.getTransientSeverity(errorCode),
        message: errorMessage,
        code: errorCode,
        recoveryHints: [
          'This appears to be a temporary issue (network, timeout, or resource busy).',
          'The operation will be retried automatically with exponential backoff.',
          'If this persists, check network connectivity and sandbox resources.',
        ],
        isRetryable: true,
        shouldNotify: false,
        context,
      }
    }

    // Check for recoverable errors
    if (this.isRecoverable(errorMessage, errorText)) {
      return {
        category: 'recoverable',
        severity: 'high',
        message: errorMessage,
        code: errorCode,
        recoveryHints: this.getRecoveryHints(errorMessage, errorText),
        isRetryable: false,
        shouldNotify: true,
        context,
      }
    }

    // Default to permanent
    return {
      category: 'permanent',
      severity: 'high',
      message: errorMessage,
      code: errorCode,
      recoveryHints: [
        'This error appears to be permanent and will not succeed on retry.',
        'Review the error message and fix the underlying issue.',
        `Error: ${errorMessage}`,
      ],
      isRetryable: false,
      shouldNotify: true,
      context,
    }
  }

  private isCritical(message: string, code?: string): boolean {
    const criticalPatterns = [
      /sandbox.*crashed/i,
      /authentication failed/i,
      /corrupted/i,
      /fatal error/i,
      /out of memory/i,
      /FATAL/,
    ]

    return (
      criticalPatterns.some((p) => p.test(message)) ||
      code === 'sandbox_crashed' ||
      code === 'auth_failed'
    )
  }

  private isTransient(message: string, text: string, code?: string): boolean {
    const fullText = `${message} ${text}`
    return (
      this.transientPatterns.some((p) => p.test(fullText)) ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNREFUSED' ||
      code === 'sandbox_busy'
    )
  }

  private isRecoverable(message: string, text: string): boolean {
    const fullText = `${message} ${text}`
    return this.recoverablePatterns.some((p) => p.test(fullText))
  }

  private getTransientSeverity(code?: string): Severity {
    if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT') return 'medium'
    return 'low'
  }

  private getRecoveryHints(message: string, text: string): string[] {
    const fullText = `${message} ${text}`.toLowerCase()
    const hints: string[] = []

    if (fullText.includes('peer dependency') || fullText.includes('peer dependencies')) {
      hints.push(
        'Peer dependency conflict detected.',
        'AUTO-FIX: System will automatically try with compatibility flags (--legacy-peer-deps for npm, --force for pnpm).',
        'MANUAL: Update package.json to use compatible versions.',
        'Example: npm install --legacy-peer-deps'
      )
    }

    if (fullText.includes('cannot find module') || fullText.includes('module_not_found')) {
      hints.push(
        'Missing package or module detected.',
        'AUTO-FIX: System will attempt to auto-install the missing package.',
        'MANUAL: Add the package to package.json or run: npm install <package-name>',
        'Verify package name is spelled correctly'
      )
    }

    if (fullText.includes('port') && fullText.includes('in use')) {
      hints.push(
        'Port is already in use by another process.',
        'AUTO-FIX: System will automatically select an available alternate port.',
        'MANUAL: Kill the process using this port or specify a different port.',
        'Example: lsof -i :PORT to find the process'
      )
    }

    if (fullText.includes('version') || fullText.includes('mismatch')) {
      hints.push(
        'Version conflict between packages.',
        'AUTO-FIX: System will retry with compatibility flags and alternate package managers.',
        'MANUAL: Review package.json and update to compatible versions.',
        'Check package documentation for version compatibility'
      )
    }

    if (fullText.includes('timeout') || fullText.includes('etimedout')) {
      hints.push(
        'Operation timed out.',
        'AUTO-FIX: System will retry with exponential backoff.',
        'MANUAL: Check network connectivity and registry availability.',
        'Increase timeout if operation is large (many dependencies)'
      )
    }

    if (fullText.includes('permission denied') || fullText.includes('eacces')) {
      hints.push(
        'File system permission error.',
        'Check file and directory permissions.',
        'Ensure sufficient access rights to write to sandbox directories.',
        'May need to adjust ownership or permissions'
      )
    }

    if (fullText.includes('syntax error') || fullText.includes('type error') || fullText.includes('reference error')) {
      hints.push(
        'Code syntax or runtime error detected.',
        'Review generated code for errors.',
        'Check that all required dependencies are installed.',
        'Run type checker: pnpm tsc --noEmit'
      )
    }

    if (fullText.includes('network') || fullText.includes('enotfound') || fullText.includes('econnrefused')) {
      hints.push(
        'Network or registry connection error.',
        'AUTO-FIX: System will retry with exponential backoff.',
        'MANUAL: Check internet connection and npm/yarn/pnpm registry availability.',
        'Try using a different registry: npm config set registry https://registry.npmjs.org/'
      )
    }

    if (hints.length === 0) {
      hints.push(
        'This error may be recoverable or requires specific handling.',
        'The system will attempt relevant auto-fixes based on error classification.',
        'If auto-fixes fail, review the error message and take appropriate action.',
        'Check package/tool documentation if needed.'
      )
    }

    return hints
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'object' && error !== null) {
      if ('message' in error && typeof (error as Record<string, unknown>).message === 'string') {
        return (error as Record<string, unknown>).message as string
      }
      if ('error' in error && typeof (error as Record<string, unknown>).error === 'string') {
        return (error as Record<string, unknown>).error as string
      }
    }
    return String(error)
  }

  private extractCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null) {
      if ('code' in error && typeof (error as Record<string, unknown>).code === 'string') {
        return (error as Record<string, unknown>).code as string
      }
    }
    return undefined
  }

  private extractText(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      if ('text' in error && typeof (error as Record<string, unknown>).text === 'string') {
        return (error as Record<string, unknown>).text as string
      }
      if ('stderr' in error && typeof (error as Record<string, unknown>).stderr === 'string') {
        return (error as Record<string, unknown>).stderr as string
      }
    }
    return ''
  }
}

export const errorClassifier = new ErrorClassifier()
