"use client";

import React, { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/ui/mini-navbar";
import Image from "next/image";
import { Spinner } from "@/components/ui/spinner";
import { Plus, X } from "lucide-react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { uploadImageToSupabase, deleteImageFromSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

export type UploadedImage = {
  url: string;
  name: string;
};

export type HeroWaveProps = {
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  buttonText?: string;
  onPromptSubmit?: (value: string, images?: UploadedImage[]) => void;
};

export function HeroWave({
  className,
  style,
  title = "Thinksoft",
  subtitle = "The AI Fullstack Engineer. Create beautiful, production-ready websites",
  placeholder = "Describe what you want to create...",
  buttonText = "Generate",
  onPromptSubmit,
}: HeroWaveProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isSignedIn, userId } = useAuth();
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
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <Image
          src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Fb5a609c4244d4c71b2dcf5fa87e9858c?format=webp&width=1600"
          alt="Thinksoft blue gradient background"
          fill
          priority
          className="object-cover"
        />
      </div>
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
            onSubmit={async (e) => {
              e.preventDefault();

              if (!isSignedIn) {
                openSignIn();
                return;
              }

              if (!isLoading && (prompt.trim() || uploadedImages.length > 0)) {
                try {
                  setIsLoading(true);
                  await onPromptSubmit?.(prompt, uploadedImages.length > 0 ? uploadedImages : undefined);
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
              {uploadedImages.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {uploadedImages.map((image) => (
                    <div
                      key={image.url}
                      className="relative group inline-block rounded-lg overflow-hidden border border-gray-200"
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="h-20 w-20 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(image.url)}
                        className="absolute top-1 right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative rounded-2xl p-[2px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] bg-gradient-to-br from-gray-50 to-gray-100">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={animatedPlaceholder}
                  rows={5}
                  disabled={isLoading || isUploading}
                  className="w-full h-32 sm:h-36 resize-none rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 outline-none focus:outline-none px-4 py-4 pr-16 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isLoading}
                  aria-label="Upload images"
                  className="absolute left-3 bottom-3 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <Spinner size="sm" color="currentColor" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
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
