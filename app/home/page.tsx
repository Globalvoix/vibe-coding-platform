'use client';

import { useEffect } from "react";
import { HeroWave } from "@/components/ui/ai-input-hero";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { useRouter } from "next/navigation";
import { ensureUserSubscription } from "@/app/actions/subscription";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Ensure user has a subscription initialized
    ensureUserSubscription().catch(console.error)
  }, [])

  const handlePromptSubmit = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: trimmed }),
    });

    if (!response.ok) {
      console.error('Failed to create project');
      throw new Error('Failed to create project');
    }

    const project = await response.json();
    router.push(`/workspace?projectId=${project.id}`);
  };

  return (
    <>
      <AppSidebar />
      <HeroWave onPromptSubmit={handlePromptSubmit} />
    </>
  );
}
