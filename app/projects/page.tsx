'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useClerk } from '@clerk/nextjs'
import { MiniSidebar } from '@/components/sidebar/mini-sidebar'
import { Navbar } from '@/components/ui/mini-navbar'
import { useUIStore } from '@/lib/ui-store'
import { cn } from '@/lib/utils'
import type { ProjectRecord } from '@/lib/projects-db'
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  LayoutGrid, 
  List, 
  ChevronDown,
  Globe,
  Star,
  Trash2,
  Edit2,
  Filter,
  Check,
  User as UserIcon,
  Eye,
  Settings,
  MoreVertical,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck
} from 'lucide-react'
import Image from 'next/image'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Copy, Heart } from 'lucide-react'
import { toast } from 'sonner'

type ViewMode = 'grid' | 'list'
type SortOption = 'last-edited' | 'created' | 'alphabetical'
type OrderOption = 'newest' | 'oldest'
type VisibilityOption = 'any' | 'public' | 'workspace'
type StatusOption = 'any' | 'all-published' | 'internally-published' | 'externally-published' | 'not-published'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  
  // Filter states
  const [sortBy, setSortBy] = useState<SortOption>('last-edited')
  const [order, setOrder] = useState<OrderOption>('newest')
  const [visibility, setVisibility] = useState<VisibilityOption>('any')
  const [status, setStatus] = useState<StatusOption>('any')
  const [creatorSearch, setCreatorSearch] = useState('')
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null)
  
  const router = useRouter()
  const { isSignedIn, userId } = useAuth()
  const { openSignIn } = useClerk()
  const { sidebarOpen } = useUIStore()

  useEffect(() => {
    let cancelled = false

    if (!isSignedIn) {
      openSignIn()
      setIsLoading(false)
      return () => {
        cancelled = true
      }
    }

    async function load() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/projects')
        if (!response.ok) {
          throw new Error('Failed to load projects')
        }
        const data = (await response.json()) as { projects: ProjectRecord[] }
        if (!cancelled) {
          setProjects(data.projects)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load projects')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [isSignedIn, openSignIn])

  const handleOpen = (id: string) => {
    router.push(`/workspace?projectId=${id}`)
  }

  const handleFork = async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${id}/fork`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to fork project')
      const forked = await response.json()
      setProjects((prev) => [forked, ...prev])
      toast.success('Project forked successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to fork project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRename = async (id: string) => {
    const current = projects.find((p) => p.id === id)
    const name = window.prompt('New project name', current?.name ?? '')
    if (!name || !name.trim()) return

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!response.ok) throw new Error('Failed to rename project')
      const updated = (await response.json()) as ProjectRecord
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
    } catch (err) {
      console.error(err)
      window.alert('Failed to rename project')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this project?')) return
    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete project')
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error(err)
      window.alert('Failed to delete project')
    }
  }

  const filteredProjects = useMemo(() => {
    let result = [...projects]

    // Search query
    if (searchQuery.trim()) {
      const normalizedSearch = searchQuery.trim().toLowerCase()
      result = result.filter((project) => {
        const nameText = project.name.toLowerCase()
        const promptText = (project.initial_prompt ?? '').toLowerCase()
        return (
          nameText.includes(normalizedSearch) ||
          promptText.includes(normalizedSearch)
        )
      })
    }

    // Visibility filter
    if (visibility !== 'any') {
      if (visibility === 'public') {
        result = result.filter(p => p.cloud_enabled)
      } else if (visibility === 'workspace') {
        result = result.filter(p => !p.cloud_enabled)
      }
    }

    // Status filter
    if (status !== 'any') {
      if (status === 'all-published') {
        result = result.filter(p => p.cloud_enabled)
      } else if (status === 'not-published') {
        result = result.filter(p => !p.cloud_enabled)
      }
      // Mocking other statuses for now as the schema doesn't have "externally published" explicitly
    }

    // Creator filter
    if (selectedCreator) {
      result = result.filter(p => p.user_id === selectedCreator)
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'last-edited') {
        comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      } else if (sortBy === 'created') {
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (sortBy === 'alphabetical') {
        comparison = a.name.localeCompare(b.name)
      }

      return order === 'newest' ? comparison : -comparison
    })

    return result
  }, [projects, searchQuery, visibility, status, sortBy, order, selectedCreator])

  const creators = useMemo(() => {
    // In a real app, this would be a separate fetch, but we can derive it from projects
    const uniqueIds = Array.from(new Set(projects.map(p => p.user_id)))
    return uniqueIds.map(id => ({
      id,
      email: id === userId ? 'prasukjain13914@gmail.com' : 'user@example.com' // Mocking emails
    }))
  }, [projects, userId])

  const formatDistance = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      <MiniSidebar />
      <div
        className={cn(
          'transition-all duration-300 ease-in-out min-h-screen bg-white',
          sidebarOpen ? 'pl-[240px]' : 'pl-[60px]'
        )}
      >
        <main className="max-w-[1440px] mx-auto px-6 py-12 lg:px-10">
          {/* Header Section */}
          <div className="mb-10 flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-[#111111] tracking-tight">Projects</h1>
            <MoreHorizontal className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors mt-1" />
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
            <div className="relative w-full lg:max-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-[12px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-4 lg:ml-auto">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                {/* Sort Dropdown */}
                <FilterDropdown
                  label={sortBy === 'last-edited' ? 'Last edited' : sortBy === 'created' ? 'Date created' : 'Alphabetical'}
                  active={sortBy !== 'last-edited'}
                >
                  <div className="flex flex-col p-1 min-w-[180px]">
                    <span className="text-[11px] font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">Sort by</span>
                    <DropdownItem label="Last edited" active={sortBy === 'last-edited'} onClick={() => setSortBy('last-edited')} />
                    <DropdownItem label="Date created" active={sortBy === 'created'} onClick={() => setSortBy('created')} />
                    <DropdownItem label="Alphabetical" active={sortBy === 'alphabetical'} onClick={() => setSortBy('alphabetical')} />

                    <div className="h-[1px] bg-gray-100 my-1 mx-1" />

                    <span className="text-[11px] font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">Order</span>
                    <DropdownItem label="Newest first" active={order === 'newest'} onClick={() => setOrder('newest')} />
                    <DropdownItem label="Oldest first" active={order === 'oldest'} onClick={() => setOrder('oldest')} />
                  </div>
                </FilterDropdown>

                {/* Visibility Dropdown */}
                <FilterDropdown label={visibility === 'any' ? 'Any visibility' : visibility === 'public' ? 'Public' : 'Workspace'}>
                  <div className="flex flex-col p-1 min-w-[180px]">
                    <span className="text-[11px] font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">Visibility</span>
                    <DropdownItem label="Any visibility" active={visibility === 'any'} onClick={() => setVisibility('any')} />
                    <DropdownItem label="Public" active={visibility === 'public'} onClick={() => setVisibility('public')} />
                    <DropdownItem label="Workspace" active={visibility === 'workspace'} onClick={() => setVisibility('workspace')} />
                  </div>
                </FilterDropdown>

                {/* Status Dropdown */}
                <FilterDropdown label={status === 'any' ? 'Any status' : 'Filtered status'}>
                  <div className="flex flex-col p-1 min-w-[200px]">
                    <span className="text-[11px] font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">Publish status</span>
                    <DropdownItem label="Any status" active={status === 'any'} onClick={() => setStatus('any')} />
                    <DropdownItem label="All published" active={status === 'all-published'} onClick={() => setStatus('all-published')} />
                    <DropdownItem label="Internally published" active={status === 'internally-published'} onClick={() => setStatus('internally-published')} />
                    <DropdownItem label="Externally published" active={status === 'externally-published'} onClick={() => setStatus('externally-published')} />
                    <DropdownItem label="Not published" active={status === 'not-published'} onClick={() => setStatus('not-published')} />
                  </div>
                </FilterDropdown>

                {/* Creator Dropdown */}
                <FilterDropdown label={selectedCreator ? creators.find(c => c.id === selectedCreator)?.email || 'Creator' : 'All creators'}>
                  <div className="flex flex-col p-1 min-w-[240px]">
                    <span className="text-[11px] font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">Creator</span>
                    <div className="px-3 py-2">
                       <div className="relative">
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                         <input
                           type="text"
                           placeholder="Search creators..."
                           className="w-full bg-gray-50 border-none rounded-lg pl-8 pr-3 py-1.5 text-[12px] focus:ring-1 focus:ring-blue-500/30"
                           value={creatorSearch}
                           onChange={(e) => setCreatorSearch(e.target.value)}
                         />
                       </div>
                    </div>
                    <DropdownItem label="All creators" active={!selectedCreator} onClick={() => setSelectedCreator(null)} />
                    {creators.filter(c => c.email.toLowerCase().includes(creatorSearch.toLowerCase())).map(c => (
                      <DropdownItem key={c.id} label={c.email} active={selectedCreator === c.id} onClick={() => setSelectedCreator(c.id)} />
                    ))}
                  </div>
                </FilterDropdown>
              </div>

              <div className="h-6 w-[1px] bg-gray-100 hidden lg:block" />

              <div className="flex items-center bg-[#F5F5F0] border border-gray-200/50 rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all",
                    viewMode === 'grid' ? "bg-white text-gray-900 shadow-xs" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all",
                    viewMode === 'list' ? "bg-white text-gray-900 shadow-xs" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* List View Headers */}
          {viewMode === 'list' && filteredProjects.length > 0 && (
            <div className="grid grid-cols-[1fr,150px,250px,40px] gap-6 px-6 py-3 border-b border-gray-100 mb-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
               <span>Name</span>
               <span>Created at</span>
               <span>Created by</span>
               <span></span>
            </div>
          )}

          {/* Projects Content */}
          <div className={cn(
            "grid",
            viewMode === 'grid' 
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" 
              : "grid-cols-1 gap-4"
          )}>
            {/* Create Card */}
            {viewMode === 'grid' && (
              <button
                onClick={() => router.push('/home')}
                className="group flex flex-col h-[300px] bg-white border border-dashed border-gray-200 rounded-[24px] hover:border-blue-400 hover:bg-blue-50/10 transition-all duration-300"
              >
                <div className="flex-1 flex items-center justify-center">
                  <Plus className="w-10 h-10 text-gray-400 transition-all duration-300" strokeWidth={1.5} />
                </div>
                <div className="p-6 border-t border-gray-50/50 w-full text-left">
                  <p className="text-[14px] font-semibold text-gray-800">Create new project</p>
                </div>
              </button>
            )}

            {isLoading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col h-[300px] bg-gray-100 rounded-[24px]" />
              ))
            ) : filteredProjects.length === 0 ? null : (
              filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  viewMode={viewMode}
                  onOpen={handleOpen}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onFork={handleFork}
                  formatDistance={formatDistance}
                  creatorEmail={creators.find(c => c.id === project.user_id)?.email || 'user@example.com'}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </>
  )
}

function FilterDropdown({ label, active = false, children }: { label: string; active?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[12px] font-medium whitespace-nowrap shadow-sm outline-none",
          open || active
            ? "bg-white border-gray-300 text-gray-900 ring-2 ring-gray-100"
            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
        )}>
          {label}
          <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {children}
      </PopoverContent>
    </Popover>
  )
}

function DropdownItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-left group",
        active ? "bg-blue-50/50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
      )}
    >
      <span className="truncate">{label}</span>
      {active && <Check className="w-4 h-4 shrink-0" />}
    </button>
  )
}

function ProjectCard({
  project,
  viewMode,
  onOpen,
  onRename,
  onDelete,
  onFork,
  formatDistance,
  creatorEmail
}: {
  project: ProjectRecord;
  viewMode: ViewMode;
  onOpen: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onFork: (id: string) => void;
  formatDistance: (date: string) => string;
  creatorEmail: string;
}) {
  const isGrid = viewMode === 'grid'
  const sandboxState = project.sandbox_state as { url?: string } | null
  const previewUrl = sandboxState?.url

  if (!isGrid) {
    return (
      <div
        className="group grid grid-cols-[1fr,150px,250px,40px] gap-6 items-center px-6 py-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-300 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
        onClick={() => onOpen(project.id)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative w-20 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
            {previewUrl ? (
              <Image
                src={`https://api.microlink.io?url=${encodeURIComponent(previewUrl)}&screenshot=true&embed=screenshot.url`}
                alt="Preview"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                <Globe className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
             <h2 className="text-[14px] font-semibold text-gray-900 truncate tracking-tight">{project.name}</h2>
             <p className="text-[12px] text-gray-400 font-medium">Edited {formatDistance(project.updated_at)}</p>
          </div>
        </div>

        <div className="text-[13px] text-gray-500 font-medium whitespace-nowrap">
          {formatDistance(project.created_at)}
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-[10px]", getAvatarColor(project.name))}>
            {project.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-[13px] text-gray-600 truncate font-medium">{creatorEmail}</span>
        </div>

        <div className="flex justify-end">
           <Star className="w-4 h-4 text-gray-200 hover:text-yellow-400 transition-colors" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="group flex flex-col bg-white border border-gray-200 rounded-[24px] hover:border-gray-300 hover:shadow-xl transition-all duration-500 overflow-hidden cursor-pointer h-[320px]"
      onClick={() => onOpen(project.id)}
    >
      {/* Preview Section */}
      <div className="relative bg-gray-50 overflow-hidden flex-1 border-b border-gray-100">
        <div className="absolute inset-0 flex items-center justify-center">
          {previewUrl ? (
            <Image
              src={`https://api.microlink.io?url=${encodeURIComponent(previewUrl)}&screenshot=true&embed=screenshot.url`}
              alt="Preview"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-200 gap-3">
              <Globe className="w-12 h-12 opacity-50" strokeWidth={1} />
              <span className="text-[10px] font-medium tracking-widest uppercase opacity-40">No preview available</span>
            </div>
          )}
        </div>

        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-lg border border-gray-200 text-gray-400 hover:text-yellow-500 transition-all hover:scale-110 shadow-sm opacity-0 group-hover:opacity-100"
        >
          <Star className="w-3.5 h-3.5" />
        </button>

        {!project.cloud_enabled && (
          <div className="absolute bottom-4 left-4 flex items-center">
            <div className="px-3 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-full shadow-lg">
              <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">
                Draft
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-5 flex flex-col gap-2 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-[12px] shadow-sm",
              getAvatarColor(project.name)
            )}>
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-[14px] font-semibold text-gray-900 truncate tracking-tight group-hover:text-blue-600 transition-colors">
                {project.name}
              </h2>
              <p className="text-[11px] text-gray-400 font-medium">
                Edited {formatDistance(project.updated_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
            <button
              onClick={(e) => { e.stopPropagation(); onFork(project.id); }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900"
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRename(project.id); }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900"
              title="Rename"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getAvatarColor(name: string) {
  return 'bg-green-600'
}
