'use client';

import { useEffect } from "react";
import { HeroWave } from "@/components/ui/ai-input-hero";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { ensureUserSubscription } from "@/app/actions/subscription";
import { toast } from 'sonner'
import { ChevronRight, ArrowUpRight } from "lucide-react";
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
                    Leverage state-of-the-art models like GPT-5, Claude 4.5, and Gemini 3 Pro for unparalleled code generation accuracy.
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

        <section className="relative min-h-[600px] flex items-center py-24 px-4 overflow-hidden">
          {/* Background Image with Blur */}
          <div className="absolute inset-0 z-0">
            <Image
              src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Fa16c6aa95f9d4b7e8e2947134adf6f62?format=webp&width=2000"
              alt="Research background"
              fill
              className="object-cover blur-3xl scale-110 opacity-30"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-white" />
          </div>

          <div className="relative z-10 mx-auto max-w-6xl w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold tracking-[0.2em] text-gray-900 mb-8 uppercase">Thinksoft Research</span>
                <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-gray-900 mb-8 max-w-md leading-[1.2]">
                  We are using foundational AI models that will be capable of simulating all possible software architectures and experiences.
                </h2>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-6 py-2 rounded-full border border-gray-900 text-xs font-bold text-gray-900 hover:bg-gray-900 hover:text-white transition-all duration-300 uppercase tracking-wider"
                >
                  Learn more
                </button>
              </div>

              <div className="flex flex-col w-full">
                <div className="border-t border-gray-900/10 py-10 group cursor-pointer transition-colors hover:bg-black/5 px-4 -mx-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">Claude 4.5 Sonnet</h3>
                    <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
                  </div>
                  <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                    Advanced reasoning and multi-step problem solving. Perfect for complex architectural decisions and intelligent code generation workflows.
                  </p>
                </div>

                <div className="border-t border-gray-900/10 py-10 group cursor-pointer transition-colors hover:bg-black/5 px-4 -mx-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">GPT-5</h3>
                    <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
                  </div>
                  <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                    Next-generation language model with superior performance and reasoning capabilities. Optimized for rapid iteration and production-grade output.
                  </p>
                </div>

                <div className="border-t border-gray-900/10 py-10 group cursor-pointer border-b border-gray-900/10 transition-colors hover:bg-black/5 px-4 -mx-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold text-gray-900">Gemini 3 Pro</h3>
                      <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-full uppercase tracking-wider">Coming Soon</span>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
                  </div>
                  <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                    Google&apos;s latest multimodal AI with enhanced vision and reasoning. Bringing unified intelligence for building intelligent fullstack applications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative h-screen min-h-[600px] flex items-center justify-center px-4 overflow-hidden">
          <video
            autoPlay
            muted
            loop
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="https://cdn.builder.io/o/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F564828ee0283404ca22d62e2577662bc?alt=media&token=485ba4fa-a8d0-41d6-811e-e76285adad63&apiKey=1d734cd0ef68491eb64e3e5bf6a74b6f" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <h2 className="text-4xl sm:text-5xl font-normal text-white mb-6">
              Available now in<br />
              Thinksoft.
            </h2>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-6 py-2 rounded-full bg-white text-xs font-bold text-gray-900 hover:bg-gray-100 transition-all duration-300 uppercase tracking-wider"
            >
              Try Now
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
