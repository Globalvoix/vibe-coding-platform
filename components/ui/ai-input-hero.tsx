"use client";

import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/ui/mini-navbar";
import Image from "next/image";
import { Spinner } from "@/components/ui/spinner";
import { useAuth, useClerk } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { PromptBox } from "./prompt-box";

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
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();

  const baseSubtitlePrefix = "The AI Fullstack Engineer. Create beautiful, production-ready";
  const subtitleWordsRef = useRef<string[]>([
    "website.",
    "web app.",
    "internal tool.",
    "mobile app.",
    "landing page.",
    "dashboard.",
  ]);
  const [animatedSubtitleWord, setAnimatedSubtitleWord] = useState<string>("website.");
  const subtitleTypingStateRef = useRef({
    wordIndex: 0,
    charIndex: 0,
    deleting: false,
    running: true,
  });

  const subtitleTimersRef = useRef<number[]>([]);

  useEffect(() => {
    subtitleTypingStateRef.current.running = true;
    const typeSpeed = 150;
    const deleteSpeed = 100;
    const pauseAtEnd = 2000;
    const pauseBetween = 800;

    function schedule(fn: () => void, delay: number) {
      const id = window.setTimeout(fn, delay);
      subtitleTimersRef.current.push(id);
    }

    function clearTimers() {
      for (const id of subtitleTimersRef.current) window.clearTimeout(id);
      subtitleTimersRef.current = [];
    }

    function step() {
      if (!subtitleTypingStateRef.current.running) return;

      const state = subtitleTypingStateRef.current;
      const words = subtitleWordsRef.current;
      const current = words[state.wordIndex % words.length] || "";

      if (!state.deleting) {
        const nextIndex = state.charIndex + 1;
        const next = current.slice(0, nextIndex);
        setAnimatedSubtitleWord(next);
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
        setAnimatedSubtitleWord(next);
        state.charIndex = nextIndex;
        if (nextIndex <= 0) {
          state.deleting = false;
          state.wordIndex = (state.wordIndex + 1) % words.length;
          schedule(step, pauseBetween);
        } else {
          schedule(step, deleteSpeed);
        }
      }
    }

    clearTimers();
    schedule(step, 400);
    return () => {
      subtitleTypingStateRef.current.running = false;
      clearTimers();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className={["relative w-full h-screen bg-white", className].filter(Boolean).join(" ")}
      aria-label="Hero section"
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/home-hero-bg.webp"
          alt="Thinksoft home background"
          fill
          priority
          sizes="100vw"
          unoptimized
          className="object-cover"
        />
      </div>
      <div className="absolute inset-0 z-[1] bg-black/5" />
      <Navbar variant="home" />
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-6">
        <div className="max-w-3xl w-full text-center pointer-events-auto">
          <h1 className="text-white text-4xl sm:text-6xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-white mt-3 sm:mt-4 text-sm sm:text-base flex flex-wrap items-baseline justify-center whitespace-pre-wrap">
            <span>{baseSubtitlePrefix} </span>
            <span className="relative inline-flex items-baseline">
              <span className="text-white min-w-[4px] border-b-2 border-white pb-0.5">
                {animatedSubtitleWord}
              </span>
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="inline-block w-[2.5px] h-[1.1em] bg-white ml-0.5 translate-y-[2px]"
              />
            </span>
          </p>
          <div className="mt-6 sm:mt-8 flex items-center justify-center">
            <div className="relative w-full sm:w-[720px] pointer-events-auto">
              <PromptBox
                placeholder="What can i build for you today ."
                isLoading={isLoading}
                showMic={false}
                showTools={false}
                onPromptSubmit={async (val) => {
                  if (!isSignedIn) {
                    openSignIn();
                    return;
                  }

                  if (!isLoading && val.trim()) {
                    try {
                      setIsLoading(true);
                      await onPromptSubmit?.(val);
                    } catch (error) {
                      console.error('Prompt submission failed', error);
                      setIsLoading(false);
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
