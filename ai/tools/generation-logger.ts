export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type ActionType =
  | 'file_write'
  | 'file_read'
  | 'package_install'
  | 'dev_start'
  | 'sandbox_health_check'
  | 'error_recovery'
  | 'validation'
  | 'generation'
  | 'run_command'
  | 'auto_install'
  | 'port_resolution'
  | 'sandbox_setup'

export interface LogPersistenceAdapter {
  save(projectId: string, userId: string, logs: GenerationLogEntry[]): Promise<void>
  retrieve(projectId: string, limit?: number): Promise<GenerationLogEntry[]>
  delete(projectId: string, logIdOrTimestamp?: string | number): Promise<void>
}

export interface SandboxHealth {
  disk?: string
  memory?: string
  processes?: number
}

export interface GenerationLogEntry {
  timestamp: number
  level: LogLevel
  action: ActionType
  status: 'start' | 'progress' | 'success' | 'error'
  duration?: number
  message: string
  errorType?: string
  errorMessage?: string
  attempt?: number
  totalAttempts?: number
  sandboxHealth?: SandboxHealth
  recovery?: string
  context?: Record<string, unknown>
}

/**
 * Structured logger for generation pipeline with context tracking
 */
export class GenerationLogger {
  private logs: GenerationLogEntry[] = []
  private startTimes: Map<string, number> = new Map()
  private logLevel: LogLevel

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel
  }

  /**
   * Log an action start
   */
  start(action: ActionType, message: string, context?: Record<string, unknown>): void {
    const key = `${action}-${Date.now()}-${Math.random()}`
    this.startTimes.set(key, Date.now())

    const entry: GenerationLogEntry = {
      timestamp: Date.now(),
      level: 'info',
      action,
      status: 'start',
      message,
      context,
    }

    this.log(entry)
    return
  }

  /**
   * Log action progress
   */
  progress(
    action: ActionType,
    message: string,
    attempt?: number,
    totalAttempts?: number
  ): void {
    const entry: GenerationLogEntry = {
      timestamp: Date.now(),
      level: 'info',
      action,
      status: 'progress',
      message,
      attempt,
      totalAttempts,
    }

    this.log(entry)
  }

  /**
   * Log successful action completion
   */
  success(
    action: ActionType,
    message: string,
    duration?: number,
    context?: Record<string, unknown>
  ): void {
    const entry: GenerationLogEntry = {
      timestamp: Date.now(),
      level: 'info',
      action,
      status: 'success',
      message,
      duration,
      context,
    }

    this.log(entry)
  }

  /**
   * Log an error
   */
  error(
    action: ActionType,
    message: string,
    errorType?: string,
    errorMessage?: string,
    recovery?: string
  ): void {
    const entry: GenerationLogEntry = {
      timestamp: Date.now(),
      level: 'error',
      action,
      status: 'error',
      message,
      errorType,
      errorMessage,
      recovery,
    }

    this.log(entry)
  }

  /**
   * Log with full details
   */
  private log(entry: GenerationLogEntry): void {
    this.logs.push(entry)

    const shouldLog = this.shouldLogLevel(entry.level)
    if (shouldLog) {
      const logMessage = this.formatLogMessage(entry)
      if (entry.level === 'error') {
        console.error(logMessage)
      } else if (entry.level === 'warn') {
        console.warn(logMessage)
      } else {
        console.log(logMessage)
      }
    }
  }

  /**
   * Format log message for console output
   */
  private formatLogMessage(entry: GenerationLogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString()
    const levelStr = entry.level.toUpperCase().padEnd(5)
    const actionStr = entry.action.padEnd(20)

    let message = `[${timestamp}] ${levelStr} ${actionStr} ${entry.message}`

    if (entry.status === 'start') {
      message = `${message}...`
    } else if (entry.status === 'progress') {
      if (entry.attempt && entry.totalAttempts) {
        message = `${message} (attempt ${entry.attempt}/${entry.totalAttempts})`
      }
    } else if (entry.status === 'success') {
      if (entry.duration) {
        message = `${message} (${entry.duration}ms)`
      }
    } else if (entry.status === 'error') {
      message = `${message}\n  Error: ${entry.errorMessage || 'Unknown error'}`
      if (entry.recovery) {
        message = `${message}\n  Recovery: ${entry.recovery}`
      }
    }

    return message
  }

  /**
   * Check if log level should be printed
   */
  private shouldLogLevel(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentIndex = levels.indexOf(this.logLevel)
    const entryIndex = levels.indexOf(level)
    return entryIndex >= currentIndex
  }

  /**
   * Get all logs
   */
  getLogs(): GenerationLogEntry[] {
    return [...this.logs]
  }

  /**
   * Get logs filtered by action
   */
  getLogsByAction(action: ActionType): GenerationLogEntry[] {
    return this.logs.filter((log) => log.action === action)
  }

  /**
   * Get logs filtered by status
   */
  getLogsByStatus(status: 'start' | 'progress' | 'success' | 'error'): GenerationLogEntry[] {
    return this.logs.filter((log) => log.status === status)
  }

  /**
   * Get error logs
   */
  getErrors(): GenerationLogEntry[] {
    return this.logs.filter((log) => log.level === 'error')
  }

  /**
   * Generate a summary report
   */
  generateReport(): string {
    const lines: string[] = []
    const errorLogs = this.getErrors()

    lines.push('=== GENERATION REPORT ===')
    lines.push(`Total logs: ${this.logs.length}`)
    lines.push(`Errors: ${errorLogs.length}`)
    lines.push('')

    if (errorLogs.length > 0) {
      lines.push('ERRORS:')
      for (const log of errorLogs) {
        lines.push(`  [${log.action}] ${log.message}`)
        if (log.errorMessage) {
          lines.push(`    ${log.errorMessage}`)
        }
        if (log.recovery) {
          lines.push(`    Recovery: ${log.recovery}`)
        }
      }
    }

    lines.push('')
    lines.push('TIMELINE:')
    for (const log of this.logs.slice(-10)) {
      const time = new Date(log.timestamp).toISOString().split('T')[1]
      lines.push(`  ${time} [${log.status}] ${log.action}: ${log.message}`)
    }

    return lines.join('\n')
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = []
    this.startTimes.clear()
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }
}

export const generationLogger = new GenerationLogger()
