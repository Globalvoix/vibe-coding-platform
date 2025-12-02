"use client";

import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import { Navbar } from "@/components/ui/mini-navbar";
import React from "react";

export default function ProductPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <AnimatedGradientBackground
        startingGap={125}
        Breathing={true}
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
          Your AI cofounder and development team. Ship your idea in days, not months
          and start building the business you&apos;ve been dreaming about.
        </p>
        <button
          type="button"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-gray-900 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-black transition-colors"
        >
          Get Started
        </button>
      </section>
    </main>
  );
}
