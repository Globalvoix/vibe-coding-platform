'use client';

import { useEffect } from "react";
import { HeroWave } from "@/components/ui/ai-input-hero";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { ensureUserSubscription } from "@/app/actions/subscription";
import { toast } from 'sonner'
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();
  const { sidebarOpen } = useUIStore();

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
      try {
        const data = await response.json();
        if (data?.code === 'APP_LIMIT_REACHED') {
          router.push('/pricing');
          return;
        }

        if (typeof data?.error === 'string' && data.error.trim()) {
          toast.error(data.error)
          return
        }
      } catch (error) {
        console.error('Failed to parse project creation error', error);
      }

      toast.error('Failed to create project')
      return
    }

    const project = await response.json();
    router.push(`/workspace?projectId=${project.id}`);
  };

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

        <section className="relative py-24 sm:py-32 px-4 overflow-hidden bg-[#0A0A0A]">
          <div className="relative mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight text-white leading-[1.1]">
                  Generate fullstack <br />
                  software better with AI
                </h2>
              </div>
              <div className="flex flex-col items-start md:pl-12">
                <p className="text-lg text-gray-400 mb-10 max-w-md leading-relaxed">
                  From first prompt to full deployment, create apps that work with your data, your systems, and your rules.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => handlePromptSubmit('')}
                    className="inline-flex items-center justify-center rounded-full bg-[#E5E7EB] px-8 py-4 text-sm font-semibold text-gray-900 hover:bg-white transition-colors min-w-[160px]"
                  >
                    Start for free
                  </button>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="inline-flex items-center justify-center rounded-full bg-[#1A1A1A] border border-gray-800 px-8 py-4 text-sm font-semibold text-white hover:bg-gray-800 transition-colors min-w-[160px]"
                  >
                    Book a demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
