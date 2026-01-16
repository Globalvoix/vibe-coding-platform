/**
 * Centralized configuration for the code generation pipeline
 * Controls retry strategies, package managers, validation, and other generation parameters
 */

export interface GenerationConfig {
  retry: {
    maxAttempts: number
    initialDelayMs: number
    maxDelayMs: number
    backoffMultiplier: number
    jitterFactor: number
  }
  transientErrors: string[]
  packageManagers: ('pnpm' | 'yarn' | 'npm')[]
  features: {
    preValidation: boolean
    healthChecks: boolean
    integrityChecks: boolean
    fallbackStrategies: boolean
    buildOutputParsing: boolean
    dependencyPrecheck: boolean
  }
  sandbox: {
    healthCheckTimeoutMs: number
    fileWriteTimeoutMs: number
    fileReadTimeoutMs: number
    commandTimeoutMs: number
  }
  validation: {
    checkDiskSpace: boolean
    checkMemory: boolean
    checkNodeVersion: boolean
    checkPackageRegistry: boolean
  }
}

export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  retry: {
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },
  transientErrors: [
    'TIMEOUT',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ECONNRESET',
    'socket hang up',
    'ENOTFOUND',
    'temporarily unavailable',
    'sandbox_busy',
    'temporarily stopped',
    'temporarily',
    'rate limit',
    'too many requests',
  ],
  packageManagers: ['pnpm', 'yarn', 'npm'],
  features: {
    preValidation: true,
    healthChecks: true,
    integrityChecks: true,
    fallbackStrategies: true,
    buildOutputParsing: true,
    dependencyPrecheck: true,
  },
  sandbox: {
    healthCheckTimeoutMs: 5000,
    fileWriteTimeoutMs: 30000,
    fileReadTimeoutMs: 10000,
    commandTimeoutMs: 300000, // 5 minutes for install/build
  },
  validation: {
    checkDiskSpace: true,
    checkMemory: true,
    checkNodeVersion: true,
    checkPackageRegistry: false, // Can be slow, disabled by default
  },
}

/**
 * Global configuration instance
 */
let globalConfig: GenerationConfig = { ...DEFAULT_GENERATION_CONFIG }

/**
 * Get current configuration
 */
export function getGenerationConfig(): GenerationConfig {
  return { ...globalConfig }
}

/**
 * Update configuration
 */
export function updateGenerationConfig(config: Partial<GenerationConfig>): void {
  globalConfig = { ...globalConfig, ...config }
}

/**
 * Reset to defaults
 */
export function resetGenerationConfig(): void {
  globalConfig = { ...DEFAULT_GENERATION_CONFIG }
}

/**
 * Get retry configuration
 */
export function getRetryConfig() {
  return { ...globalConfig.retry }
}

/**
 * Update retry configuration
 */
export function updateRetryConfig(config: Partial<GenerationConfig['retry']>): void {
  globalConfig.retry = { ...globalConfig.retry, ...config }
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof GenerationConfig['features']): boolean {
  return globalConfig.features[feature]
}

/**
 * Get preferred package managers in order
 */
export function getPackageManagerPreference(): ('pnpm' | 'yarn' | 'npm')[] {
  return [...globalConfig.packageManagers]
}

/**
 * Check if error is transient based on configuration
 */
export function isTransientError(errorMessage: string): boolean {
  return globalConfig.transientErrors.some((pattern) =>
    new RegExp(pattern, 'i').test(errorMessage)
  )
}
