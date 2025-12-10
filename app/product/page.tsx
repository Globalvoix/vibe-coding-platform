"use client";

import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import { Navbar } from "@/components/ui/mini-navbar";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function ProductPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
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
    </main>
  );
}
