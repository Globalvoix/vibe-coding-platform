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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/ui-store'
import { Button } from '@/components/ui/button'
import { GithubIcon } from '@/components/icons/github'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

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

export function LargeSettingsModal() {
  const { settingsModalOpen, setSettingsModalOpen, settingsTab, setSettingsTab } = useUIStore()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')

  const [githubStatus, setGithubStatus] = useState<GithubConnectionStatus>({ connected: false })
  const [loading, setLoading] = useState(false)
  const [orgSwitchingId, setOrgSwitchingId] = useState<number | null>(null)
  const [updatingRepo, setUpdatingRepo] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  const organizations = githubStatus.organizations ?? []

  const activeOrg = useMemo(
    () => organizations.find((o) => o.active) ?? null,
    [organizations]
  )

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
    }
  }, [searchParams])

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

  useEffect(() => {
    if (settingsModalOpen && settingsTab === 'github' && projectId) {
      checkGithubStatus()
    }
  }, [settingsModalOpen, settingsTab, projectId, checkGithubStatus])

  useEffect(() => {
    if (!settingsModalOpen || settingsTab !== 'github' || !projectId) return

    const intervalId = window.setInterval(() => {
      void checkGithubStatus()
    }, 2500)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [settingsModalOpen, settingsTab, projectId, checkGithubStatus])

  const handleConnectGithub = () => {
    if (!projectId) return
    setLoading(true)
    setErrorMessage(null)
    setRequestId(null)
    window.location.href = `/api/github-oauth/start?projectId=${projectId}`
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

      const res = await fetch('/api/github-oauth/connect-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, installationId }),
      })

      if (!res.ok) {
        throw new Error('Failed to switch organization')
      }

      await checkGithubStatus()
    } catch (error) {
      console.error('Error switching organization:', error)
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
        throw new Error('Failed to update repository')
      }

      await checkGithubStatus()
    } catch (error) {
      console.error('Error updating repository:', error)
    } finally {
      setUpdatingRepo(false)
    }
  }

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
          label: "Prasuk's Lovable",
          icon: (
            <div className="w-4 h-4 bg-[#D946EF] rounded text-[10px] text-white flex items-center justify-center font-bold">
              P
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
        { id: 'account', label: 'Prasuk Jain', icon: <User className="w-4 h-4" /> },
        { id: 'labs', label: 'Labs', icon: <Beaker className="w-4 h-4" /> },
      ],
    },
    {
      section: 'Connectors',
      items: [
        { id: 'connectors', label: 'Connectors', icon: <Layers className="w-4 h-4" /> },
        { id: 'github', label: 'GitHub', icon: <GithubIcon className="w-4 h-4" /> },
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

  const connectionPill = githubStatus.connected ? (
    <div className="flex items-center gap-2 rounded-full border border-emerald-200/50 bg-emerald-50 px-3 py-1">
      <Check className="h-3.5 w-3.5 text-emerald-700" />
      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
        Connected
      </span>
    </div>
  ) : errorMessage ? (
    <div className="flex items-center gap-2 rounded-full border border-red-200/50 bg-red-50 px-3 py-1">
      <AlertCircle className="h-3.5 w-3.5 text-red-700" />
      <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">
        Failed
      </span>
    </div>
  ) : (
    <div className="flex items-center gap-2 rounded-full border border-orange-200/50 bg-[#FFF7ED] px-3 py-1">
      <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
      <span className="text-[10px] font-black text-orange-700 uppercase tracking-widest">
        Not connected
      </span>
    </div>
  )

  return (
    <DialogPrimitive.Root open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[101] flex h-[90vh] w-[95vw] max-w-[1400px] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-[24px] bg-[#F7F4ED] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="sr-only">Settings</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Configure your project and account settings
          </DialogPrimitive.Description>

          <div className="flex w-[280px] flex-col border-r border-black/[0.04] bg-[#F7F4ED] py-8 overflow-y-auto shrink-0">
            {menuItems.map((section, idx) => (
              <div key={idx} className="mb-8 last:mb-0">
                <h4 className="px-8 text-[10px] font-bold text-[#111827]/30 uppercase tracking-[0.2em] mb-4">
                  {section.section}
                </h4>
                <div className="px-4 space-y-1">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSettingsTab(item.id)}
                      className={cn(
                        'group w-full flex items-center gap-3.5 px-4 py-2.5 text-[14px] font-semibold rounded-xl transition-all',
                        settingsTab === item.id
                          ? 'bg-white text-[#111827] shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-black/[0.03]'
                          : 'text-[#111827]/50 hover:text-[#111827] hover:bg-black/[0.03]'
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

          <div className="flex flex-1 flex-col min-w-0 bg-white m-2 rounded-[20px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex h-20 items-center justify-between border-b border-black/[0.04] px-12 shrink-0">
              <h2 className="text-[20px] font-bold text-[#111827] tracking-tight">
                {getTabLabel(settingsTab)}
              </h2>
              <DialogPrimitive.Close className="rounded-full p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-900 active:scale-90">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            <div className="flex-1 overflow-y-auto px-16 py-12 custom-scrollbar">
              {settingsTab === 'github' ? (
                <div className="max-w-[840px] space-y-14">
                  {/* Error message display */}
                  {errorMessage && (
                    <div className="rounded-[16px] border border-red-200/50 bg-red-50 p-6">
                      <div className="flex gap-4">
                        <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h4 className="text-[14px] font-bold text-red-900 tracking-tight mb-1">
                            Connection Failed
                          </h4>
                          <p className="text-[13px] leading-relaxed text-red-800 font-medium mb-3">
                            {errorMessage}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowDiagnostics(!showDiagnostics)}
                            className="flex items-center gap-1.5 text-[12px] font-bold text-red-700 hover:text-red-900 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>{showDiagnostics ? 'Hide' : 'Show'} diagnostics</span>
                          </button>
                          {showDiagnostics && requestId && (
                            <div className="mt-2 text-[11px] text-red-700 font-mono bg-white rounded border border-red-200 p-2">
                              Request ID: {requestId}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-8">
                    <p className="text-[16px] leading-[1.6] text-[#111827]/60 font-medium">
                      Sync your project 2-way with GitHub to collaborate at source. High-fidelity
                      synchronization ensures your codebase stays consistent across environments.
                    </p>
                    <a
                      href="#"
                      className="flex items-center gap-2 text-[14px] font-bold text-[#111827]/40 transition-colors hover:text-[#111827] shrink-0 pt-1"
                    >
                      <BookOpen className="h-4.5 w-4.5" />
                      <span>Docs</span>
                    </a>
                  </div>

                  <div className="h-px w-full bg-black/[0.04]" />

                  <div className="flex items-start justify-between group gap-10">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <h3 className="text-[18px] font-bold text-[#111827] tracking-tight">
                          Connect project
                        </h3>
                        {connectionPill}
                      </div>
                      <p className="text-[14px] leading-relaxed text-[#111827]/50 font-medium">
                        Install the Thinksoft GitHub App to connect organizations and create a
                        repository automatically for this project.
                      </p>
                    </div>
                    <Button
                      onClick={handleConnectGithub}
                      disabled={loading}
                      className="h-11 rounded-xl bg-[#111827] px-6 text-[14px] font-bold text-white transition-all hover:bg-black hover:shadow-lg active:scale-[0.97] flex items-center gap-3 shrink-0"
                    >
                      <GithubIcon className="h-5 w-5 text-white" />
                      {loading ? 'Connecting...' : 'Connect project'}
                    </Button>
                  </div>

                  <div className="h-px w-full bg-black/[0.04]" />

                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-10">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <h3 className="text-[18px] font-bold text-[#111827] tracking-tight">
                            Organizations
                          </h3>
                          <div className="flex items-center gap-2 rounded-full border border-black/[0.04] bg-gray-100 px-3 py-1">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                              Select
                            </span>
                          </div>
                        </div>
                        <p className="text-[14px] leading-relaxed text-[#111827]/50 font-medium">
                          Choose which organization to use for this project. Switching will create a
                          fresh repository under that organization.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={checkGithubStatus}
                        className="flex items-center gap-2 rounded-xl border border-black/[0.04] bg-[#F7F4ED] px-4 py-2.5 text-[13px] font-bold text-[#111827]/50 transition-all hover:text-[#111827] hover:bg-white hover:shadow-md active:scale-[0.98] shrink-0 mt-1"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span className="tracking-tight">Refresh</span>
                      </button>
                    </div>

                    {organizations.length === 0 ? (
                      <div className="rounded-[18px] border border-black/[0.04] bg-[#F7F4ED] p-6">
                        <p className="text-[14px] font-bold text-[#111827] tracking-tight">
                          No orgs yet — Install GitHub App
                        </p>
                        <p className="mt-2 text-[13px] leading-relaxed text-[#111827]/50 font-medium">
                          Click “Connect project” above to install the app on an organization.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {organizations.map((org) => {
                          const isActive = org.active
                          const isSwitching = orgSwitchingId === org.installationId

                          return (
                            <button
                              key={org.installationId}
                              type="button"
                              onClick={() => handleSelectOrganization(org.installationId)}
                              disabled={isSwitching}
                              className={cn(
                                'flex items-center justify-between rounded-[16px] border px-5 py-4 text-left transition-all',
                                isActive
                                  ? 'border-black/[0.06] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]'
                                  : 'border-black/[0.04] bg-[#F7F4ED] hover:bg-white hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]'
                              )}
                            >
                              <div className="flex items-center gap-4 min-w-0">
                                {org.avatarUrl ? (
                                  <img
                                    src={org.avatarUrl}
                                    alt={org.login}
                                    className="h-9 w-9 rounded-full border border-black/[0.06]"
                                  />
                                ) : (
                                  <div className="h-9 w-9 rounded-full bg-black/[0.06]" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-[14px] font-extrabold text-[#111827] tracking-tight truncate">
                                    {org.login}
                                  </p>
                                  <p className="text-[12px] font-semibold text-[#111827]/45 truncate">
                                    {org.type}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {isSwitching ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-[#111827]/50" />
                                ) : isActive ? (
                                  <div className="flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-1">
                                    <Check className="h-3.5 w-3.5 text-emerald-700" />
                                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                                      Active
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[12px] font-bold text-[#111827]/40">
                                    Use
                                  </span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="h-px w-full bg-black/[0.04]" />

                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-10">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <h3 className="text-[18px] font-bold text-[#111827] tracking-tight">
                            Connect repo
                          </h3>
                          <div className="flex items-center gap-2 rounded-full border border-black/[0.04] bg-gray-100 px-3 py-1">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                              Auto
                            </span>
                          </div>
                        </div>
                        <p className="text-[14px] leading-relaxed text-[#111827]/50 font-medium">
                          Your repository is created automatically after connecting and selecting an
                          organization.
                        </p>
                        {githubStatus.installationId && (
                          <p className="text-[12px] font-mono text-[#111827]/40">
                            Installation ID: {githubStatus.installationId}
                          </p>
                        )}
                      </div>
                      {githubStatus.repository ? (
                        <a
                          href={githubStatus.repository.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-xl border border-emerald-200/50 bg-emerald-50 px-5 py-2.5 text-[14px] font-bold text-emerald-700 transition-all hover:text-emerald-900 hover:bg-emerald-100 cursor-pointer shrink-0 mt-1"
                        >
                          <Check className="h-5 w-5" />
                          <span className="tracking-tight">
                            {githubStatus.repository.owner}/{githubStatus.repository.name}
                          </span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-3 rounded-xl border border-black/[0.04] bg-[#F7F4ED] px-5 py-2.5 text-[14px] font-bold text-[#111827]/40 shrink-0 mt-1">
                          {activeOrg ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span className="tracking-tight">Creating repo…</span>
                            </>
                          ) : (
                            <>
                              <GithubIcon className="h-5 w-5" />
                              <span className="tracking-tight">Select an org</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[18px] border border-black/[0.04] bg-[#F7F4ED] p-6 flex items-center justify-between gap-6">
                      <div className="min-w-0">
                        <p className="text-[14px] font-extrabold text-[#111827] tracking-tight">
                          Update PR
                        </p>
                        <p className="mt-2 text-[13px] leading-relaxed text-[#111827]/50 font-medium">
                          Push the latest project code to the connected repository.
                        </p>
                      </div>

                      <Button
                        onClick={handleUpdatePr}
                        disabled={!githubStatus.canUpdatePr || updatingRepo}
                        className="h-11 rounded-xl bg-[#111827] px-6 text-[14px] font-bold text-white transition-all hover:bg-black hover:shadow-lg active:scale-[0.97] flex items-center gap-3 shrink-0"
                      >
                        {updatingRepo ? (
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        ) : (
                          <RefreshCw className="h-5 w-5 text-white" />
                        )}
                        {updatingRepo ? 'Updating…' : 'Update PR'}
                      </Button>
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
