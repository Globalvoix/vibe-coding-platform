'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  X,
  Settings,
  Globe,
  BookOpen,
  Users,
  CreditCard,
  Cloud,
  ShieldCheck,
  User,
  Beaker,
  Layers,
  Check,
  Loader2,
  RefreshCw,
  AlertCircle,
  Eye,
  Sparkles,
  Zap,
  Search,
  Mic2,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/ui-store'
import { Button } from '@/components/ui/button'
import { GithubIcon } from '@/components/icons/github'
import {
  OpenAILogo,
  GoogleGeminiLogo,
  DeepseekLogo,
  PerplexityLogo,
  TogetherAILogo,
  FirecrawlLogo,
  ElevenLabsLogo
} from '@/components/icons/connector-icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSandboxStore } from '@/app/state'
import { CONNECTOR_DEFINITIONS, type ConnectorId } from '@/lib/connector-mapping'

interface GithubOrganization {
  installationId: number
  login: string
  type: 'User' | 'Organization'
  avatarUrl?: string | null
  active: boolean
}

interface GithubRepository {
  owner: string
  name: string
  url: string
  defaultBranch: string
}

interface GithubConnectionStatus {
  connected: boolean
  username?: string
  avatarUrl?: string
  installationId?: number
  organizations?: GithubOrganization[]
  repository?: GithubRepository | null
  canUpdatePr?: boolean
}

interface GithubImportRepo {
  id: number
  owner: string
  name: string
  fullName: string
  private: boolean
  url: string
  defaultBranch: string
}

