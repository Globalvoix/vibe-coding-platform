"use client";

import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import { Navbar } from "@/components/ui/mini-navbar";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const designSystemStyles = `
  @keyframes color-cycle-1 {
    0%, 100% { background-color: #ec4899; }
    33% { background-color: #ff6b35; }
    66% { background-color: #c4b5fd; }
  }

  @keyframes color-cycle-2 {
    0%, 100% { background-color: #ff6b35; }
    33% { background-color: #c4b5fd; }
    66% { background-color: #ec4899; }
  }

  @keyframes color-cycle-3 {
    0%, 100% { background-color: #c4b5fd; }
    33% { background-color: #ec4899; }
    66% { background-color: #ff6b35; }
  }

  .color-block-1 { animation: color-cycle-1 6s ease-in-out infinite; }
  .color-block-2 { animation: color-cycle-2 6s ease-in-out infinite; }
  .color-block-3 { animation: color-cycle-3 6s ease-in-out infinite; }
`;

export default function ProductPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <style>{designSystemStyles}</style>
      <AnimatedGradientBackground
        startingGap={125}
        Breathing
        gradientColors={["#ffffff", "#2979FF", "#FF80AB", "#FF6D00", "#FFD600", "#00E676", "#3D5AFE"]}
        gradientStops={[35, 50, 60, 70, 80, 90, 100]}
        animationSpeed={0.02}
        breathingRange={5}
        topOffset={0}
        containerClassName="opacity-80"
        containerStyle={{ filter: "blur(90px)" }}
      />

      <Navbar />

      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-gray-700 uppercase">
          For founders &amp; builders
        </p>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-gray-900">
          Build it with Thinksoft
        </h1>
        <p className="mt-4 max-w-xl text-sm sm:text-base text-gray-700">
          Your AI cofounder and development team. Ship your idea in days, not months, and start building the business you&apos;ve been dreaming about.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-gray-900 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-black transition-colors"
        >
          Get Started
        </Link>
      </section>

      <section className="relative z-10 bg-[#05060a] px-4 py-20 sm:py-28 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="flex justify-center mb-10">
            <Image
              src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Ff6b8eacc082f4e3bb3eaa5683364dabb?format=webp&width=800"
              alt="Thinksoft coding agent beam"
              width={48}
              height={192}
              className="h-40 sm:h-48 w-auto"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-gray-100">
            Empowering product builders
            <span className="block font-bold text-white">
              with the most powerful coding agents
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-gray-300">
            Bot does the heavy lifting for you, so you can focus on your vision instead of fighting errors.
          </p>
        </div>
      </section>

      <section className="relative z-10 bg-[#05060a] px-4 pb-20 sm:pb-28">
        <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#111318] p-6 sm:p-7 text-left text-gray-100">
              <h3 className="text-base sm:text-lg font-semibold">
                Always the best, without switching tools
              </h3>
              <p className="mt-3 text-sm sm:text-base text-gray-300">
                Thinksoft integrates the frontier coding agents from the AI labs directly inside one familiar visual
                interface. No more AI anxiety or juggling multiple platforms.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111318] p-6 sm:p-7 text-left text-gray-100 flex flex-col justify-between min-h-[190px]">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-400">
                  Less errors. More shipping.
                </p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl font-semibold">98%</span>
                  <span className="text-sm sm:text-base text-gray-300">less errors</span>
                </div>
                <p className="mt-4 text-sm sm:text-base text-gray-300 max-w-xs">
                  Thinksoft automatically tests, refactors, and iterates, reducing errors so you keep building instead of
                  fixing.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#111318] p-6 sm:p-7 text-left text-gray-100 flex flex-col items-start gap-4">
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-400">
                Agents you can trust
              </p>
              <div className="w-full max-w-xs rounded-2xl bg-[#1a1c22] px-3 py-3 text-sm text-gray-100">
                <div className="flex items-center justify-between rounded-xl bg-[#2a2d35] px-3 py-2 mb-2">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400" />
                    Claude Code
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-1.5 text-gray-400">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full border border-gray-400" />
                    Codex
                  </span>
                  <span className="text-xs">coming soon</span>
                </div>
                <div className="flex items-center justify-between px-3 py-1.5 text-gray-400">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                    Gemini
                  </span>
                  <span className="text-xs">coming soon</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111318] p-6 sm:p-7 text-left text-gray-100 flex flex-col gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold">
                  Build big without breaking
                </h3>
                <p className="mt-3 text-sm sm:text-base text-gray-300 max-w-md">
                  Thinksoft handles projects far larger than before. Its improved built-in context management can handle
                  complexity and keep your projects running smoothly.
                </p>
              </div>
              <div className="relative mt-2 flex justify-center">
                <Image
                  src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F52f8de17ee4d47a78333a8a0af6e6088?format=webp&width=800"
                  alt="Thinksoft performance windows"
                  width={640}
                  height={210}
                  className="w-full max-w-md rounded-xl object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
