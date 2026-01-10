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

      await checkGithubStatus()
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

      await checkGithubStatus()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update repository'
      console.error('Error updating repository:', error)
      setErrorMessage(msg)
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
                      <h1 className="text-[28px] font-semibold text-[#111827] tracking-tight">GitHub</h1>
                      <p className="text-[13px] text-[#111827]/40 font-medium">
                        Sync your project 2-way with GitHub to collaborate at source.
                      </p>
                    </div>
                    <a
                      href="#"
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-[#111827]/40 transition-colors hover:text-[#111827] shrink-0 pt-2"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>Docs</span>
                    </a>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center justify-between group gap-10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-[#111827] tracking-tight">
                            Connect project
                          </h3>
                          <div className="flex items-center gap-1 rounded-full border border-orange-200/50 bg-[#FFF7ED] px-2 py-0.5">
                            <div className="h-1 w-1 rounded-full bg-orange-500" />
                            <span className="text-[10px] font-bold text-orange-700 uppercase tracking-tight">
                              Not connected
                            </span>
                          </div>
                        </div>
                        <p className="text-[12px] text-[#111827]/40 font-medium leading-relaxed">
                          Connect your project to your GitHub organization in a 2-way sync.
                        </p>
                      </div>
                      <Button
                        onClick={handleConnectGithub}
                        disabled={loading}
                        className="h-8 rounded-[6px] bg-[#111827] px-4 text-[12px] font-semibold text-white transition-all hover:bg-black active:scale-[0.98] flex items-center gap-2 shrink-0"
                      >
                        <GithubIcon className="h-3.5 w-3.5 text-white" />
                        {loading ? 'Connecting...' : 'Connect project'}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between group gap-10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-[#111827] tracking-tight">
                            Connected account
                          </h3>
                          <div className="flex items-center gap-1 rounded-[4px] bg-orange-100 px-1.5 py-0.5">
                            <span className="text-[10px] font-bold text-orange-700 uppercase tracking-tight">
                              Admin
                            </span>
                          </div>
                        </div>
                        <p className="text-[12px] text-[#111827]/40 font-medium leading-relaxed">
                          Add your GitHub account to manage connected organizations.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[#111827]/40">
                         <GithubIcon className="h-4 w-4" />
                         <span className="text-[13px] font-medium">Globalvoix</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : settingsTab === 'connectors' ? (
                <div className="max-w-[1000px] space-y-12">
                   <div className="space-y-1">
                      <h1 className="text-[28px] font-semibold text-[#111827] tracking-tight">Connectors</h1>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-1">
                         <h3 className="text-[14px] font-semibold text-[#111827] tracking-tight">Shared connectors</h3>
                         <p className="text-[12px] text-[#111827]/40 font-medium leading-relaxed">
                            Add functionality to your apps. Configured once by admins, available to everyone in your workspace.
                         </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         {/* Lovable Cloud */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center">
                                  <Cloud className="w-5 h-5 text-[#111827]" />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[14px] font-semibold text-[#111827]">Lovable Cloud</span>
                                     <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-tight">Enabled</span>
                                  </div>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Built-in backend, ready to use</p>
                               </div>
                            </div>
                            <ChevronDown className="w-4 h-4 text-[#111827]/20 -rotate-90 group-hover:text-[#111827]/40" />
                         </div>

                         {/* Lovable AI */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center">
                                  <Beaker className="w-5 h-5 text-[#111827]" />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[14px] font-semibold text-[#111827]">Lovable AI</span>
                                     <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-tight">Enabled</span>
                                  </div>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Unlock powerful AI features</p>
                               </div>
                            </div>
                            <ChevronDown className="w-4 h-4 text-[#111827]/20 -rotate-90 group-hover:text-[#111827]/40" />
                         </div>

                         {/* Stripe */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-black/[0.05] hover:bg-white hover:shadow-sm transition-all cursor-pointer group shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-[#635BFF] flex items-center justify-center">
                                  <CreditCard className="w-5 h-5 text-white" />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[14px] font-semibold text-[#111827]">Stripe</span>
                                     <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-tight">Enabled</span>
                                  </div>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Set up payments</p>
                               </div>
                            </div>
                            <ChevronDown className="w-4 h-4 text-[#111827]/20 -rotate-90 group-hover:text-[#111827]/40" />
                         </div>

                         {/* Shopify */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-[#95BF47] flex items-center justify-center">
                                  <Globe className="w-5 h-5 text-white" />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[14px] font-semibold text-[#111827]">Shopify</span>
                                     <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-tight">Enabled</span>
                                  </div>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Build an eCommerce store</p>
                               </div>
                            </div>
                            <ChevronDown className="w-4 h-4 text-[#111827]/20 -rotate-90 group-hover:text-[#111827]/40" />
                         </div>

                         {/* Browse connectors */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center">
                                  <Layers className="w-5 h-5 text-[#111827]/40" />
                               </div>
                               <span className="text-[14px] font-semibold text-[#111827]">Browse connectors</span>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="flex -space-x-2">
                                  <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-[8px] text-white border-2 border-[#F9F9F7] group-hover:border-white">A</div>
                                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white border-2 border-[#F9F9F7] group-hover:border-white">L</div>
                               </div>
                               <ChevronDown className="w-4 h-4 text-[#111827]/20 -rotate-90 group-hover:text-[#111827]/40" />
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-1">
                         <h3 className="text-[14px] font-semibold text-[#111827] tracking-tight">Personal connectors</h3>
                         <p className="text-[12px] text-[#111827]/40 font-medium leading-relaxed">
                            Connect your personal tools to provide context while building. Only you can access your connections. <a href="#" className="underline">Read more</a>
                         </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         {/* Atlassian */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-[#0052CC] flex items-center justify-center">
                                  <ShieldCheck className="w-5 h-5 text-white" />
                               </div>
                               <div>
                                  <span className="text-[14px] font-semibold text-[#111827]">Atlassian</span>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Access your Jira issues and Confluence pages.</p>
                               </div>
                            </div>
                            <Button className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm">Set up</Button>
                         </div>

                         {/* Linear */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-[#5E6AD2] flex items-center justify-center">
                                  <Layers className="w-5 h-5 text-white" />
                               </div>
                               <div>
                                  <span className="text-[14px] font-semibold text-[#111827]">Linear</span>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Access your Linear issues and project data.</p>
                               </div>
                            </div>
                            <Button className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm">Set up</Button>
                         </div>

                         {/* Miro */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-[#FFD02F] flex items-center justify-center">
                                  <Layers className="w-5 h-5 text-black" />
                               </div>
                               <div>
                                  <span className="text-[14px] font-semibold text-[#111827]">Miro</span>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Access your Miro boards and diagrams.</p>
                               </div>
                            </div>
                            <Button className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm">Set up</Button>
                         </div>

                         {/* n8n */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-[#FF6D5A] flex items-center justify-center">
                                  <RefreshCw className="w-5 h-5 text-white" />
                               </div>
                               <div>
                                  <span className="text-[14px] font-semibold text-[#111827]">n8n</span>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Access and power your apps with your n8n workflows.</p>
                               </div>
                            </div>
                            <Button className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm">Set up</Button>
                         </div>
                      </div>
                   </div>
                </div>
              ) : settingsTab === 'memory' ? (
                 <div className="max-w-[840px] space-y-12">
                   <div className="space-y-1">
                      <h1 className="text-[28px] font-semibold text-[#111827] tracking-tight">Memory</h1>
                      <p className="text-[13px] text-[#111827]/40 font-medium">
                        Manage your AI's long-term memory and context.
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
