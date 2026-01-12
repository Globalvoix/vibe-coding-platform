export interface GithubRepository {
  id: number
  name: string
  owner: {
    login: string
    type: string
  }
  default_branch: string
  html_url: string
  private: boolean
  description: string | null
}

export interface GithubInstallation {
  id: number
  account: {
    login: string
    type: 'User' | 'Organization'
    avatar_url?: string | null
  }
  repository_selection?: 'all' | 'selected'
}

export interface GithubAccessTokenResponse {
  token: string
  expires_at: string
  permissions?: Record<string, string>
}

export interface GithubGitRef {
  object: {
    sha: string
  }
}

export interface GithubCommit {
  tree: {
    sha: string
  }
  sha: string
}

export interface GithubBlob {
  sha: string
}

export interface GithubTree {
  sha: string
}
