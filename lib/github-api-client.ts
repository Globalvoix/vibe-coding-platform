// Re-export functions from github-app.ts for backward compatibility
// This file can be deprecated in favor of lib/github-app.ts

export { createGithubAppJwt, getInstallation, createInstallationToken, githubRequest } from '@/lib/github-app'
