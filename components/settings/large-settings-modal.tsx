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

  const [setupConnector, setSetupConnector] = useState<string | null>(null)
  const [setupDisplayName, setSetupDisplayName] = useState('')
  const [setupApiKey, setSetupApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

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

  const handleStartSetup = (connector: string) => {
    setSetupConnector(connector)
    setSetupDisplayName(connector)
    setSetupApiKey('')
    setShowApiKey(false)
  }

  const handleCreateConnection = async () => {
    if (!projectId || !setupConnector || !setupApiKey) return

    try {
      setIsCreating(true)
      const envKey = `${setupConnector.toUpperCase().replace(/\s+/g, '_')}_API_KEY`

      const res = await fetch(`/api/projects/${projectId}/env-vars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: envKey,
          value: setupApiKey,
          is_sensitive: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create connection')
      }

      setSetupConnector(null)
    } catch (error) {
      console.error('Error creating connection:', error)
      alert(error instanceof Error ? error.message : 'Failed to create connection')
    } finally {
      setIsCreating(false)
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

          <div className="flex w-[240px] flex-col border-r border-black/[0.04] bg-[#F7F4ED] py-6 overflow-y-auto shrink-0">
            {menuItems.map((section, idx) => (
              <div key={idx} className="mb-6 last:mb-0">
                <h4 className="px-6 text-[10px] font-semibold text-[#111827]/40 uppercase tracking-widest mb-3">
                  {section.section}
                </h4>
                <div className="px-2 space-y-0.5">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSettingsTab(item.id)}
                      className={cn(
                        'group w-full flex items-center gap-2.5 px-4 py-1.5 text-[12px] font-medium rounded-[6px] transition-all',
                        settingsTab === item.id
                          ? 'bg-white text-[#111827] shadow-sm border border-black/[0.03]'
                          : 'text-[#111827]/60 hover:text-[#111827] hover:bg-black/[0.02]'
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

          <div className="flex flex-1 flex-col min-w-0 bg-white m-1.5 rounded-[12px] shadow-[0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden">
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
                        onClick={() => setSetupConnector(null)}
                        className="flex items-center gap-2 text-[14px] font-medium text-[#111827]/40 hover:text-[#111827] transition-colors"
                     >
                        <ChevronLeft className="w-4 h-4" />
                        <span>{setupConnector}</span>
                     </button>
                     <a href="#" className="flex items-center gap-1.5 text-[12px] font-medium text-[#111827]/40 hover:text-[#111827] transition-colors">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Docs</span>
                     </a>
                  </div>

                  <div className="flex items-center gap-6 mb-12">
                     <div className="w-14 h-14 rounded-[12px] bg-black/[0.03] flex items-center justify-center">
                        <Layers className="w-8 h-8 text-[#111827]" />
                     </div>
                     <h1 className="text-[24px] font-semibold text-[#111827] tracking-tight">Create a {setupConnector} connection</h1>
                  </div>

                  <div className="space-y-10">
                     <div className="space-y-3">
                        <label className="text-[14px] font-semibold text-[#111827]">Display name</label>
                        <input
                           type="text"
                           value={setupDisplayName}
                           onChange={(e) => setSetupDisplayName(e.target.value)}
                           className="w-full h-11 px-4 rounded-[12px] border border-black/[0.05] bg-black/[0.01] focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-[14px]"
                           placeholder={setupConnector}
                        />
                     </div>

                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <label className="text-[14px] font-semibold text-[#111827]">API Key</label>
                           <a href="#" className="flex items-center gap-1 text-[12px] font-semibold text-[#111827]/40 hover:text-[#111827] transition-colors">
                              Get key <ExternalLink className="w-3 h-3" />
                           </a>
                        </div>
                        <p className="text-[12px] text-[#111827]/40 font-medium">Your {setupConnector} API key</p>
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
                        {isCreating ? 'Creating...' : 'Create'}
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
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center">
                                  <Sparkles className="w-5 h-5 text-[#111827]" />
                               </div>
                               <div>
                                  <span className="text-[14px] font-semibold text-[#111827]">OpenAI</span>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">GPT-4o, o1-preview, and more.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('OpenAI')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >Set up</Button>
                         </div>

                         {/* Google Gemini */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center">
                                  <Zap className="w-5 h-5 text-blue-500" />
                               </div>
                               <div>
                                  <span className="text-[14px] font-semibold text-[#111827]">Google Gemini</span>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Gemini 1.5 Pro, Ultra, and Flash.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('Google Gemini')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >Set up</Button>
                         </div>

                         {/* Deepseek */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center">
                                  <Sparkles className="w-5 h-5 text-purple-500" />
                               </div>
                               <div>
                                  <span className="text-[14px] font-semibold text-[#111827]">Deepseek</span>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">High-performance open-source models.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('Deepseek')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >Set up</Button>
                         </div>

                         {/* Open Router */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center">
                                  <Layers className="w-5 h-5 text-orange-500" />
                               </div>
                               <div>
                                  <span className="text-[14px] font-semibold text-[#111827]">Open Router</span>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Unified API for any AI model.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('Open Router')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >Set up</Button>
                         </div>

                         {/* Together AI */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center">
                                  <Zap className="w-5 h-5 text-yellow-500" />
                               </div>
                               <div>
                                  <span className="text-[14px] font-semibold text-[#111827]">Together AI</span>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Fast inference for Llama 3 and more.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('Together AI')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >Set up</Button>
                         </div>

                         {/* Perplexity */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center">
                                  <Search className="w-5 h-5 text-blue-400" />
                               </div>
                               <div>
                                  <span className="text-[14px] font-semibold text-[#111827]">Perplexity</span>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">AI-powered search and information discovery.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('Perplexity')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >Set up</Button>
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
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center">
                                  <Globe className="w-5 h-5 text-emerald-500" />
                               </div>
                               <div>
                                  <span className="text-[14px] font-semibold text-[#111827]">Firecrawl</span>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Turn any website into LLM-ready data.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('Firecrawl')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >Set up</Button>
                         </div>

                         {/* Eleven Labs */}
                         <div className="flex items-center justify-between p-4 rounded-[12px] border border-black/[0.03] bg-[#F9F9F7] hover:bg-white hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-[8px] bg-white border border-black/[0.05] flex items-center justify-center">
                                  <Mic2 className="w-5 h-5 text-rose-500" />
                               </div>
                               <div>
                                  <span className="text-[14px] font-semibold text-[#111827]">Eleven Labs</span>
                                  <p className="text-[11px] text-[#111827]/40 font-medium">Leading AI text-to-speech technology.</p>
                               </div>
                            </div>
                            <Button
                              onClick={() => handleStartSetup('Eleven Labs')}
                              className="h-8 rounded-[6px] bg-white border border-black/[0.05] px-4 text-[12px] font-semibold text-[#111827] hover:bg-gray-50 shadow-sm"
                            >Set up</Button>
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
