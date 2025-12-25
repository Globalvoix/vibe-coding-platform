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
  Lock,
  Clock,
  User as UserIcon,
  Trash2,
  Edit2
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

  const handleCreateNew = () => {
    router.push('/home')
  }

  return (
    <>
      <AppSidebar />
      <Navbar variant="home" theme="dark" />
      <div
        className={cn(
          'transition-transform duration-300 ease-out min-h-screen bg-[#FDFDFB]',
          sidebarOpen ? 'translate-x-64' : 'translate-x-0'
        )}
      >
        <main className="max-w-[1400px] mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-medium text-[#1A1A1A]">Projects</h1>
              <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Last edited</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </div>
              
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Any visibility</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Any status</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                <span className="text-xs font-medium text-gray-600 whitespace-nowrap">All creators</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </div>

              <div className="h-6 w-[1px] bg-gray-200 mx-2 hidden md:block" />

              <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === 'grid' ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === 'list' ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className={cn(
            "grid gap-6",
            viewMode === 'grid' 
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
              : "grid-cols-1"
          )}>
            {/* Create New Card */}
            {viewMode === 'grid' && (
              <button
                onClick={handleCreateNew}
                className="group flex flex-col h-[280px] bg-white border border-dashed border-gray-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 overflow-hidden"
              >
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                    <Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                  </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 w-full text-left">
                  <p className="text-sm font-medium text-gray-700">Create new project</p>
                </div>
              </button>
            )}

            {isLoading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col h-[280px] bg-gray-100 rounded-2xl" />
              ))
            ) : filteredProjects.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LayoutGrid className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No projects found</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  {projects.length === 0
                    ? 'Start building your first project with Thinksoft.'
                    : 'Try adjusting your search or filters to find what you are looking for.'}
                </p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className={cn(
                    "group flex flex-col bg-white border border-gray-200 rounded-2xl hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 overflow-hidden cursor-pointer",
                    viewMode === 'grid' ? "h-[280px]" : "flex-row h-24 items-center px-4 gap-4"
                  )}
                  onClick={() => handleOpen(project.id)}
                >
                  {/* Project Preview */}
                  <div className={cn(
                    "relative bg-[#1A1A1A] overflow-hidden",
                    viewMode === 'grid' ? "flex-1" : "w-32 h-16 rounded-lg shrink-0"
                  )}>
                    {/* Placeholder for screenshot */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-40">
                      <Image
                        src={`https://api.dicebear.com/7.x/identicon/svg?seed=${project.id}&backgroundColor=1a1a1a&fontFamily=Inter`}
                        alt="Preview"
                        fill
                        className="object-cover grayscale"
                        unoptimized
                      />
                    </div>
                    {/* Brand overlay */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                       <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                         <span className="text-[10px] font-bold text-white uppercase">{project.name.charAt(0)}</span>
                       </div>
                       <span className="text-[10px] font-medium text-white/60 tracking-wider uppercase">{project.cloud_enabled ? 'Published' : 'Draft'}</span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className={cn(
                    "p-4 flex flex-col gap-1",
                    viewMode === 'grid' ? "" : "flex-1"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-white uppercase">{project.name.charAt(0)}</span>
                        </div>
                        <h2 className="text-sm font-medium text-gray-900 truncate">
                          {project.name}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRename(project.id); }}
                          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600"
                          title="Rename"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                          className="p-1.5 hover:bg-red-50 rounded-md transition-colors text-gray-400 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1">
                      Edited {formatDistance(project.updated_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </>
  )
}
