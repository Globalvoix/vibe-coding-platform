'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useClerk } from '@clerk/nextjs'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
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
  Filter
} from 'lucide-react'
import Image from 'next/image'

type ViewMode = 'grid' | 'list'
type SortOption = 'last-edited' | 'created' | 'alphabetical'
type VisibilityOption = 'any' | 'public' | 'private'
type StatusOption = 'any' | 'active' | 'archived'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('last-edited')
  const [visibility, setVisibility] = useState<VisibilityOption>('any')
  
  const router = useRouter()
  const { isSignedIn } = useAuth()
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

    if (visibility !== 'any') {
      result = result.filter(p => visibility === 'public' ? p.cloud_enabled : !p.cloud_enabled)
    }

    result.sort((a, b) => {
      if (sortBy === 'last-edited') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
      if (sortBy === 'created') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name)
      }
      return 0
    })

    return result
  }, [projects, searchQuery, visibility, sortBy])

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
      <AppSidebar />
      <Navbar variant="home" theme="dark" />
      <div
        className={cn(
          'transition-transform duration-300 ease-out min-h-screen bg-[#F9F9F8]',
          sidebarOpen ? 'translate-x-64' : 'translate-x-0'
        )}
      >
        <main className="max-w-[1440px] mx-auto px-6 py-12 lg:px-10">
          {/* Header Section */}
          <div className="flex items-center gap-3 mb-10">
            <h1 className="text-2xl font-semibold text-[#111111] tracking-tight">Projects</h1>
            <button className="p-1 hover:bg-gray-100 rounded-md transition-colors group">
              <MoreHorizontal className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 flex-1">
              <div className="relative w-full lg:max-w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-[13px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 transition-all shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                <FilterButton label="Last edited" active />
                <FilterButton label="Any visibility" />
                <FilterButton label="Any status" />
                <FilterButton label="All creators" />
              </div>
            </div>

            <div className="flex items-center gap-3 self-end lg:self-auto">
              <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    viewMode === 'grid' ? "bg-gray-100 text-gray-900 shadow-xs" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    viewMode === 'list' ? "bg-gray-100 text-gray-900 shadow-xs" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          <div className={cn(
            "grid gap-8",
            viewMode === 'grid' 
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
              : "grid-cols-1"
          )}>
            {/* Create Card */}
            {viewMode === 'grid' && (
              <button
                onClick={() => router.push('/home')}
                className="group flex flex-col h-[300px] bg-white border border-dashed border-gray-200 rounded-[24px] hover:border-blue-400 hover:bg-blue-50/10 transition-all duration-300"
              >
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center transition-all duration-300 scale-95 group-hover:scale-100">
                    <Plus className="w-7 h-7 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </div>
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
            ) : filteredProjects.length === 0 ? (
              <div className="col-span-full py-24 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <LayoutGrid className="w-10 h-10 text-gray-200" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
                <p className="text-[14px] text-gray-500 max-w-sm mx-auto">
                  Try adjusting your search or filters to find your projects.
                </p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  viewMode={viewMode}
                  onOpen={handleOpen}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  formatDistance={formatDistance}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </>
  )
}

function FilterButton({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button className={cn(
      "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-[13px] font-medium whitespace-nowrap shadow-sm",
      active 
        ? "bg-white border-gray-300 text-gray-900" 
        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
    )}>
      {label}
      <ChevronDown className="w-4 h-4 text-gray-400" />
    </button>
  )
}

function ProjectCard({ 
  project, 
  viewMode, 
  onOpen, 
  onRename, 
  onDelete, 
  formatDistance 
}: { 
  project: ProjectRecord; 
  viewMode: ViewMode; 
  onOpen: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  formatDistance: (date: string) => string;
}) {
  const isGrid = viewMode === 'grid'
  
  return (
    <div
      className={cn(
        "group flex flex-col bg-white border border-gray-200 rounded-[24px] hover:border-blue-400/50 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 overflow-hidden cursor-pointer",
        isGrid ? "h-[300px]" : "flex-row h-24 items-center px-6 gap-6"
      )}
      onClick={() => onOpen(project.id)}
    >
      {/* Preview Section */}
      <div className={cn(
        "relative bg-[#111111] overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]",
        isGrid ? "flex-1" : "w-40 h-16 rounded-xl shrink-0"
      )}>
        {/* Abstract Preview */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${project.id}&backgroundColor=111111&fontFamily=Inter`}
            alt="Preview"
            fill
            className="object-cover opacity-30 grayscale brightness-125"
            unoptimized
          />
        </div>
        
        {/* Star Icon */}
        {isGrid && (
          <button 
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md rounded-lg border border-white/10 text-white/40 hover:text-yellow-400 transition-all hover:scale-110"
          >
            <Star className="w-3.5 h-3.5 fill-current" />
          </button>
        )}

        {/* Badge */}
        <div className="absolute bottom-4 left-4 flex items-center">
          <div className="px-3 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full">
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none">
              {project.cloud_enabled ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className={cn(
        "p-6 flex flex-col gap-2",
        isGrid ? "" : "flex-1"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-[12px] shadow-sm",
              getAvatarColor(project.name)
            )}>
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-[14px] font-semibold text-gray-900 truncate tracking-tight">
                {project.name}
              </h2>
              <p className="text-[12px] text-gray-400 font-medium">
                Edited {formatDistance(project.updated_at)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
            <button 
              onClick={(e) => { e.stopPropagation(); onRename(project.id); }}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-900"
              title="Rename"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              className="p-2 hover:bg-red-50 rounded-xl transition-colors text-gray-400 hover:text-red-500"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-cyan-500'
  ]
  const index = name.length % colors.length
  return colors[index]
}
