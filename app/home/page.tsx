'use client';

import { useEffect } from "react";
import { HeroWave } from "@/components/ui/ai-input-hero";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { ensureUserSubscription } from "@/app/actions/subscription";
import { toast } from 'sonner'
import { ChevronRight } from "lucide-react";
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

        <section className="relative py-24 sm:py-32 px-4 bg-white">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mb-16 max-w-2xl leading-tight">
              Thinksoft is being used by the world's leading organizations across industries
            </h2>

            <div className="grid gap-x-12 gap-y-16 md:grid-cols-2">
              {/* Item 1 */}
              <div className="flex flex-col sm:flex-row gap-8">
                <div className="relative w-full sm:w-64 aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 shrink-0 shadow-sm">
                  <Image
                    src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Fa16c6aa95f9d4b7e8e2947134adf6f62?format=webp&width=800"
                    alt="40% cheaper"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Build for 40% cheaper</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    Streamline your development process and significantly reduce operational costs without compromising on quality.
                  </p>
                  <a href="#" className="text-sm font-semibold text-gray-900 flex items-center gap-1 hover:opacity-70 transition-opacity">
                    Learn more <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex flex-col sm:flex-row gap-8">
                <div className="relative w-full sm:w-64 aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 shrink-0 shadow-sm">
                  <Image
                    src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F6222314eb160484e88ad5af4e836a7bc?format=webp&width=800"
                    alt="Best AI models"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">The Best AI Models</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    Leverage state-of-the-art models like GPT-4, Claude 3.5, and Gemini 1.5 Pro for unparalleled code generation accuracy.
                  </p>
                  <a href="#" className="text-sm font-semibold text-gray-900 flex items-center gap-1 hover:opacity-70 transition-opacity">
                    Learn more <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex flex-col sm:flex-row gap-8">
                <div className="relative w-full sm:w-64 aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 shrink-0 shadow-sm">
                  <Image
                    src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F66a1cf565fe348529b259d119c725848?format=webp&width=800"
                    alt="Full stack applications"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Full Stack Applications</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    Go beyond simple components. Build complete, production-ready fullstack applications from a single prompt.
                  </p>
                  <a href="#" className="text-sm font-semibold text-gray-900 flex items-center gap-1 hover:opacity-70 transition-opacity">
                    Learn more <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Item 4 */}
              <div className="flex flex-col sm:flex-row gap-8">
                <div className="relative w-full sm:w-64 aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 shrink-0 shadow-sm">
                  <Image
                    src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F6003c9ec46164e83a9a8781dd935a8f4?format=webp&width=800"
                    alt="Enterprise Grade"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Enterprise-Grade Stack</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    Scale with confidence using advanced backend infrastructure and high-performance frontend architectures.
                  </p>
                  <a href="#" className="text-sm font-semibold text-gray-900 flex items-center gap-1 hover:opacity-70 transition-opacity">
                    Learn more <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

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
