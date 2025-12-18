'use client';

'use client'

import { HeroWave } from '@/components/ui/ai-input-hero'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/lib/ui-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function Page() {
  const router = useRouter()
  const { sidebarOpen } = useUIStore()

  const handlePromptSubmit = async (prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed) return

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: trimmed }),
    })

    if (!response.ok) {
      try {
        const data = await response.json()
        if (data?.code === 'APP_LIMIT_REACHED') {
          router.push('/pricing')
          return
        }

        if (typeof data?.error === 'string' && data.error.trim()) {
          toast.error(data.error)
          return
        }
      } catch (error) {
        console.error('Failed to parse project creation error', error)
      }

      toast.error('Failed to create project')
      return
    }

    const project = await response.json()
    router.push(`/workspace?projectId=${project.id}`)
  }

  return (
    <>
      <AppSidebar />
      <div
        className={cn(
          'transition-transform duration-300 ease-out',
          sidebarOpen ? 'translate-x-64' : 'translate-x-0'
        )}
      >
        <HeroWave onPromptSubmit={handlePromptSubmit} />
      </div>
    </>
  )
}
