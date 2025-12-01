"use client";

import { HeroWave } from "@/components/ui/ai-input-hero";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const handlePromptSubmit = (prompt: string) => {
    if (prompt.trim()) {
      const encodedPrompt = encodeURIComponent(prompt);
      router.push(`/workspace?prompt=${encodedPrompt}`);
    }
  };

  return <HeroWave onPromptSubmit={handlePromptSubmit} />;
}
