'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GithubIcon } from '@/components/icons/github'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface GithubImportRepo {
  id: number
  owner: string
  name: string
  fullName: string
  private: boolean
  url: string
  defaultBranch: string
}

interface GithubConnectionStatus {
  connected: boolean
  installationId?: number | null
}

function buildNextHref(url: URL) {
  const qs = url.searchParams.toString()
  return qs ? `${url.pathname}?${qs}` : url.pathname
}

export function GithubImportDialog() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const projectId = searchParams.get('projectId')
  const importRequested = searchParams.get('githubImport') === '1' && Boolean(projectId)

  const githubInstall = searchParams.get('githubInstall')
  const githubError = searchParams.get('githubError')

  const [status, setStatus] = useState<GithubConnectionStatus>({ connected: false })
  const [statusLoading, setStatusLoading] = useState(false)

  const [repos, setRepos] = useState<GithubImportRepo[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [reposAutoFetched, setReposAutoFetched] = useState(false)
  const [selectedFullName, setSelectedFullName] = useState('')

  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const closeDialog = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('githubImport')
    url.searchParams.delete('githubInstall')
    url.searchParams.delete('githubError')
    url.searchParams.delete('projectId')
    router.replace(buildNextHref(url))
  }, [router])

  const fetchStatus = useCallback(async () => {
    if (!projectId) return

    try {
      setStatusLoading(true)

      const timeoutMs = 30_000
      const res = (await Promise.race([
        fetch(`/api/github-oauth/status?projectId=${encodeURIComponent(projectId)}`),
        new Promise<Response>((_, reject) => {
          setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
        }),
      ])) as Response
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to check GitHub status')
      }

      const data = (await res.json()) as {
        connected?: boolean
        installationId?: number | null
      }

      setStatus({
        connected: data.connected === true,
        installationId: typeof data.installationId === 'number' ? data.installationId : null,
      })
    } catch (error) {
      setStatus({ connected: false, installationId: null })
      setImportError(error instanceof Error ? error.message : 'Failed to check GitHub status')
    } finally {
      setStatusLoading(false)
    }
  }, [projectId])

  const fetchRepos = useCallback(async () => {
    if (!projectId) return

    try {
      setReposLoading(true)
      setImportError(null)

      const timeoutMs = 30_000
      const res = (await Promise.race([
        fetch(`/api/github-oauth/repositories?projectId=${encodeURIComponent(projectId)}`),
        new Promise<Response>((_, reject) => {
          setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
        }),
      ])) as Response
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to load repositories')
      }

      const data = (await res.json()) as { repositories?: GithubImportRepo[] }
      const nextRepos = Array.isArray(data.repositories) ? data.repositories : []
      setRepos(nextRepos)

      if (!selectedFullName && nextRepos.length > 0) {
        setSelectedFullName(nextRepos[0].fullName)
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to load repositories')
    } finally {
      setReposLoading(false)
    }
  }, [projectId, selectedFullName])

  const startGithubConnect = useCallback(() => {
    if (!projectId) return

    const url = new URL(window.location.href)
    url.searchParams.set('githubImport', '1')
    url.searchParams.set('projectId', projectId)
    url.searchParams.delete('githubInstall')
    url.searchParams.delete('githubError')

    const returnTo = buildNextHref(url)

    window.location.href = `/api/github-oauth/start?projectId=${encodeURIComponent(projectId)}&mode=import&returnTo=${encodeURIComponent(returnTo)}`
  }, [projectId])

  const selectedRepo = useMemo(
    () => repos.find((r) => r.fullName === selectedFullName) ?? null,
    [repos, selectedFullName]
  )

  const handleImport = useCallback(async () => {
    if (!projectId) return
    if (!selectedRepo) {
      setImportError('Please select a repository')
      return
    }

    const installationId = status.installationId
    if (typeof installationId !== 'number' || !Number.isFinite(installationId)) {
      setImportError('GitHub is not connected yet')
      return
    }

    try {
      setImporting(true)
      setImportError(null)

      const res = await fetch('/api/github-oauth/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          installationId,
          owner: selectedRepo.owner,
          repo: selectedRepo.name,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to import repository')
      }

      await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedRepo.fullName }),
      }).catch(() => null)

      const reviveRes = await fetch(`/api/projects/${encodeURIComponent(projectId)}/sandbox/revive?force=1`, {
        method: 'POST',
      })

      if (!reviveRes.ok) {
        const data = await reviveRes.json().catch(() => null)
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to start preview')
      }

      await reviveRes.json().catch(() => null)

      router.push(`/workspace?projectId=${encodeURIComponent(projectId)}`)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import repository')
    } finally {
      setImporting(false)
    }
  }, [projectId, router, selectedRepo, status.installationId])

  useEffect(() => {
    if (!importRequested) return
    setRepos([])
    setReposAutoFetched(false)
    setSelectedFullName('')
    setImportError(null)
  }, [importRequested])

  useEffect(() => {
    if (!importRequested) return
    if (!projectId) return

    void fetchStatus()
  }, [fetchStatus, importRequested, projectId])

  useEffect(() => {
    if (!importRequested) return
    if (!status.connected) return
    if (reposLoading) return
    if (repos.length > 0) return
    if (reposAutoFetched) return

    setReposAutoFetched(true)
    void fetchRepos()
  }, [fetchRepos, importRequested, repos.length, reposAutoFetched, reposLoading, status.connected])

  const showError =
    typeof githubError === 'string' && githubError.trim()
      ? decodeURIComponent(githubError)
      : importError

  return (
    <Dialog open={importRequested} onOpenChange={(open) => (!open ? closeDialog() : null)}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GithubIcon className="h-5 w-5" />
            Import from GitHub
          </DialogTitle>
          <DialogDescription>
            Connect your GitHub account, pick a repository, and we&apos;ll create a new app from it.
          </DialogDescription>
        </DialogHeader>

        {showError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {showError}
          </div>
        ) : null}

        {!status.connected ? (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {githubInstall === 'success'
                ? 'Connected. Loading repositories…'
                : 'Connect GitHub to continue.'}
            </div>
            <Button
              onClick={startGithubConnect}
              disabled={statusLoading}
              className="flex items-center gap-2"
            >
              {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GithubIcon className="h-4 w-4" />}
              Connect GitHub
            </Button>
          </div>
        ) : reposLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading repositories…
          </div>
        ) : repos.length === 0 ? (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">No repositories found for this installation.</div>
            <Button
              onClick={() => {
                setReposAutoFetched(true)
                void fetchRepos()
              }}
              variant="outline"
            >
              Refresh
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Repository</div>
              <select
                value={selectedFullName}
                onChange={(e) => setSelectedFullName(e.target.value)}
                disabled={importing}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {repos.map((r) => (
                  <option key={r.id} value={r.fullName}>
                    {r.fullName}{r.private ? ' (private)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button onClick={closeDialog} variant="outline" disabled={importing}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!selectedFullName || importing}
                className="flex items-center gap-2"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {importing ? 'Importing…' : 'Import'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
