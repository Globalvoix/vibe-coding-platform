import { HeroWave } from '@/components/ui/ai-input-hero'

export default function Page() {
  return (
    <HeroWave
      onPromptSubmit={(prompt) => {
        if (typeof window !== "undefined") {
          const url = new URL("/workspace", window.location.origin);
          url.searchParams.set("prompt", prompt);
          window.location.href = url.toString();
        }
      }}
    />
  )
}
