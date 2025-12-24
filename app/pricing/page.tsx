'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Navbar } from "@/components/ui/mini-navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserSubscription {
  plan_id: string
  status: string
}

export default function PricingPage() {
  const router = useRouter()
  const { user, isSignedIn } = useUser()
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

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
      tokens: "1M tokens",
      price: "$0",
      priceSub: "",
      description: "For getting started",
      features: [
        "1M tokens",
        "Public projects",
        "Data used to train our model",
        "Templates",
      ],
      highlight: false,
    },
    {
      id: 'pro',
      tierName: "Personal",
      name: "$25",
      tokens: "5M tokens",
      price: "$25",
      priceSub: "/m billed monthly",
      description: "For light, exploratory, and personal use",
      features: [
        "5M tokens",
        "Credit rollover",
        "Private projects",
        "Unlimited custom domains",
        "Code download",
        "Remove Rocket branding",
        "Opt out of data training",
        "Templates",
      ],
      highlight: false,
    },
    {
      id: 'business',
      tierName: "Rocket",
      name: "$50",
      tokens: "10.5M tokens",
      price: "$50",
      priceSub: "/m billed monthly",
      description: "For professional and frequent use",
      features: [
        "10.5M tokens (5% bonus tokens)",
        "Credit rollover",
        "Private projects",
        "Unlimited custom domains",
        "Code download",
        "Remove Rocket branding",
        "Opt out of data training",
        "Templates",
      ],
      highlight: true,
    },
    {
      id: 'enterprise',
      tierName: "Booster",
      name: "$100",
      tokens: "22M tokens",
      price: "$100",
      priceSub: "/m billed monthly",
      description: "For power users' daily use as core tool",
      features: [
        "22M tokens (10% bonus tokens)",
        "Credit rollover",
        "Private projects",
        "Unlimited custom domains",
        "Code download",
        "Remove Rocket branding",
        "Opt out of data training",
        "Templates",
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
      <main className="relative min-h-screen w-full overflow-hidden flex flex-col items-center pt-32 pb-24 px-4 sm:px-6">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F347f46b7c68b478a96530803a3da589f?format=webp&width=2000"
            alt="Pricing background"
            fill
            priority
            className="object-cover"
            unoptimized
          />
          {/* Subtle overlay to ensure text readability if needed, but the image looks good as is */}
          <div className="absolute inset-0 bg-black/10" />
        </div>

        <section className="relative z-10 w-full max-w-7xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-white mb-4">
              Pricing
            </h1>
            <p className="text-lg sm:text-xl text-white/90">
              Start for free. Upgrade as you go.
            </p>

            {/* Monthly/Yearly Toggle */}
            <div className="mt-10 flex items-center justify-center">
              <div className="bg-black/20 backdrop-blur-md p-1 rounded-xl flex items-center border border-white/10">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    "px-6 py-2 rounded-lg text-sm font-medium transition-all",
                    billingCycle === 'monthly'
                      ? "bg-white text-black shadow-sm"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={cn(
                    "px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                    billingCycle === 'yearly'
                      ? "bg-white text-black shadow-sm"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  Yearly
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-[2.5rem] bg-white p-8 transition-all hover:scale-[1.02] duration-300",
                  plan.highlight ? "ring-4 ring-white/20" : ""
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      {plan.tierName}
                    </span>
                    <span className="text-xs font-bold text-[#00D1FF] uppercase tracking-wider">
                      {plan.tokens}
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-6xl font-bold text-gray-900 tracking-tighter">
                        {plan.name}
                      </span>
                      {plan.priceSub && (
                        <span className="text-xs font-medium text-gray-500">
                          {plan.priceSub}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-xs font-medium text-gray-500 h-8">
                      {plan.description}
                    </p>
                  </div>

                  <Button
                    onClick={() => handleGetStarted(plan.id)}
                    className="w-full h-12 rounded-xl bg-black text-white hover:bg-black/90 transition-colors text-sm font-bold mb-10"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : isUserOnPlan(plan.id) ? 'Current Plan' : 'Get Started'}
                  </Button>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                      What you get
                    </h3>
                    <ul className="space-y-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <svg
                            className="w-4 h-4 text-gray-900 shrink-0 mt-0.5"
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
                          <span className="text-xs font-medium text-gray-700 leading-tight">
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
    </>
  );
}
