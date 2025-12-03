import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Navbar } from "@/components/ui/mini-navbar";

export default function PricingPage() {
  const plans = [
    {
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
      name: "Pro",
      price: "$29/mo",
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
      name: "Business",
      price: "$99/mo",
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
      name: "Enterprise",
      price: "Contact sales",
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

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-2xl border bg-white shadow-sm px-5 py-6 text-left ${
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
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
