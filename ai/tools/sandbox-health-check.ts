import { Sandbox } from '@vercel/sandbox'
import { generationLogger } from './generation-logger'

export interface HealthCheckMetadata {
  diskUsage?: string
  memoryUsage?: string
  runningProcesses?: number
}

export interface HealthCheckResult {
  healthy: boolean
  checks: {
    connectivity: boolean
    diskSpace?: boolean
    memory?: boolean
    processes?: boolean
    portAvailable?: boolean
  }
  warnings: string[]
  errors: string[]
  metadata: HealthCheckMetadata
}

/**
 * Performs comprehensive sandbox health checks
 */
export class SandboxHealthChecker {
  /**
   * Run full health check on a sandbox
   */
  async checkHealth(sandbox: Sandbox, port?: number): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      healthy: true,
      checks: { connectivity: false },
      warnings: [],
      errors: [],
      metadata: {},
    }

    generationLogger.start('sandbox_health_check', 'Starting comprehensive health check')

    try {
      // 1. Basic connectivity check
      result.checks.connectivity = await this.checkConnectivity(sandbox)
      if (!result.checks.connectivity) {
        result.healthy = false
        result.errors.push('Sandbox is not responding to basic commands')
      }

      if (!result.checks.connectivity) {
        generationLogger.error('sandbox_health_check', 'Connectivity check failed', 'CONNECTIVITY_ERROR')
        return result
      }

      // 2. Disk space check
      try {
        result.checks.diskSpace = await this.checkDiskSpace(sandbox, result.metadata)
        if (!result.checks.diskSpace) {
          result.healthy = false
          result.errors.push('Low disk space available in sandbox')
        }
      } catch (error) {
        result.warnings.push(`Disk space check failed: ${String(error)}`)
      }

      // 3. Memory check
      try {
        result.checks.memory = await this.checkMemory(sandbox, result.metadata)
        if (!result.checks.memory) {
          result.warnings.push('Low memory available in sandbox')
        }
      } catch (error) {
        result.warnings.push(`Memory check failed: ${String(error)}`)
      }

      // 4. Process check
      try {
        result.checks.processes = await this.checkProcesses(sandbox, result.metadata)
        if (!result.checks.processes) {
          result.warnings.push('Many processes running in sandbox')
        }
      } catch (error) {
        result.warnings.push(`Process check failed: ${String(error)}`)
      }

      // 5. Port availability check (if port specified)
      if (port) {
        try {
          result.checks.portAvailable = await this.checkPortAvailable(sandbox, port)
          if (!result.checks.portAvailable) {
            result.healthy = false
            result.errors.push(`Port ${port} is already in use`)
          }
        } catch (error) {
          result.warnings.push(`Port availability check failed: ${String(error)}`)
        }
      }

      generationLogger.success('sandbox_health_check', 'Health check completed', 0, {
        healthy: result.healthy,
        errors: result.errors.length,
        warnings: result.warnings.length,
      })
    } catch (error) {
      result.healthy = false
      result.errors.push(`Unexpected error during health check: ${String(error)}`)
      generationLogger.error(
        'sandbox_health_check',
        'Health check failed unexpectedly',
        'HEALTH_CHECK_ERROR',
        String(error)
      )
    }

    return result
  }

  /**
   * Check basic connectivity
   */
  private async checkConnectivity(sandbox: Sandbox): Promise<boolean> {
    try {
      await sandbox.runCommand({ cmd: 'echo', args: ['status'] })
      return true
    } catch {
      return false
    }
  }

  /**
   * Check disk space
   */
  private async checkDiskSpace(
    sandbox: Sandbox,
    metadata: HealthCheckMetadata
  ): Promise<boolean> {
    try {
      const result = await sandbox.runCommand({
        cmd: 'df',
        args: ['-h', '/'],
      })

      const output = await result.stdout()
      const lines = output.split('\n')
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/)
        if (parts.length >= 5) {
          metadata.diskUsage = parts[4] // Use percentage
          const usagePercent = parseInt(parts[4], 10)
          return usagePercent < 90
        }
      }

      return true
    } catch {
      return true // Assume OK if check fails
    }
  }

  /**
   * Check available memory
   */
  private async checkMemory(
    sandbox: Sandbox,
    metadata: HealthCheckMetadata
  ): Promise<boolean> {
    try {
      const result = await sandbox.runCommand({
        cmd: 'free',
        args: ['-m'],
      })

      const output = await result.stdout()
      const lines = output.split('\n')
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/)
        if (parts.length >= 7) {
          const available = parseInt(parts[6], 10)
          metadata.memoryUsage = `${available}MB available`
          return available > 256 // At least 256MB free
        }
      }

      return true
    } catch {
      return true // Assume OK if check fails
    }
  }

  /**
   * Check number of running processes
   */
  private async checkProcesses(
    sandbox: Sandbox,
    metadata: HealthCheckMetadata
  ): Promise<boolean> {
    try {
      const result = await sandbox.runCommand({
        cmd: 'ps',
        args: ['aux'],
      })

      const output = await result.stdout()
      const processCount = output.split('\n').length - 2 // Exclude header and last empty line
      metadata.runningProcesses = processCount
      return processCount < 500 // Warn if more than 500 processes
    } catch {
      return true // Assume OK if check fails
    }
  }

  /**
   * Check if a specific port is available
   */
  private async checkPortAvailable(sandbox: Sandbox, port: number): Promise<boolean> {
    try {
      const result = await sandbox.runCommand({
        cmd: 'lsof',
        args: ['-i', `:${port}`],
      })

      const output = await result.stdout()
      return output.length === 0 // Port is free if no output
    } catch {
      // lsof might not be available, try netstat
      try {
        const result = await sandbox.runCommand({
          cmd: 'netstat',
          args: ['-tulpn'],
        })

        const output = await result.stdout()
        return !output.includes(`:${port} `)
      } catch {
        return true // Assume OK if check fails
      }
    }
  }
}

export const sandboxHealthChecker = new SandboxHealthChecker()
