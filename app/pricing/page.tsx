import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Navbar } from "@/components/ui/mini-navbar";

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "$0",
      description: "Experiment with AI-powered app generation and basic features.",
      features: [
        "Up to 3 workspaces",
        "Standard models",
        "Community support",
      ],
      highlight: false,
    },
    {
      name: "Pro",
      price: "$29/mo",
      description: "For builders who ship production-ready sites every week.",
      features: [
        "Unlimited workspaces",
        "Priority models and faster runs",
        "Shareable previews",
      ],
      highlight: true,
    },
    {
      name: "Team",
      price: "$79/mo",
      description: "Collaborate with your team on high-velocity projects.",
      features: [
        "Everything in Pro",
        "Team workspaces and roles",
        "Usage reporting",
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

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
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
