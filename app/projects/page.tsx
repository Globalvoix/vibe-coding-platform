'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useClerk } from '@clerk/nextjs'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import type { ProjectRecord } from '@/lib/projects-db'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const { openSignIn } = useClerk()

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

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredProjects = normalizedSearch
    ? projects.filter((project) => {
        const nameText = project.name.toLowerCase()
        const promptText = (project.initial_prompt ?? '').toLowerCase()
        return (
          nameText.includes(normalizedSearch) ||
          promptText.includes(normalizedSearch)
        )
      })
    : projects

  return (
    <>
      <AppSidebar />
      <main className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
              All projects
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Open, rename, or delete projects you have created with Thinksoft.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <label
              className="block text-xs font-medium text-muted-foreground mb-1"
              htmlFor="project-search"
            >
              Search projects
            </label>
            <input
              id="project-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Filter by name or prompt..."
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            />
          </div>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : filteredProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {projects.length === 0
              ? 'You have not created any projects yet. Use the prompt bar on the home page to create your first project.'
              : 'No projects match your search. Try a different keyword.'}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col rounded-xl border border-border bg-card/80 hover:bg-card shadow-sm hover:shadow-md transition-all p-4 space-y-2"
              >
                <h2 className="text-sm font-semibold text-foreground truncate">
                  {project.name}
                </h2>
                {project.initial_prompt && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {project.initial_prompt}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => handleOpen(project.id)}
                    className="text-blue-600 hover:underline"
                  >
                    Open →
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleRename(project.id)}
                      className="hover:underline"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(project.id)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
