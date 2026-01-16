import { RetryStrategy } from './retry-strategy'
import { errorClassifier } from './error-classifier'
import { generationLogger } from './generation-logger'

export type RecoveryCallback<T> = () => Promise<T>

/**
 * Handles automatic recovery from transient errors
 */
export class TransientErrorHandler {
  private retryStrategy: RetryStrategy

  constructor(retryStrategy?: RetryStrategy) {
    this.retryStrategy = retryStrategy || new RetryStrategy()
  }

  /**
   * Execute operation with automatic transient error recovery
   */
  async executeWithRecovery<T>(
    operation: RecoveryCallback<T>,
    operationName: string = 'Operation'
  ): Promise<T> {
    return this.retryStrategy.execute(async (context) => {
      try {
        return await operation()
      } catch (error) {
        const classified = errorClassifier.classify(error)

        if (classified.category === 'transient') {
          generationLogger.progress(
            'error_recovery',
            `${operationName} encountered transient error, will retry`,
            context.attempt,
            context.totalAttempts
          )
        }

        throw error
      }
    }, operationName)
  }

  /**
   * Execute with custom recovery strategy for specific error types
   */
  async executeWithCustomRecovery<T>(
    operation: RecoveryCallback<T>,
    operationName: string,
    recoveryStrategies: Map<string, RecoveryCallback<T>>
  ): Promise<T> {
    try {
      return await this.executeWithRecovery(operation, operationName)
    } catch (error) {
      const classified = errorClassifier.classify(error)

      const strategy = recoveryStrategies.get(classified.category)
      if (strategy) {
        generationLogger.progress('error_recovery', `Attempting custom recovery for ${operationName}`)

        try {
          return await strategy()
        } catch (recoveryError) {
          generationLogger.error(
            'error_recovery',
            `Recovery strategy failed for ${operationName}`,
            classified.category,
            String(recoveryError)
          )
          throw error
        }
      }

      throw error
    }
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(error: unknown): boolean {
    const classified = errorClassifier.classify(error)
    return classified.isRetryable || classified.category === 'recoverable'
  }

  /**
   * Get recovery suggestions for error
   */
  getRecoverySuggestions(error: unknown): string[] {
    const classified = errorClassifier.classify(error)
    return classified.recoveryHints
  }
}

export const transientErrorHandler = new TransientErrorHandler()
