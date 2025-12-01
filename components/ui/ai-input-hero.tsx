"use client";

import React, { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/ui/mini-navbar";
import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import { Spinner } from "@/components/ui/spinner";

export type HeroWaveProps = {
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  buttonText?: string;
  onPromptSubmit?: (value: string) => void;
};

export function HeroWave({
  className,
  style,
  title = "Build with AI.",
  subtitle = "The AI Fullstack Engineer. Build prototypes, apps, and websites",
  placeholder = "Describe what you want to create...",
  buttonText = "Generate",
  onPromptSubmit,
}: HeroWaveProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const basePlaceholder = "Make me a";
  const suggestionsRef = useRef<string[]>([
    " fitness app",
    " recipe generator",
    " marketing landing page",
    " travel itinerary planner",
    " blog engine",
    " customer support chatbot",
    " personal finance dashboard",
  ]);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState<string>(
    basePlaceholder
  );
  const typingStateRef = useRef({
    suggestionIndex: 0,
    charIndex: 0,
    deleting: false,
    running: true,
  });
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    typingStateRef.current.running = true;
    const typeSpeed = 70;
    const deleteSpeed = 40;
    const pauseAtEnd = 1200;
    const pauseBetween = 500;

    function schedule(fn: () => void, delay: number) {
      const id = window.setTimeout(fn, delay);
      timersRef.current.push(id);
    }

    function clearTimers() {
      for (const id of timersRef.current) window.clearTimeout(id);
      timersRef.current = [];
    }

    function step() {
      if (!typingStateRef.current.running) return;
      if (prompt !== "") {
        setAnimatedPlaceholder(basePlaceholder);
        schedule(step, 300);
        return;
      }

      const state = typingStateRef.current;
      const suggestions = suggestionsRef.current;
      const current = suggestions[state.suggestionIndex % suggestions.length] || "";

      if (!state.deleting) {
        const nextIndex = state.charIndex + 1;
        const next = current.slice(0, nextIndex);
        setAnimatedPlaceholder(basePlaceholder + next);
        state.charIndex = nextIndex;
        if (nextIndex >= current.length) {
          schedule(() => {
            state.deleting = true;
            step();
          }, pauseAtEnd);
        } else {
          schedule(step, typeSpeed);
        }
      } else {
        const nextIndex = Math.max(0, state.charIndex - 1);
        const next = current.slice(0, nextIndex);
        setAnimatedPlaceholder(basePlaceholder + next);
        state.charIndex = nextIndex;
        if (nextIndex <= 0) {
          state.deleting = false;
          state.suggestionIndex = (state.suggestionIndex + 1) % suggestions.length;
          schedule(step, pauseBetween);
        } else {
          schedule(step, deleteSpeed);
        }
      }
    }

    clearTimers();
    schedule(step, 400);
    return () => {
      typingStateRef.current.running = false;
      clearTimers();
    };
  }, [prompt]);

  return (
    <section
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        backgroundColor: "#ffffff",
        ...style,
      }}
      aria-label="Hero section"
    >
      <AnimatedGradientBackground
        startingGap={125}
        Breathing={true}
        gradientColors={[
          "#ffffff",
          "#2979FF",
          "#FF80AB",
          "#FF6D00",
          "#FFD600",
          "#00E676",
          "#3D5AFE",
        ]}
        gradientStops={[35, 50, 60, 70, 80, 90, 100]}
        animationSpeed={0.02}
        breathingRange={5}
        topOffset={0}
        containerClassName="opacity-30"
        containerStyle={{ filter: "blur(80px)" }}
      />
      <Navbar />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          padding: "24px",
        }}
      >
        <div
          className="max-w-3xl w-full text-center"
          style={{ pointerEvents: "auto" }}
        >
          <h1 className="text-gray-900 text-3xl sm:text-5xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-gray-600 mt-3 sm:mt-4 text-sm sm:text-base">
            {subtitle}
          </p>
          <form
            className="mt-6 sm:mt-8 flex items-center justify-center"
            onSubmit={(e) => {
              e.preventDefault();
              if (!isLoading && prompt.trim()) {
                setIsLoading(true);
                onPromptSubmit?.(prompt);
              }
            }}
          >
            <div className="relative w-full sm:w-[720px]">
              <div className="relative rounded-2xl p-[2px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] bg-gradient-to-br from-gray-50 to-gray-100">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={animatedPlaceholder}
                  rows={5}
                  disabled={isLoading}
                  className="w-full h-32 sm:h-36 resize-none rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 px-4 py-4 pr-16 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <button
                type="submit"
                aria-label={buttonText}
                className="absolute right-3 bottom-3 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="M7 17L17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
