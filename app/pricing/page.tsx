'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Navbar } from "@/components/ui/mini-navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logos3 } from "@/components/ui/logos3";
import Image from "next/image";
import { cn } from "@/lib/utils";

const logos = [
  {
    id: "logo-1",
    description: "Nvidia",
    image: "https://svgl.app/library/nvidia-wordmark-light.svg",
    className: "h-5 w-auto",
  },
  {
    id: "logo-2",
    description: "Supabase",
    image: "https://svgl.app/library/supabase_wordmark_light.svg",
    className: "h-5 w-auto",
  },
  {
    id: "logo-3",
    description: "OpenAI",
    image: "https://svgl.app/library/openai_wordmark_light.svg",
    className: "h-5 w-auto",
  },
  {
    id: "logo-4",
    description: "Turso",
    image: "https://svgl.app/library/turso-wordmark-light.svg",
    className: "h-5 w-auto",
  },
  {
    id: "logo-5",
    description: "Vercel",
    image: "https://svgl.app/library/vercel_wordmark.svg",
    className: "h-5 w-auto",
  },
  {
    id: "logo-6",
    description: "GitHub",
    image: "https://svgl.app/library/github_wordmark_light.svg",
    className: "h-5 w-auto",
  },
  {
    id: "logo-7",
    description: "Claude AI",
    image: "https://svgl.app/library/claude-ai-wordmark-icon_light.svg",
    className: "h-5 w-auto",
  },
  {
    id: "logo-8",
    description: "Clerk",
    image: "https://svgl.app/library/clerk-wordmark-light.svg",
    className: "h-5 w-auto",
  },
];

interface UserSubscription {
  plan_id: string
  status: string
}

export default function PricingPage() {
  const router = useRouter()
  const { user, isSignedIn } = useUser()
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Checkout links for Lemon Squeezy
  const checkoutLinks: Record<string, string> = {
    pro: 'https://thinksoft.lemonsqueezy.com/buy/ea0e1501-3012-4c88-8e63-ac594da0018a?discount=0',
    business: 'https://thinksoft.lemonsqueezy.com/buy/44d1ea32-a735-49b6-bbcf-412a4427f354?discount=0',
    enterprise: 'https://thinksoft.lemonsqueezy.com/buy/4d1f1fd1-bf49-4e12-9b92-7dc29f18c349?discount=0',
  }

  const plans = [
    {
      id: 'free',
      tierName: "Starter",
      name: "Free",
      credits: "20 credits/mo",
      price: "$0",
      priceSub: "/mo",
      description: "Get started with AI-generated frontends and a single workspace.",
      features: [
        "20 credits per month",
        "Up to 5 apps/workspaces",
        "Unlimited database creations",
        "Basic frontend generation",
      ],
      highlight: false,
    },
    {
      id: 'pro',
      tierName: "Pro",
      name: "$15",
      credits: "200 credits/mo",
      price: "$15",
      priceSub: "/mo",
      description: "For individual builders shipping advanced frontends every week.",
      features: [
        "200 credits per month",
        "Unlimited apps/workspaces",
        "Unlimited database creations",
        "Advanced frontend generation",
      ],
      highlight: true,
    },
    {
      id: 'business',
      tierName: "Business",
      name: "$50",
      credits: "600 credits/mo",
      price: "$50",
      priceSub: "/mo",
      description: "For teams running multiple products and environments.",
      features: [
        "600 credits per month",
        "Unlimited apps/workspaces",
        "Unlimited database creations",
        "Advanced frontend generation",
      ],
      highlight: false,
    },
    {
      id: 'enterprise',
      tierName: "Enterprise",
      name: "$500",
      credits: "6000 credits/mo",
      price: "$500",
      priceSub: "/mo",
      description: "For organizations that need custom limits and enterprise guarantees.",
      features: [
        "6000 credits per month",
        "Unlimited apps/workspaces",
        "Unlimited database creations",
        "Enterprise-grade frontend generation",
      ],
      highlight: false,
    },
  ];

  // Fetch user's current subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!isSignedIn) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch('/api/user/subscription')
        if (response.ok) {
          const data = await response.json()
          setUserSubscription(data.subscription)
        }
      } catch (error) {
        console.error('Error fetching subscription:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubscription()
  }, [isSignedIn])

  const handleGetStarted = (planId: string) => {
    // Free plan doesn't need checkout
    if (planId === 'free') {
      if (!isSignedIn) {
        router.push('/sign-in')
        return
      }
      router.push('/home')
      return
    }

    // For paid plans, redirect to sign in if not signed in
    if (!isSignedIn) {
      router.push('/sign-in')
      return
    }

    // Redirect to Lemon Squeezy checkout with user ID in custom field
    const checkoutUrl = new URL(checkoutLinks[planId as keyof typeof checkoutLinks])
    if (user?.id) {
      checkoutUrl.searchParams.append('checkout[custom][user_id]', user.id)
    }
    window.location.href = checkoutUrl.toString()
  }

  const isUserOnPlan = (planId: string): boolean => {
    if (!userSubscription) return false
    return userSubscription.plan_id === planId && userSubscription.status === 'active'
  }

  return (
    <>
      <AppSidebar />
      <Navbar variant="home" theme="dark" />
      <main className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center pt-24 pb-16 px-4 sm:px-6">
        {/* Background Image - Covers whole screen */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F63183a6ea4af49f285c3f4964b93e64d?format=webp&width=4000"
            alt="Pricing background"
            fill
            priority
            sizes="100vw"
            quality={100}
            className="object-cover"
            unoptimized
          />
        </div>

        <section className="relative z-10 w-full max-w-6xl">
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-3">
              Pricing
            </h1>
            <p className="text-base sm:text-lg text-white/90">
              Start for free. Upgrade as you go.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-3xl bg-white p-6 transition-all hover:scale-[1.01] duration-300",
                  plan.highlight ? "ring-2 ring-white/30 shadow-xl" : "shadow-lg"
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      {plan.tierName}
                    </span>
                    <span className="text-[10px] font-bold text-[#00D1FF] uppercase tracking-wider">
                      {plan.credits}
                    </span>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-4xl font-bold text-gray-900 tracking-tighter">
                        {plan.name}
                      </span>
                      {plan.priceSub && (
                        <span className="text-[10px] font-medium text-gray-400">
                          {plan.priceSub}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-[11px] font-medium text-gray-500 h-10 leading-relaxed">
                      {plan.description}
                    </p>
                  </div>

                  <Button
                    onClick={() => handleGetStarted(plan.id)}
                    className={cn(
                      "w-full h-10 rounded-lg text-xs font-bold mb-8 transition-colors",
                      plan.highlight 
                        ? "bg-blue-600 text-white hover:bg-blue-700" 
                        : "bg-black text-white hover:bg-black/90"
                    )}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : isUserOnPlan(plan.id) ? 'Current Plan' : 'Get Started'}
                  </Button>

                  <div className="space-y-4">
                    <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                      What you get
                    </h3>
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <svg
                            className="w-3.5 h-3.5 text-gray-900 shrink-0 mt-0.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 4V20M4 12H20"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            <path
                              d="M12 4L12 20M4 12L20 12"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              transform="rotate(45 12 12)"
                            />
                          </svg>
                          <span className="text-[11px] font-medium text-gray-600 leading-tight">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <section className="w-full bg-white py-10 sm:py-12">
        <Logos3
          heading="Trusted by 101K+ users in 80+ countries"
          logos={logos}
          className="w-full"
        />
      </section>
    </>
  );
}
