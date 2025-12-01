import { HeroWave } from "@/components/ui/ai-input-hero";
import { useRouter } from "next/navigation";

export default function HomePage() {
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
  );
}
