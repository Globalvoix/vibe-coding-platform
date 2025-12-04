'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Navbar } from "@/components/ui/mini-navbar";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react'
import { CheckoutOverlay } from '@/components/checkout-overlay'

export default function PricingPage() {
  const router = useRouter()
  const { user, isSignedIn } = useUser()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string } | null>(null)

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

    // Open checkout overlay for paid plans
    const planName = plans.find(p => p.id === planId)?.name || 'Plan'
    setSelectedPlan({ id: planId, name: planName })
    setCheckoutOpen(true)
  }

  return (
    <>
      <AppSidebar />
      <Navbar />
      {selectedPlan && (
        <CheckoutOverlay
          isOpen={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          planId={selectedPlan.id}
          planName={selectedPlan.name}
        />
      )}
      <main className="min-h-screen bg-white flex flex-col items-center pt-32 pb-16 px-4">
        <section className="w-full max-w-5xl text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
            Pricing
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-600">
            Choose the plan that fits how you build with Thinksoft.
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
                <h2 className="text-base font-semibold text-gray-900">
                  {plan.name}
                </h2>
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
                <Button
                  onClick={() => handleGetStarted(plan.id)}
                  className="mt-6 w-full text-xs"
                  variant={plan.highlight ? "default" : "outline"}
                >
                  Get started
                </Button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
