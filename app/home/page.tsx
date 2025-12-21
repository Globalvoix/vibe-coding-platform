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
        
        <section className="relative bg-white px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
                The most advanced coding agents
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gradient-to-br from-amber-100 via-pink-100 to-green-100 relative overflow-hidden flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-3 p-8 w-full h-full">
                    <div className="bg-green-600 rounded-lg" />
                    <div className="bg-pink-300 rounded-lg" />
                    <div className="bg-green-700 rounded-lg" />
                    <div className="bg-pink-200 rounded-lg" />
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">
                    The Best Models
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-6">
                    Stay ahead with instant access to cutting-edge AI models. No need for multiple platforms—just powerful models at your command.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">Gemini 3 Pro</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="8" />
                      </svg>
                      <span className="text-sm text-gray-700">Claude Sonnet</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a1 1 0 011 1v1.22l3.844-1.949a1 1 0 01.912 1.788L12.9 5.91v4.18l3.844-1.949a1 1 0 01.912 1.788L12.9 13.91v1.22a1 1 0 11-2 0v-1.22l-3.844 1.949a1 1 0 01-.912-1.788l3.844-1.949V9.75l-3.844 1.949a1 1 0 01-.912-1.788l3.844-1.949V5.75a1 1 0 011-1z" />
                      </svg>
                      <span className="text-sm text-gray-700">GPT-5-Codex</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 relative overflow-hidden flex items-center justify-center p-4">
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400/30 to-blue-600/30 rounded-2xl" />
                    <div className="relative bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg max-w-xs">
                      <div className="text-xs font-semibold text-gray-500 mb-2">Community Activities</div>
                      <div className="flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-900">My Portfolio</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">
                    The Best Design
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    Our Boost feature lets you create stunning visual designs without the hassle. Enhance every project with a single click.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-5xl sm:text-6xl font-bold text-white mb-2">
                        10<span className="text-3xl sm:text-4xl">x</span>
                      </div>
                      <p className="text-sm text-gray-300">Better at Fixing Errors</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">
                    The Best Error Fixer
                  </h3>
                  <p className="text-sm sm:text-base text-gray-300">
                    Automatically test and resolve issues, so you can keep progressing without frustration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative bg-gray-50 px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
                Simpler. Smarter. Safer.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
              <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4 flex items-center justify-center h-12 w-12 rounded-lg bg-gray-100">
                  <Image
                    src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F64e5288fcedc47d48cd33262fc43fee5?format=webp&width=800"
                    alt="API icon"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Built-in AI API, No API
                </h3>
                <p className="text-sm text-gray-600">
                  key setup, no config — just websites that work.
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4 flex items-center justify-center h-12 w-12 rounded-lg bg-gray-100">
                  <Image
                    src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F614c0c8e19b1473bb194e5945fc1a5cc?format=webp&width=800"
                    alt="Database icon"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Automatically build your database
                </h3>
                <p className="text-sm text-gray-600">
                  Store and manage data effortlessly.
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4 flex items-center justify-center h-12 w-12 rounded-lg bg-gray-100">
                  <Image
                    src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F5ebe106e0df64716a9f9d184eec75bff?format=webp&width=800"
                    alt="Security icon"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Enterprise-grade security
                </h3>
                <p className="text-sm text-gray-600">
                  Secure infrastructure built into every project.
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4 flex items-center justify-center h-12 w-12 rounded-lg bg-gray-100">
                  <Image
                    src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F816f5512fc40456d9d36afdcdf30996a?format=webp&width=800"
                    alt="Analytics icon"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Your analytics, simplified
                </h3>
                <p className="text-sm text-gray-600">
                  Track visits, conversions, and growth.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-32 sm:py-40 px-4 overflow-hidden bg-[url('https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F8bbb18fa1c314fc691551fd3bdaeae17?format=webp&width=800')] bg-cover bg-center bg-no-repeat">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-8">
              Ready to Build?
            </h2>
            <button
              onClick={() => handlePromptSubmit('')}
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Start Building
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
