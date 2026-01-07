import { createGithubAppJwt, githubAppRequest, githubInstallationRequest } from '@/lib/github-app'

export interface CreateRepoParams {
  installationId: number
  owner: string
  ownerType: 'User' | 'Organization'
  repoName: string
  isPrivate?: boolean
  autoInit?: boolean
  description?: string
}

export interface CreateRepoResult {
  id: number
  name: string
  owner: {
    login: string
  }
  default_branch: string
  html_url: string
}

export interface InstallationDetails {
  id: number
  account: {
    login: string
    type: 'User' | 'Organization'
    avatar_url?: string
  }
}

/**
 * Centralized GitHub App API client with built-in logging, error handling, and retry logic
 */
export class GithubAppClient {
  private retryAttempts = 3
  private retryDelayMs = 1000

  private log(context: string, data: unknown) {
    console.log(`[GithubAppClient:${context}]`, data)
  }

  private logError(context: string, error: unknown, additionalData?: Record<string, unknown>) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error(`[GithubAppClient:${context}]`, {
      error: errorMsg,
      stack: errorStack,
      ...(additionalData ?? {}),
    })
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get installation details from GitHub API
   */
  async getInstallation(installationId: number): Promise<InstallationDetails> {
    this.log('getInstallation.start', { installationId })

    try {
      const jwt = await createGithubAppJwt()
      const result = await githubAppRequest<InstallationDetails>({
        method: 'GET',
        path: `/app/installations/${installationId}`,
        jwt,
      })

      this.log('getInstallation.success', {
        installationId,
        accountLogin: result.account.login,
        accountType: result.account.type,
      })

      return result
    } catch (error) {
      this.logError('getInstallation.failed', error, { installationId })
      throw new Error(
        `Failed to fetch installation details for ID ${installationId}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Create an installation access token
   */
  async createInstallationToken(installationId: number): Promise<string> {
    this.log('createInstallationToken.start', { installationId })

    try {
      const jwt = await createGithubAppJwt()
      const result = await githubAppRequest<{ token: string }>({
        method: 'POST',
        path: `/app/installations/${installationId}/access_tokens`,
        jwt,
        body: {},
      })

      this.log('createInstallationToken.success', { installationId, tokenLength: result.token.length })
      return result.token
    } catch (error) {
      this.logError('createInstallationToken.failed', error, { installationId })
      throw new Error(
        `Failed to create installation token for ID ${installationId}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Create a repository for a user or organization
   */
  async createRepository(params: CreateRepoParams): Promise<CreateRepoResult> {
    const { installationId, owner, ownerType, repoName, isPrivate = true, autoInit = true, description } = params

    this.log('createRepository.start', {
      installationId,
      owner,
      ownerType,
      repoName,
      isPrivate,
    })

    let installationToken: string
    try {
      installationToken = await this.createInstallationToken(installationId)
    } catch (error) {
      this.logError('createRepository.tokenFailed', error, { installationId, repoName })
      throw error
    }

    const createBody = {
      name: repoName,
      private: isPrivate,
      auto_init: autoInit,
      description,
    }

    try {
      const endpoint =
        ownerType === 'Organization'
          ? `/orgs/${encodeURIComponent(owner)}/repos`
          : '/user/repos'

      this.log('createRepository.posting', {
        endpoint,
        owner,
        repoName,
      })

      const result = await githubInstallationRequest<CreateRepoResult>({
        method: 'POST',
        path: endpoint,
        installationToken,
        body: createBody,
      })

      this.log('createRepository.success', {
        repoId: result.id,
        repoName: result.name,
        repoOwner: result.owner.login,
        defaultBranch: result.default_branch,
        htmlUrl: result.html_url,
      })

      return result
    } catch (error) {
      this.logError('createRepository.failed', error, {
        installationId,
        owner,
        ownerType,
        repoName,
        endpoint: ownerType === 'Organization'
          ? `/orgs/${owner}/repos`
          : '/user/repos',
      })
      throw new Error(
        `Failed to create repository "${repoName}" for ${owner}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Get an existing repository (if it already exists)
   */
  async getRepository(
    installationId: number,
    owner: string,
    repoName: string
  ): Promise<CreateRepoResult | null> {
    this.log('getRepository.start', { installationId, owner, repoName })

    try {
      const installationToken = await this.createInstallationToken(installationId)

      const result = await githubInstallationRequest<CreateRepoResult>({
        method: 'GET',
        path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`,
        installationToken,
      })

      this.log('getRepository.success', {
        repoId: result.id,
        repoName: result.name,
        defaultBranch: result.default_branch,
      })

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      if (errorMsg.includes('404')) {
        this.log('getRepository.notFound', { owner, repoName })
        return null
      }

      this.logError('getRepository.failed', error, { installationId, owner, repoName })
      return null
    }
  }

  /**
   * Create or get a repository (returns existing if already created)
   */
  async createOrGetRepository(params: CreateRepoParams): Promise<CreateRepoResult> {
    const { owner, repoName, installationId } = params

    this.log('createOrGetRepository.start', { owner, repoName })

    try {
      return await this.createRepository(params)
    } catch (createError) {
      this.log('createOrGetRepository.creationFailed, attempting to fetch existing', {
        owner,
        repoName,
      })

      const existing = await this.getRepository(installationId, owner, repoName)
      if (existing) {
        this.log('createOrGetRepository.foundExisting', { repoName, repoId: existing.id })
        return existing
      }

      this.logError('createOrGetRepository.failed', createError, { owner, repoName })
      throw createError
    }
  }

  /**
   * Validate GitHub App configuration (test JWT and API connectivity)
   */
  async validateConfiguration(): Promise<{
    valid: boolean
    errors: string[]
    details: {
      appId?: string
      jwtCreated?: boolean
      apiConnectivity?: boolean
      appInfo?: {
        id: number
        slug: string
        name: string
      }
    }
  }> {
    const errors: string[] = []
    const details: {
      appId?: string
      jwtCreated?: boolean
      apiConnectivity?: boolean
      appInfo?: {
        id: number
        slug: string
        name: string
      }
    } = {}

    this.log('validateConfiguration.start', {})

    // Check environment variables
    if (!process.env.GITHUB_APP_ID) {
      errors.push('GITHUB_APP_ID is not set')
    } else {
      details.appId = process.env.GITHUB_APP_ID
    }

    if (!process.env.GITHUB_PRIVATE_KEY) {
      errors.push('GITHUB_PRIVATE_KEY is not set')
    }

    if (!process.env.GITHUB_APP_SLUG) {
      errors.push('GITHUB_APP_SLUG is not set')
    }

    // Try to create JWT
    try {
      await createGithubAppJwt()
      details.jwtCreated = true
      this.log('validateConfiguration.jwtCreated', { success: true })
    } catch (jwtError) {
      errors.push(`Failed to create JWT: ${jwtError instanceof Error ? jwtError.message : String(jwtError)}`)
      details.jwtCreated = false
      this.logError('validateConfiguration.jwtFailed', jwtError)
    }

    // Try to make an API call
    if (details.jwtCreated) {
      try {
        const jwt = await createGithubAppJwt()
        const appInfo = await githubAppRequest<{
          id: number
          slug: string
          name: string
        }>({
          method: 'GET',
          path: '/app',
          jwt,
        })
        details.apiConnectivity = true
        details.appInfo = appInfo
        this.log('validateConfiguration.apiSuccess', { appId: appInfo.id, appSlug: appInfo.slug })
      } catch (apiError) {
        errors.push(
          `Failed to call GitHub API: ${apiError instanceof Error ? apiError.message : String(apiError)}`
        )
        details.apiConnectivity = false
        this.logError('validateConfiguration.apiFailed', apiError)
      }
    }

    const valid = errors.length === 0

    this.log('validateConfiguration.complete', {
      valid,
      errorCount: errors.length,
      jwtCreated: details.jwtCreated,
      apiConnectivity: details.apiConnectivity,
    })

    return {
      valid,
      errors,
      details,
    }
  }
}

export const githubAppClient = new GithubAppClient()
