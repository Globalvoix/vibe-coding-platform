"use client";

import { HeroWave } from '@/components/ui/ai-input-hero'
import { useRouter } from 'next/navigation'

export default function Page() {
  const router = useRouter()

  const handlePromptSubmit = (prompt: string) => {
    const url = new URL("/workspace", window.location.origin);
    url.searchParams.set("prompt", prompt);
    router.push(url.pathname + url.search);
  }

  return (
    <HeroWave onPromptSubmit={handlePromptSubmit} />
  )
}
