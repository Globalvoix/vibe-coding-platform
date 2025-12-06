'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Navbar } from "@/components/ui/mini-navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    pro: 'https://thinksoft.lemonsqueezy.com/buy/5c4b6ae1-8fcf-4a2f-8c64-4f8d2a866262',
    business: 'https://thinksoft.lemonsqueezy.com/buy/0476f9d8-cc5e-4c77-8916-e918e815a141?discount=0',
    enterprise: 'https://thinksoft.lemonsqueezy.com/buy/1988f037-ac3e-4434-9a34-85ee271d18b5?discount=0',
  }

  const plans = [
    {
      id: 'free',
      name: "Free",
      price: "$0/mo",
      description: "Get started with AI-generated frontends and a single workspace.",
      features: [
        "20 credits per month",
        "Up to 3 apps/workspaces",
        "1 database creation per month",
        "Basic frontend generation",
      ],
      highlight: false,
    },
    {
      id: 'pro',
      name: "Pro",
      price: "$15/mo",
      description: "For individual builders shipping advanced frontends every week.",
      features: [
        "200 credits per month",
        "Up to 10 apps/workspaces",
        "Up to 10 database creations per month",
        "Advanced frontend generation",
      ],
      highlight: true,
    },
    {
      id: 'business',
      name: "Business",
      price: "$50/mo",
      description: "For teams running multiple products and environments.",
      features: [
        "1000 credits per month",
        "Up to 30 apps/workspaces per month",
        "Up to 30 database creations per month",
        "Advanced frontend generation",
      ],
      highlight: false,
    },
    {
      id: 'enterprise',
      name: "Enterprise",
      price: "$499/mo",
      description: "For organizations that need custom limits and enterprise guarantees.",
      features: [
        "10000 credits per month",
        "Unlimited apps/workspaces per month",
        "Unlimited database creations per month",
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
      <Navbar />
      <main className="min-h-screen bg-white flex flex-col items-center pt-32 pb-16 px-4">
        <section className="w-full max-w-5xl text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
            Pricing
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-600">
            Choose the plan that fits how you build with Thinksoft.
          </p>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Each US dollar of AI gateway usage is mapped to 20 Thinksoft credits for transparent, usage-based billing.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white shadow-sm px-5 py-6 text-left ${
                  plan.highlight
                    ? "border-blue-600 shadow-md"
                    : "border-gray-200"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-gray-900">
                      {plan.name}
                    </h2>
                    {isUserOnPlan(plan.id) && (
                      <Badge variant="default" className="text-xs">
                        Current Plan
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">
                    {plan.price}
                  </p>
                  <p className="mt-2 text-xs text-gray-600">
                    {plan.description}
                  </p>
                  <ul className="mt-4 space-y-1 text-xs text-gray-700">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-blue-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => handleGetStarted(plan.id)}
                  className="mt-6 w-full text-xs"
                  variant={plan.highlight ? "default" : "outline"}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : isUserOnPlan(plan.id) ? 'Current Plan' : 'Get started'}
                </Button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