export function LargeSettingsModal() {
  const { settingsModalOpen, setSettingsModalOpen, settingsTab, setSettingsTab } = useUIStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')

  const [githubStatus, setGithubStatus] = useState<GithubConnectionStatus>({ connected: false })
  const [loading, setLoading] = useState(false)
  const [creatingRepo, setCreatingRepo] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [orgSwitchingId, setOrgSwitchingId] = useState<number | null>(null)
  const [updatingRepo, setUpdatingRepo] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false)
  const [diagnosticsData, setDiagnosticsData] = useState<{
    valid: boolean
    errors: string[]
    details: Record<string, unknown>
  } | null>(null)

  const githubImportRequested = searchParams.get('githubImport') === '1'
  const [importRepos, setImportRepos] = useState<GithubImportRepo[]>([])
  const [importReposLoading, setImportReposLoading] = useState(false)
  const [importReposAutoFetched, setImportReposAutoFetched] = useState(false)
  const [selectedImportRepoFullName, setSelectedImportRepoFullName] = useState<string>('')
  const [importingRepo, setImportingRepo] = useState(false)
  const [importRepoError, setImportRepoError] = useState<string | null>(null)

  const [connectorStatus, setConnectorStatus] = useState<Partial<Record<ConnectorId, boolean>>>({})

  const [setupConnectorId, setSetupConnectorId] = useState<ConnectorId | null>(null)
  const setupConnector = setupConnectorId ? CONNECTOR_DEFINITIONS[setupConnectorId] : null

  const [setupDisplayName, setSetupDisplayName] = useState('')
  const [setupApiKey, setSetupApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const organizations = githubStatus.organizations ?? []

  const activeOrg = useMemo(
    () => organizations.find((o) => o.active) ?? null,
    [organizations]
  )

  useEffect(() => {
    setImportRepos([])
    setSelectedImportRepoFullName('')
    setImportRepoError(null)
    setImportReposAutoFetched(false)
  }, [activeOrg?.installationId])

  const projectConnected = Boolean(githubStatus.repository && githubStatus.installationId)
  const accountConnected = githubStatus.connected
  const connectedLogin = githubStatus.username ?? activeOrg?.login ?? null
  const connectedAvatarUrl = githubStatus.avatarUrl ?? activeOrg?.avatarUrl ?? null

  const checkGithubStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/github-oauth/status?projectId=${projectId}`)
      if (res.ok) {
        const data = (await res.json()) as GithubConnectionStatus
        setGithubStatus(data)
      }
    } catch (error) {
      console.error('Error checking GitHub status:', error)
    }
  }, [projectId])

  // Check URL for error parameters on mount
  useEffect(() => {
    const githubInstall = searchParams.get('githubInstall')
    const githubError = searchParams.get('githubError')
    const reqId = searchParams.get('requestId')

    if (githubInstall === 'error' && githubError) {
      setErrorMessage(decodeURIComponent(githubError))
      if (reqId) setRequestId(reqId)
    } else if (githubInstall === 'success') {
      setErrorMessage(null)
      setRequestId(null)
      setTimeout(() => {
        void checkGithubStatus()
      }, 500)
    }
  }, [searchParams, checkGithubStatus])

  const checkConnectorsStatus = useCallback(async () => {
    if (!projectId) return

    try {
      const res = await fetch(`/api/projects/${projectId}/connectors`)
      if (!res.ok) return

      const data = (await res.json()) as { connectors: Array<{ id: ConnectorId; isConfigured: boolean }> }
      const nextStatus: Partial<Record<ConnectorId, boolean>> = {}
      for (const connector of data.connectors ?? []) {
        nextStatus[connector.id] = connector.isConfigured
      }
      setConnectorStatus(nextStatus)
    } catch (error) {
      console.error('Error checking connector status:', error)
    }
  }, [projectId])

  const runDiagnostics = useCallback(async () => {
    try {
      setDiagnosticsLoading(true)
      const res = await fetch('/api/github-oauth/validate')
      if (res.ok) {
        const data = (await res.json()) as typeof diagnosticsData
        setDiagnosticsData(data)
      }
    } catch (error) {
      console.error('Error running diagnostics:', error)
      setDiagnosticsData({
        valid: false,
        errors: ['Failed to run diagnostics'],
        details: {},
      })
    } finally {
      setDiagnosticsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (settingsModalOpen && settingsTab === 'github' && projectId) {
      // Check status immediately when tab opens
      checkGithubStatus()
    }
  }, [settingsModalOpen, settingsTab, projectId, checkGithubStatus])

  useEffect(() => {
    if (settingsModalOpen && settingsTab === 'connectors' && projectId) {
      // Check status immediately when tab opens
      checkConnectorsStatus()
    }
  }, [settingsModalOpen, settingsTab, projectId, checkConnectorsStatus])

  const handleConnectGithub = () => {
    if (!projectId) return
    setLoading(true)
    setErrorMessage(null)
    setRequestId(null)
    const qs = githubImportRequested ? `&mode=import` : ''
    window.location.href = `/api/github-oauth/start?projectId=${projectId}${qs}`
  }

  const fetchImportRepos = useCallback(async () => {
    if (!projectId) return
    if (!activeOrg?.installationId) return

    try {
      setImportReposLoading(true)
      setImportRepoError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15_000)

      const res = await fetch(
        `/api/github-oauth/repositories?projectId=${projectId}&installationId=${activeOrg.installationId}`,
        { signal: controller.signal }
      ).finally(() => clearTimeout(timeoutId))

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to load repositories')
      }

      const data = (await res.json()) as { repositories: GithubImportRepo[] }
      const repos = Array.isArray(data.repositories) ? data.repositories : []

      setImportRepos(repos)

      if (!selectedImportRepoFullName && repos.length > 0) {
        setSelectedImportRepoFullName(repos[0].fullName)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load repositories'
      setImportRepoError(msg)
    } finally {
      setImportReposLoading(false)
    }
  }, [activeOrg?.installationId, projectId, selectedImportRepoFullName])

  useEffect(() => {
    if (!settingsModalOpen || settingsTab !== 'github') return
    if (!githubImportRequested) return
    if (!accountConnected || !activeOrg?.installationId) return
    if (importReposLoading) return
    if (importRepos.length > 0) return
    if (importReposAutoFetched) return

    setImportReposAutoFetched(true)
    void fetchImportRepos()
  }, [
    accountConnected,
    activeOrg?.installationId,
    fetchImportRepos,
    githubImportRequested,
    importRepos.length,
    importReposAutoFetched,
    importReposLoading,
    settingsModalOpen,
    settingsTab,
  ])

  const handleImportRepo = useCallback(async () => {
    if (!projectId || importingRepo) return
    if (!activeOrg?.installationId) return

    const selected = importRepos.find((r) => r.fullName === selectedImportRepoFullName)
    if (!selected) {
      setImportRepoError('Please select a repository')
      return
    }

    try {
      setImportingRepo(true)
      setImportRepoError(null)

      const res = await fetch('/api/github-oauth/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          installationId: activeOrg.installationId,
          owner: selected.owner,
          repo: selected.name,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to import repository')
      }

      await checkGithubStatus()

      try {
        const reviveRes = await fetch(`/api/projects/${projectId}/sandbox/revive`, {
          method: 'POST',
        })

        if (reviveRes.ok) {
          type SandboxState = {
            sandboxId?: string
            paths?: string[]
            url?: string
          } | null

          const coerceSandboxState = (value: unknown): SandboxState => {
            if (!value || typeof value !== 'object') return null
            const record = value as Record<string, unknown>

            const sandboxId = typeof record.sandboxId === 'string' ? record.sandboxId : undefined
            const url = typeof record.url === 'string' ? record.url : undefined
            const paths = Array.isArray(record.paths)
              ? record.paths.filter((p): p is string => typeof p === 'string')
              : undefined

            if (!sandboxId && !url && !paths) return null

            return { sandboxId, url, paths }
          }

          const revivedJson: unknown = await reviveRes.json()
          const revivedRecord =
            revivedJson && typeof revivedJson === 'object'
              ? (revivedJson as Record<string, unknown>)
              : null

          const sandboxState = coerceSandboxState(revivedRecord?.sandbox_state)
          if (sandboxState) {
            useSandboxStore.getState().applySandboxState(sandboxState)
          }
        }
      } catch {
        // best-effort
      }

      setSettingsModalOpen(false)

      const url = new URL(window.location.href)
      url.searchParams.delete('githubImport')
      const next = url.searchParams.toString()
      router.replace(next ? `${url.pathname}?${next}` : url.pathname)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to import repository'
      setImportRepoError(msg)
    } finally {
      setImportingRepo(false)
    }
  }, [
    activeOrg?.installationId,
    checkGithubStatus,
    importingRepo,
    importRepos,
    projectId,
    router,
    selectedImportRepoFullName,
    setSettingsModalOpen,
  ])

  const handleCreateRepo = async () => {
    if (!projectId || creatingRepo) return

    try {
      setCreatingRepo(true)
      setErrorMessage(null)

      const res = await fetch('/api/github-oauth/create-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to create repository')
      }

      setTimeout(() => {
        void checkGithubStatus()
      }, 500)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create repository'
      console.error('Error creating repository:', error)
      setErrorMessage(msg)
    } finally {
      setCreatingRepo(false)
    }
  }

  const handleDisconnectGithub = async () => {
    if (!projectId || disconnecting) return

    try {
      setDisconnecting(true)
      setErrorMessage(null)

      const res = await fetch('/api/github-oauth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to disconnect')
      }

      setGithubStatus({ connected: false })
      setTimeout(() => {
        void checkGithubStatus()
      }, 250)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to disconnect'
      console.error('Error disconnecting GitHub:', error)
      setErrorMessage(msg)
    } finally {
      setDisconnecting(false)
    }
  }

  const handleRetryConnection = () => {
    setErrorMessage(null)
    setRequestId(null)
    checkGithubStatus()
  }

  const handleSelectOrganization = async (installationId: number) => {
    if (!projectId || orgSwitchingId) return

    try {
      setOrgSwitchingId(installationId)
      setErrorMessage(null)

      const res = await fetch('/api/github-oauth/connect-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, installationId }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to switch organization')
      }

      // Immediately refresh status after successful org switch
      setTimeout(() => {
        void checkGithubStatus()
      }, 500)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to switch organization'
      console.error('Error switching organization:', error)
      setErrorMessage(msg)
    } finally {
      setOrgSwitchingId(null)
    }
  }

  const handleUpdatePr = async () => {
    if (!projectId || updatingRepo || !githubStatus.canUpdatePr) return

    try {
      setUpdatingRepo(true)

      const res = await fetch('/api/github-oauth/update-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to update repository')
      }

      // Immediately refresh status after successful repo update
      setTimeout(() => {
        void checkGithubStatus()
      }, 500)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update repository'
      console.error('Error updating repository:', error)
      setErrorMessage(msg)
    } finally {
      setUpdatingRepo(false)
    }
  }

  const handleStartSetup = (connectorId: ConnectorId) => {
    const connector = CONNECTOR_DEFINITIONS[connectorId]
    setSetupConnectorId(connectorId)
    setSetupDisplayName(connector.displayName)
    setSetupApiKey('')
    setShowApiKey(false)
  }

  const handleCreateConnection = async () => {
    if (!projectId || !setupConnectorId || !setupConnector || !setupApiKey) return

    try {
      setIsCreating(true)

      const res = await fetch(`/api/projects/${projectId}/env-vars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: setupConnector.envVarKey,
          value: setupApiKey,
          is_sensitive: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to create connection' }))
        throw new Error(data.error || 'Failed to create connection')
      }

      setSetupConnectorId(null)
      await checkConnectorsStatus()
    } catch (error) {
      console.error('Error creating connection:', error)
      alert(error instanceof Error ? error.message : 'Failed to create connection')
    } finally {
      setIsCreating(false)
    }
  }

  const isConnectorConfigured = useCallback(
    (connectorId: ConnectorId) => connectorStatus[connectorId] === true,
    [connectorStatus]
  )

  const menuItems = [
    {
      section: 'Project',
      items: [
        { id: 'settings', label: 'Project settings', icon: <Settings className="w-4 h-4" /> },
        { id: 'domains', label: 'Domains', icon: <Globe className="w-4 h-4" /> },
        { id: 'knowledge', label: 'Knowledge', icon: <BookOpen className="w-4 h-4" /> },
      ],
    },
    {
      section: 'Workspace',
      items: [
        {
          id: 'workspace-name',
          label: "Think's Lovable",
          icon: (
            <div className="w-4 h-4 bg-[#3B82F6] rounded-[4px] text-[10px] text-white flex items-center justify-center font-bold">
              T
            </div>
          ),
        },
        { id: 'people', label: 'People', icon: <Users className="w-4 h-4" /> },
        { id: 'plans', label: 'Plans & credits', icon: <CreditCard className="w-4 h-4" /> },
        { id: 'cloud', label: 'Cloud & AI balance', icon: <Cloud className="w-4 h-4" /> },
        { id: 'privacy', label: 'Privacy & security', icon: <ShieldCheck className="w-4 h-4" /> },
      ],
    },
    {
      section: 'Account',
      items: [
        {
          id: 'account',
          label: 'Think',
          icon: (
            <div className="w-4 h-4 bg-[#111827]/5 rounded-full text-[10px] text-[#111827] flex items-center justify-center font-bold border border-black/[0.05]">
              T
            </div>
          )
        },
        { id: 'labs', label: 'Labs', icon: <Beaker className="w-4 h-4" /> },
      ],
    },
    {
      section: 'Connectors',
      items: [
        { id: 'connectors', label: 'Connectors', icon: <Layers className="w-4 h-4" /> },
        { id: 'github', label: 'GitHub', icon: <GithubIcon className="w-4 h-4" /> },
        { id: 'memory', label: 'Memory', icon: <BookOpen className="w-4 h-4" /> },
      ],
    },
  ]

  const getTabLabel = (id: string) => {
    for (const section of menuItems) {
      const item = section.items.find((i) => i.id === id)
      if (item) return item.label
    }
    return 'Settings'
  }


  return (
    <DialogPrimitive.Root open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[101] flex h-[90vh] w-[95vw] max-w-[1400px] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-[24px] bg-[#F9F9F9] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="sr-only">Settings</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Configure your project and account settings
          </DialogPrimitive.Description>

          <div className="flex w-[240px] flex-col border-r border-black/[0.04] bg-[#F9F9F9] py-6 overflow-y-auto shrink-0">
            {menuItems.map((section, idx) => (
              <div key={idx} className="mb-6 last:mb-0">
                <h4 className="px-6 text-[10px] font-bold text-[#111827]/40 uppercase tracking-widest mb-3">
                  {section.section}
                </h4>
                <div className="px-2 space-y-0.5">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSettingsTab(item.id)}
                      className={cn(
                        'group w-full flex items-center gap-2.5 px-4 py-2 text-[12px] font-semibold rounded-[8px] transition-all',
                        settingsTab === item.id
                          ? 'bg-[#F2F2F2] text-[#111827]'
                          : 'text-[#111827]/60 hover:text-[#111827] hover:bg-[#F2F2F2]/50'
                      )}
                    >
                      <span
                        className={cn(
                          'transition-colors',
                          settingsTab === item.id
                            ? 'text-[#111827]'
                            : 'text-[#111827]/30 group-hover:text-[#111827]/60'
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate tracking-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-1 flex-col min-w-0 bg-white overflow-hidden">
            <div className="flex h-14 items-center justify-between border-b border-black/[0.04] px-12 shrink-0">
              <h2 className="text-[14px] font-semibold text-[#111827] tracking-tight">
                {getTabLabel(settingsTab)}
              </h2>
              <DialogPrimitive.Close className="rounded-full p-1.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-900">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            <div className="flex-1 overflow-y-auto px-16 py-12 custom-scrollbar">
              {setupConnector ? (
                <div className="max-w-[800px] flex flex-col h-full">
                  <div className="flex items-center justify-between mb-12">
                     <button
                        onClick={() => setSetupConnectorId(null)}
                        className="flex items-center gap-2 text-[14px] font-medium text-[#111827]/40 hover:text-[#111827] transition-colors"
                     >
                        <ChevronLeft className="w-4 h-4" />
                        <span>{setupConnector.displayName}</span>
                     </button>
                     <a href="#" className="flex items-center gap-1.5 text-[12px] font-medium text-[#111827]/40 hover:text-[#111827] transition-colors">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Docs</span>
                     </a>
                  </div>

                  <div className="flex items-center gap-6 mb-12">
                     <div className="w-14 h-14 rounded-[12px] bg-black/[0.03] flex items-center justify-center overflow-hidden p-2">
                        {setupConnectorId === 'openai' && <OpenAILogo size={32} />}
                        {setupConnectorId === 'google-gemini' && <GoogleGeminiLogo size={32} />}
                        {setupConnectorId === 'deepseek' && <DeepseekLogo size={32} />}
                        {setupConnectorId === 'together-ai' && <TogetherAILogo size={32} />}
                        {setupConnectorId === 'perplexity' && <PerplexityLogo size={32} />}
                        {setupConnectorId === 'firecrawl' && <FirecrawlLogo size={32} />}
                        {setupConnectorId === 'eleven-labs' && <ElevenLabsLogo size={32} />}
                        {!setupConnectorId && <Layers className="w-8 h-8 text-[#111827]" />}
                     </div>
                     <h1 className="text-[24px] font-semibold text-[#111827] tracking-tight">Create a {setupConnector.displayName} connection</h1>
                  </div>

                  <div className="space-y-10">
                     <div className="space-y-3">
                        <label className="text-[14px] font-semibold text-[#111827]">Display name</label>
                        <input
                           type="text"
                           value={setupDisplayName}
                           onChange={(e) => setSetupDisplayName(e.target.value)}
                           className="w-full h-11 px-4 rounded-[12px] border border-black/[0.05] bg-black/[0.01] focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-[14px]"
                           placeholder={setupConnector.displayName}
                        />
                     </div>

                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <label className="text-[14px] font-semibold text-[#111827]">API Key</label>
                           <a href="#" className="flex items-center gap-1 text-[12px] font-semibold text-[#111827]/40 hover:text-[#111827] transition-colors">
                              Get key <ExternalLink className="w-3 h-3" />
                           </a>
                        </div>
                        <p className="text-[12px] text-[#111827]/40 font-medium">Your {setupConnector.displayName} API key</p>
                        <div className="relative">
                           <input
                              type={showApiKey ? 'text' : 'password'}
                              value={setupApiKey}
                              onChange={(e) => setSetupApiKey(e.target.value)}
                              className="w-full h-11 pl-4 pr-12 rounded-[12px] border border-black/[0.05] bg-black/[0.01] focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-[14px] font-mono"
                              placeholder={`sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
                           />
                           <button
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#111827]/20 hover:text-[#111827]/40 transition-colors"
                           >
                              <Eye className="w-4 h-4" />
                           </button>
                        </div>
                     </div>
                  </div>

                  <div className="mt-auto pt-12 flex justify-end">
                     <Button
                        onClick={handleCreateConnection}
                        disabled={!setupApiKey || isCreating}
                        className="h-10 px-8 rounded-[8px] bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                     >
                        {isCreating ? 'Saving...' : 'Save'}
                     </Button>
                  </div>
                </div>
              ) : settingsTab === 'github' ? (
                <div className="max-w-[840px] space-y-12">
                  {/* Error message display */}
                  {errorMessage && (
                    <div className="rounded-[12px] border border-red-200/50 bg-red-50 p-5">
                      <div className="flex gap-4">
                        <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h4 className="text-[12px] font-bold text-red-900 tracking-tight mb-1">
                            Connection Failed
                          </h4>
                          <p className="text-[11px] leading-relaxed text-red-800 font-medium mb-3">
                            {errorMessage}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowDiagnostics(!showDiagnostics)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-red-700 hover:text-red-900 transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                            <span>{showDiagnostics ? 'Hide' : 'Show'} diagnostics</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-8">
                    <div className="space-y-1">
                      <h1 className="text-[28px] font-bold text-[#111827] tracking-tight">GitHub</h1>
                      <p className="text-[13px] text-[#111827]/60 font-medium">
                        Sync your project 2-way with GitHub to collaborate at source.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-2">
                      <button
                        onClick={() => setShowDiagnostics(!showDiagnostics)}
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-[#111827]/40 transition-colors hover:text-[#111827]"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{showDiagnostics ? 'Hide' : 'Run'} diagnostics</span>
                      </button>
                      <a
                        href="#"
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-[#111827]/40 transition-colors hover:text-[#111827]"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        <span>Docs</span>
                      </a>
                    </div>
                  </div>

                  {showDiagnostics && (
                    <div className="rounded-[12px] border border-black/[0.05] bg-[#F9F9F9] p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[13px] font-semibold text-[#111827]">GitHub App Configuration</h3>
                        <button
                          onClick={runDiagnostics}
                          disabled={diagnosticsLoading}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#111827]/60 hover:text-[#111827] disabled:opacity-50 transition-colors"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>{diagnosticsLoading ? 'Checking...' : 'Check now'}</span>
                        </button>
                      </div>
                      {diagnosticsData && (
                        <div className="space-y-3">
                          {diagnosticsData.valid ? (
                            <div className="rounded-[8px] bg-emerald-50 border border-emerald-200/50 p-3">
                              <p className="text-[12px] font-semibold text-emerald-700">✓ Configuration valid</p>
                              <p className="text-[11px] text-emerald-700/70 mt-1">GitHub App is properly configured.</p>
                            </div>
                          ) : (
                            <>
                              <div className="rounded-[8px] bg-red-50 border border-red-200/50 p-3">
                                <p className="text-[12px] font-semibold text-red-700">✗ Configuration issues found</p>
                              </div>
                              {diagnosticsData.errors.length > 0 && (
                                <ul className="space-y-2">
                                  {diagnosticsData.errors.map((error, idx) => (
                                    <li key={idx} className="text-[11px] text-red-700 flex gap-2">
                                      <span className="shrink-0">•</span>
                                      <span>{error}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-8">
                    <div className="flex items-center justify-between group gap-10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-[#111827] tracking-tight">
                            Connect project
                          </h3>
                          {projectConnected ? (
                            <div className="flex items-center gap-1 rounded-full border border-emerald-200/50 bg-emerald-50 px-2 py-0.5">
                              <Check className="h-3 w-3 text-emerald-700" />
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">
                                Connected
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 rounded-full border border-orange-200/50 bg-[#FFF7ED] px-2 py-0.5">
                              <div className="h-1 w-1 rounded-full bg-orange-500" />
                              <span className="text-[10px] font-bold text-orange-700 uppercase tracking-tight">
                                Not connected
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-[12px] text-[#111827]/40 font-medium leading-relaxed">
                          {projectConnected
                            ? 'Your project is linked to a GitHub repository.'
                            : 'Connect your project to GitHub and create a private repository.'}
                        </p>
                        {githubStatus.repository && (
                          <a
                            href={githubStatus.repository.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#111827]/60 hover:text-[#111827] transition-colors"
                          >
                            <span className="truncate max-w-[420px]">
                              {githubStatus.repository.owner}/{githubStatus.repository.name}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!accountConnected ? (
                          <Button
                            onClick={handleConnectGithub}
                            disabled={loading}
                            className="h-8 rounded-[6px] bg-[#111827] px-4 text-[12px] font-semibold text-white transition-all hover:bg-black active:scale-[0.98] flex items-center gap-2"
                          >
                            <GithubIcon className="h-3.5 w-3.5 text-white" />
                            {loading ? 'Connecting...' : 'Connect project'}
                          </Button>
                        ) : !githubStatus.repository ? (
                          <Button
                            onClick={handleCreateRepo}
                            disabled={creatingRepo}
                            className="h-8 rounded-[6px] bg-[#111827] px-4 text-[12px] font-semibold text-white transition-all hover:bg-black active:scale-[0.98] flex items-center gap-2"
                          >
                            <GithubIcon className="h-3.5 w-3.5 text-white" />
                            {creatingRepo ? 'Creating...' : 'Create repo'}
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={handleUpdatePr}
                              disabled={updatingRepo || !githubStatus.canUpdatePr}
                              className="h-8 rounded-[6px] bg-[#111827] px-4 text-[12px] font-semibold text-white transition-all hover:bg-black active:scale-[0.98] flex items-center gap-2"
                            >
                              <RefreshCw className="h-3.5 w-3.5 text-white" />
                              {updatingRepo ? 'Syncing...' : 'Sync now'}
                            </Button>
                            <Button
                              onClick={handleDisconnectGithub}
                              disabled={disconnecting}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-red-600 hover:bg-red-50 shadow-sm"
                            >
                              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between group gap-10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-[#111827] tracking-tight">Import repository</h3>
                          {githubImportRequested && (
                            <div className="flex items-center gap-1 rounded-[4px] bg-black/[0.04] px-1.5 py-0.5">
                              <span className="text-[10px] font-bold text-[#111827]/60 uppercase tracking-tight">
                                Import
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-[12px] text-[#111827]/40 font-medium leading-relaxed">
                          Import an existing GitHub repository into this project.
                        </p>
                        {importRepoError && (
                          <p className="text-[11px] text-red-700 font-medium leading-relaxed">{importRepoError}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!accountConnected ? (
                          <Button
                            onClick={handleConnectGithub}
                            disabled={loading}
                            className="h-8 rounded-[6px] bg-[#111827] px-4 text-[12px] font-semibold text-white transition-all hover:bg-black active:scale-[0.98] flex items-center gap-2"
                          >
                            <GithubIcon className="h-3.5 w-3.5 text-white" />
                            {loading ? 'Connecting...' : 'Connect GitHub'}
                          </Button>
                        ) : !activeOrg?.installationId ? (
                          <div className="text-[12px] font-semibold text-[#111827]/60">—</div>
                        ) : importRepos.length === 0 ? (
                          <Button
                            onClick={fetchImportRepos}
                            disabled={importReposLoading}
                            className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                          >
                            {importReposLoading ? 'Loading...' : 'Load repos'}
                          </Button>
                        ) : (
                          <>
                            <div className="relative">
                              <select
                                value={selectedImportRepoFullName}
                                onChange={(e) => setSelectedImportRepoFullName(e.target.value)}
                                disabled={importingRepo}
                                className="h-8 rounded-[6px] border border-black/[0.05] bg-white pl-3 pr-9 text-[12px] font-semibold text-[#111827] shadow-sm focus:outline-none"
                              >
                                {importRepos.map((r) => (
                                  <option key={r.id} value={r.fullName}>
                                    {r.fullName}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#111827]/40" />
                            </div>
                            <Button
                              onClick={handleImportRepo}
                              disabled={!selectedImportRepoFullName || importingRepo}
                              className="h-8 rounded-[6px] bg-[#111827] px-4 text-[12px] font-semibold text-white transition-all hover:bg-black active:scale-[0.98] flex items-center gap-2"
                            >
                              {importingRepo ? 'Importing...' : 'Import'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between group gap-10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-[#111827] tracking-tight">
                            Connected account
                          </h3>
                          {accountConnected ? (
                            <div className="flex items-center gap-1 rounded-[4px] bg-[#FFEDD5] px-1.5 py-0.5">
                              <span className="text-[10px] font-bold text-[#EA580C] uppercase tracking-tight">
                                Admin
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 rounded-[4px] bg-black/[0.04] px-1.5 py-0.5">
                              <span className="text-[10px] font-bold text-[#111827]/60 uppercase tracking-tight">
                                Not connected
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-[12px] text-[#111827]/40 font-medium leading-relaxed">
                          {accountConnected
                            ? 'Choose which GitHub account or organization to connect this project to.'
                            : 'Connect GitHub to manage connected organizations.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[#111827]/60">
                        {connectedAvatarUrl ? (
                          <img
                            src={connectedAvatarUrl}
                            alt={connectedLogin ?? 'GitHub'}
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          <GithubIcon className="h-4 w-4" />
                        )}
                        <span className="text-[13px] font-semibold">
                          {connectedLogin ?? '—'}
                        </span>
                      </div>
                    </div>

                    {accountConnected && organizations.length > 0 && (
                      <div className="rounded-[12px] border border-black/[0.05] bg-[#F9F9F9] p-5 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h3 className="text-[13px] font-semibold text-[#111827]">Installations</h3>
                            <p className="text-[11px] text-[#111827]/50 font-medium mt-1">
                              Select which account owns the repository for this project.
                            </p>
                          </div>
                          {activeOrg && (
                            <div className="flex items-center gap-2 text-[#111827]/60">
                              <span className="text-[11px] font-semibold">Active:</span>
                              <span className="text-[11px] font-semibold text-[#111827]">{activeOrg.login}</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {organizations.map((org) => (
                            <button
                              key={org.installationId}
                              type="button"
                              onClick={() => handleSelectOrganization(org.installationId)}
                              disabled={orgSwitchingId === org.installationId}
                              className={cn(
                                'flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2 text-left transition-all',
                                org.active
                                  ? 'border-emerald-200/50 bg-emerald-50'
                                  : 'border-black/[0.05] bg-white hover:bg-black/[0.01]',
                                orgSwitchingId === org.installationId ? 'opacity-60' : ''
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {org.avatarUrl ? (
                                  <img
                                    src={org.avatarUrl}
                                    alt={org.login}
                                    className="h-6 w-6 rounded-full"
                                  />
                                ) : (
                                  <GithubIcon className="h-4 w-4 text-[#111827]/60" />
                                )}
                                <div className="min-w-0">
                                  <div className="text-[12px] font-semibold text-[#111827] truncate">
                                    {org.login}
                                  </div>
                                  <div className="text-[10px] font-semibold text-[#111827]/40">
                                    {org.type}
                                  </div>
                                </div>
                              </div>
                              {org.active ? (
                                <div className="flex items-center gap-1 rounded-full border border-emerald-200/50 bg-white px-2 py-0.5">
                                  <Check className="h-3 w-3 text-emerald-700" />
                                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">
                                    Active
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 rounded-full border border-black/[0.05] bg-white px-2 py-0.5">
                                  <span className="text-[10px] font-bold text-[#111827]/60 uppercase tracking-tight">
                                    Select
                                  </span>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : settingsTab === 'connectors' ? (
                <div className="max-w-[1000px] space-y-12">
                   <div className="space-y-1">
                      <h1 className="text-[28px] font-semibold text-[#111827] tracking-tight">Connectors</h1>
                      <p className="text-[13px] text-[#111827]/40 font-medium">
                        Connect your favorite AI models and tools to power your workspace.
                      </p>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-1">
                         <h3 className="text-[14px] font-semibold text-[#111827] tracking-tight">AI & Foundational Models</h3>
                         <p className="text-[12px] text-[#111827]/40 font-medium leading-relaxed">
                            Configure API keys for the world&apos;s most powerful language models.
                         </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         {/* OpenAI */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center overflow-hidden">
                                  <OpenAILogo size={24} />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[14px] font-semibold text-[#111827]">OpenAI</span>
                                     {isConnectorConfigured('openai') && (
                                       <div className="flex items-center gap-1 rounded-full border border-emerald-200/50 bg-emerald-50 px-2 py-0.5">
                                         <Check className="h-3 w-3 text-emerald-700" />
                                         <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">
                                           Connected
                                         </span>
                                       </div>
                                     )}
                                  </div>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">GPT-4o, o1-preview, and more.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('openai')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >{isConnectorConfigured('openai') ? 'Manage' : 'Set up'}</Button>
                         </div>

                         {/* Google Gemini */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center overflow-hidden">
                                  <GoogleGeminiLogo size={24} />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[14px] font-semibold text-[#111827]">Google Gemini</span>
                                     {isConnectorConfigured('google-gemini') && (
                                       <div className="flex items-center gap-1 rounded-full border border-emerald-200/50 bg-emerald-50 px-2 py-0.5">
                                         <Check className="h-3 w-3 text-emerald-700" />
                                         <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">
                                           Connected
                                         </span>
                                       </div>
                                     )}
                                  </div>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Gemini 1.5 Pro, Ultra, and Flash.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('google-gemini')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >{isConnectorConfigured('google-gemini') ? 'Manage' : 'Set up'}</Button>
                         </div>

                         {/* Deepseek */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center overflow-hidden">
                                  <DeepseekLogo size={24} />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[14px] font-semibold text-[#111827]">Deepseek</span>
                                     {isConnectorConfigured('deepseek') && (
                                       <div className="flex items-center gap-1 rounded-full border border-emerald-200/50 bg-emerald-50 px-2 py-0.5">
                                         <Check className="h-3 w-3 text-emerald-700" />
                                         <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">
                                           Connected
                                         </span>
                                       </div>
                                     )}
                                  </div>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">High-performance open-source models.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('deepseek')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >{isConnectorConfigured('deepseek') ? 'Manage' : 'Set up'}</Button>
                         </div>

                         {/* Together AI */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center overflow-hidden">
                                  <TogetherAILogo size={24} />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[14px] font-semibold text-[#111827]">Together AI</span>
                                     {isConnectorConfigured('together-ai') && (
                                       <div className="flex items-center gap-1 rounded-full border border-emerald-200/50 bg-emerald-50 px-2 py-0.5">
                                         <Check className="h-3 w-3 text-emerald-700" />
                                         <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">
                                           Connected
                                         </span>
                                       </div>
                                     )}
                                  </div>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Fast inference for Llama 3 and more.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('together-ai')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >{isConnectorConfigured('together-ai') ? 'Manage' : 'Set up'}</Button>
                         </div>

                         {/* Perplexity */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center overflow-hidden">
                                  <PerplexityLogo size={24} />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[14px] font-semibold text-[#111827]">Perplexity</span>
                                     {isConnectorConfigured('perplexity') && (
                                       <div className="flex items-center gap-1 rounded-full border border-emerald-200/50 bg-emerald-50 px-2 py-0.5">
                                         <Check className="h-3 w-3 text-emerald-700" />
                                         <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">
                                           Connected
                                         </span>
                                       </div>
                                     )}
                                  </div>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">AI-powered search and information discovery.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('perplexity')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >{isConnectorConfigured('perplexity') ? 'Manage' : 'Set up'}</Button>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-1">
                         <h3 className="text-[14px] font-semibold text-[#111827] tracking-tight">Tools & Specialized APIs</h3>
                         <p className="text-[12px] text-[#111827]/40 font-medium leading-relaxed">
                            Connect specialized services for data, voice, and research.
                         </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         {/* Firecrawl */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center overflow-hidden">
                                  <FirecrawlLogo size={24} />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[14px] font-semibold text-[#111827]">Firecrawl</span>
                                     {isConnectorConfigured('firecrawl') && (
                                       <div className="flex items-center gap-1 rounded-full border border-emerald-200/50 bg-emerald-50 px-2 py-0.5">
                                         <Check className="h-3 w-3 text-emerald-700" />
                                         <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">
                                           Connected
                                         </span>
                                       </div>
                                     )}
                                  </div>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Turn any website into LLM-ready data.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('firecrawl')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >{isConnectorConfigured('firecrawl') ? 'Manage' : 'Set up'}</Button>
                         </div>

                         {/* Eleven Labs */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center overflow-hidden">
                                  <ElevenLabsLogo size={24} />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[14px] font-semibold text-[#111827]">Eleven Labs</span>
                                     {isConnectorConfigured('eleven-labs') && (
                                       <div className="flex items-center gap-1 rounded-full border border-emerald-200/50 bg-emerald-50 px-2 py-0.5">
                                         <Check className="h-3 w-3 text-emerald-700" />
                                         <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">
                                           Connected
                                         </span>
                                       </div>
                                     )}
                                  </div>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Leading AI text-to-speech technology.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('eleven-labs')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >{isConnectorConfigured('eleven-labs') ? 'Manage' : 'Set up'}</Button>
                         </div>
                      </div>
                   </div>
                </div>
              ) : settingsTab === 'memory' ? (
                 <div className="max-w-[840px] space-y-12">
                   <div className="space-y-1">
                      <h1 className="text-[28px] font-semibold text-[#111827] tracking-tight">Memory</h1>
                      <p className="text-[13px] text-[#111827]/40 font-medium">
                        Manage your AI&apos;s long-term memory and context.
                      </p>
                   </div>
                   <div className="flex h-[400px] flex-col items-center justify-center space-y-6 text-[#111827]/20 border border-dashed border-black/[0.05] rounded-[24px]">
                      <BookOpen className="h-12 w-12 opacity-10" />
                      <div className="text-center space-y-1">
                        <p className="text-[16px] font-semibold tracking-tight text-[#111827]/40">
                          Coming Soon
                        </p>
                        <p className="text-[12px] font-medium opacity-50">
                          Memory features are being developed to give your AI better context.
                        </p>
                      </div>
                   </div>
                 </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center space-y-6 text-[#111827]/20">
                  <div className="rounded-[32px] bg-[#F7F4ED] p-12 shadow-sm border border-black/[0.02]">
                    <Settings className="h-16 w-16 opacity-10" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[18px] font-bold tracking-tight text-[#111827]/40">
                      Work in Progress
                    </p>
                    <p className="text-[14px] font-medium opacity-50">
                      This section is being refined for your experience.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
