'use client';

'use client'

import { HeroWave } from '@/components/ui/ai-input-hero'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/lib/ui-store'
import { cn } from '@/lib/utils'

export default function Page() {
  const router = useRouter()
  const { sidebarOpen } = useUIStore()

  const handlePromptSubmit = async (prompt: string, images?: Array<{ url: string; name: string }>) => {
    const trimmed = prompt.trim()
    if (!trimmed && (!images || images.length === 0)) return

    // Store images in sessionStorage for the workspace
    if (images && images.length > 0) {
      sessionStorage.setItem('initialImages', JSON.stringify(images))
    }

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: trimmed, imageUrls: images?.map(img => img.url) || [] }),
    })

    if (!response.ok) {
      try {
        const data = await response.json()
        if (data?.code === 'APP_LIMIT_REACHED') {
          router.push('/pricing')
          return
        }
      } catch (error) {
        console.error('Failed to parse project creation error', error)
      }

      console.error('Failed to create project')
      throw new Error('Failed to create project')
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
