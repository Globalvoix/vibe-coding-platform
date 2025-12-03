'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import type { ProjectRecord } from '@/lib/projects-db'
import { useAuth } from '@clerk/nextjs'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { userId } = useAuth()

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/projects?userId=${encodeURIComponent(userId)}`)
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
  }, [])

  const handleOpen = (id: string) => {
    router.push(`/workspace?projectId=${id}`)
  }

  const handleRename = async (id: string) => {
    const current = projects.find((p) => p.id === id)
    const name = window.prompt('New project name', current?.name ?? '')
    if (!name || !name.trim()) return

    try {
      const response = await fetch(`/api/projects/${id}?userId=${encodeURIComponent(userId ?? '')}`, {
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
      const response = await fetch(`/api/projects/${id}?userId=${encodeURIComponent(userId ?? '')}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete project')
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error(err)
      window.alert('Failed to delete project')
    }
  }

  return (
    <>
      <AppSidebar />
      <main className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
              All projects
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Open, rename, or delete projects you have created with Thinksoft.
            </p>
          </div>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have not created any projects yet. Use the prompt bar on the home
            page to create your first project.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
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
