import { errorClassifier } from './error-classifier'

export interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterFactor: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
}

export interface RetryContext {
  attempt: number
  totalAttempts: number
  lastError?: Error
  nextDelayMs?: number
}

export type RetryCallback<T> = (context: RetryContext) => Promise<T>

/**
 * Intelligent retry strategy with exponential backoff and jitter.
 * Automatically retries only transient errors, not permanent ones.
 */
export class RetryStrategy {
  constructor(private config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  /**
   * Executes a function with automatic retry on transient errors.
   * @param operation The async operation to retry
   * @param operationName Name of the operation for logging/error messages
   * @returns Result of the operation
   * @throws Error if all retries exhausted or error is not transient
   */
  async execute<T>(
    operation: RetryCallback<T>,
    operationName: string = 'Operation'
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation({ attempt, totalAttempts: this.config.maxAttempts })
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        const classified = errorClassifier.classify(error)

        if (!classified.isRetryable) {
          throw error
        }

        if (attempt < this.config.maxAttempts) {
          const delayMs = this.calculateDelay(attempt)
          console.warn(
            `${operationName} failed (attempt ${attempt}/${this.config.maxAttempts}): ${lastError.message}. Retrying in ${delayMs}ms...`
          )

          await this.delay(delayMs)
        }
      }
    }

    throw new Error(
      `${operationName} failed after ${this.config.maxAttempts} attempts: ${lastError?.message}`
    )
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attemptNumber: number): number {
    const exponentialDelay = Math.min(
      this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attemptNumber - 1),
      this.config.maxDelayMs
    )

    const jitter = exponentialDelay * this.config.jitterFactor * Math.random()
    return Math.floor(exponentialDelay + jitter)
  }

  /**
   * Sleep for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Update retry configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config }
  }
}

/**
 * Create a retry strategy with custom config
 */
export function createRetryStrategy(config?: Partial<RetryConfig>): RetryStrategy {
  return new RetryStrategy({ ...DEFAULT_RETRY_CONFIG, ...config })
}

/**
 * Global default retry strategy instance
 */
export const defaultRetryStrategy = new RetryStrategy()
