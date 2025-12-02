"use client";

import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import { Navbar } from "@/components/ui/mini-navbar";
import Image from "next/image";
import React, { useState } from "react";

const productSlides = [
  {
    eyebrow: "Build by describing",
    title: "Build by describing what you want",
    description:
      "Chatting with Thinksoft is like talking with a developer. Describe your vision, drop in screenshots, or paste your Notion doc. Thinksoft takes it from there.",
    imageSrc:
      "https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Ff4bdd9d6c4264a4aab3b5997737053f8?format=webp&width=800",
    imageAlt: "Ask Thinksoft to create interface screenshot",
  },
  {
    eyebrow: "Production infrastructure",
    title: "Production infrastructure included",
    description:
      "Real backend with Thinksoft Cloud and Supabase gives you Postgres database, authentication, file storage, and real-time features. All auto-provisioned so you can focus on your product.",
    imageSrc:
      "https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Ffa248e6fcafd410abd753bbd5c776402?format=webp&width=800",
    imageAlt: "App dashboard showing database tables and navigation",
  },
  {
    eyebrow: "Visual controls",
    title: "Polish it to perfection",
    description:
      "Tweak layouts, colors, and text with direct visual control. See changes instantly and bring your vision to life exactly as you imagined it.",
    imageSrc:
      "https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F82901f4f7b1442b8a55c41827e5f376e?format=webp&width=800",
    imageAlt: "Interface panel showing spacing, typography, and color controls",
  },
  {
    eyebrow: "Modern tech stack",
    title: "Modern, standard tech stack",
    description:
      "Build on industry-standard frameworks like React, Supabase, and Tailwind, then sync everything to GitHub from day one. Your code, your repository, your rules.",
    imageSrc:
      "https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F2f40a6aab8cd44928646fe23155da865?format=webp&width=800",
    imageAlt: "Icons representing modern frontend and backend tools",
  },
  {
    eyebrow: "Launch fast",
    title: "One-click publish",
    description:
      "Custom domain, SEO optimization, and security checks are all handled for you. Go from idea to live project in the same day with a single click.",
    imageSrc:
      "https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F99768599cc464a688e1375ef6375cb04?format=webp&width=800",
    imageAlt: "Publish button highlighted in an app interface",
  },
] as const;

export default function ProductPage() {
  const [activeIndex, setActiveIndex] = useState(0);

  const currentSlide = productSlides[activeIndex];
  const lastIndex = productSlides.length - 1;

  const goToPrevious = () => {
    setActiveIndex((index) => (index === 0 ? lastIndex : index - 1));
  };

  const goToNext = () => {
    setActiveIndex((index) => (index === lastIndex ? 0 : index + 1));
  };

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
          Your AI cofounder and development team. Ship your idea in days, not months, and start building the business you&apos;ve been dreaming about.
        </p>
        <button
          type="button"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-gray-900 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-black transition-colors"
        >
          Get Started
        </button>
      </section>

      <section className="relative z-10 bg-[#f6efe6] px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-left">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Your AI cofounder and dev team
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
              Your idea doesn&apos;t need a technical cofounder. Thinksoft is your technical partner – build, iterate, and ship in hours instead of months.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 sm:p-10">
            <div className="grid items-start gap-6 md:grid-cols-2 md:gap-12">
              <div className="text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  {currentSlide.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900 sm:text-xl">
                  {currentSlide.title}
                </h3>
                <p className="mt-3 text-sm text-gray-700 sm:text-base leading-relaxed">
                  {currentSlide.description}
                </p>
              </div>

              <div className="relative h-64 w-full overflow-hidden rounded-xl sm:h-72">
                <Image
                  src={currentSlide.imageSrc}
                  alt={currentSlide.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 480px, (min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between sm:mt-8">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPrevious}
                  aria-label="Previous slide"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  aria-label="Next slide"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {productSlides.map((slide, index) => (
                  <button
                    key={slide.title}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Go to slide ${index + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      index === activeIndex ? "w-6 bg-gray-800" : "w-2 bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
