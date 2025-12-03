"use client";

"use client";

import { HeroWave } from '@/components/ui/ai-input-hero'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

export default function Page() {
  const router = useRouter()
  const { userId } = useAuth()

  const handlePromptSubmit = async (prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed || !userId) return

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: trimmed, userId }),
    })

    if (!response.ok) {
      console.error('Failed to create project');
      return;
    }

    const project = await response.json();
    router.push(`/workspace?projectId=${project.id}`);
  }

  return (
    <>
      <AppSidebar />
      <HeroWave onPromptSubmit={handlePromptSubmit} />
    </>
  )
}
