"use client";

import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/ui/mini-navbar";
import Image from "next/image";
import { Spinner } from "@/components/ui/spinner";
import { useAuth, useClerk } from "@clerk/nextjs";

export type HeroWaveProps = {
  className?: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  buttonText?: string;
  onPromptSubmit?: (value: string) => void;
};

export function HeroWave({
  className,
  title = "Thinksoft",
  subtitle = "The AI Fullstack Engineer. Create beautiful, production-ready websites",
  placeholder = "Describe what you want to create...",
  buttonText = "Generate",
  onPromptSubmit,
}: HeroWaveProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();

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
      className={["relative w-full h-screen bg-white", className].filter(Boolean).join(" ")}
      aria-label="Hero section"
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Fe82ff681d02b46d39e57f9c73362f419?format=webp&width=800"
          alt="Thinksoft home background"
          fill
          priority
          className="object-cover"
        />
      </div>
      <div className="absolute inset-0 z-[1] bg-black/10" />
      <Navbar variant="home" />
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-6">
        <div className="max-w-3xl w-full text-center pointer-events-auto">
          <h1 className="text-white text-3xl sm:text-5xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-white/80 mt-3 sm:mt-4 text-sm sm:text-base">
            {subtitle}
          </p>
          <form
            className="mt-6 sm:mt-8 flex items-center justify-center"
            onSubmit={async (e) => {
              e.preventDefault();

              if (!isSignedIn) {
                openSignIn();
                return;
              }

              if (!isLoading && prompt.trim()) {
                try {
                  setIsLoading(true);
                  await onPromptSubmit?.(prompt);
                  // On success, navigation to workspace unmounts this component,
                  // so we intentionally do not reset isLoading here.
                } catch (error) {
                  console.error('Prompt submission failed', error);
                  setIsLoading(false);
                }
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
                  className="w-full h-32 sm:h-36 resize-none rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 outline-none focus:outline-none px-4 py-4 pr-16 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                aria-label={buttonText}
                className="absolute right-3 bottom-3 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Spinner size="sm" color="white" />
                ) : (
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
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
