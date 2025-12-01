"use client";

import { HeroWave } from "@/components/ui/ai-input-hero";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const handlePromptSubmit = (prompt: string) => {
    if (prompt.trim()) {
      const encodedPrompt = encodeURIComponent(prompt);
      router.push(`/workspace?prompt=${encodedPrompt}`);
    }
  };

  return (
    <>
      <AppSidebar />
      <HeroWave onPromptSubmit={handlePromptSubmit} />
    </>
  );
}
