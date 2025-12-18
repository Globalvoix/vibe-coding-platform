# Premium SaaS Landing Page Design Guide (Cluely-style)

**Goal**: Build sophisticated SaaS landing pages that feel premium, cinematic, and credible—like Cluely.com, Linear.com, Vercel.com, Stripe.com.

Not generic marketing sites. **Intentional, high-conversion landing experiences.**

---

## Core Principles: Premium SaaS Design

### 1. Clarity Over Decoration
- Every section answers: "What is the benefit?" not "What is the product?"
- Hero: **Problem/Solution narrative**, not feature dump
- Features: **Customer benefits**, not technical details
- CTA: **Clear, obvious, repeated**

### 2. Visual Hierarchy: What to See First
- H1 headline: Largest, boldest, customer-focused ("Ship faster," "Sell more," "Scale effortlessly")
- Subheading: Clarifies the benefit (smaller, secondary color)
- CTA: Prominent, high contrast, impossible to miss
- Secondary content: Supports the narrative

### 3. Whitespace as Design
- Sections separated by 80-120px vertical margin (desktop)
- Breathing room between elements
- NOT "fill every pixel"
- Professional = spacious

### 4. Motion (Scroll Reveals Only)
- Fade-in on scroll: Subtle, 300-400ms, staggered
- Slide-up on scroll: Content enters from bottom, natural
- Parallax: MINIMAL, only on hero (0.3-0.5x speed)
- NO rotating elements, NO bouncing, NO excessive effects
- All animations respect `prefers-reduced-motion`

---

## Anatomy: Section-by-Section Breakdown

### SECTION 1: HERO (0-100vh)

**Purpose**: Hook attention, clarify the problem, show the solution, CTA.

#### Layout Structure
```
┌─────────────────────────────────┐
│          NAVIGATION             │  (sticky, minimal)
├─────────────────────────────────┤
│                                 │
│      Problem Headline (H1)      │  (bold, 2.5-3.5rem, centered or left)
│                                 │
│      Subheading/Benefit (H2)    │  (secondary, 1.25-1.5rem, 60-char max)
│                                 │
│  [Primary CTA]  [Secondary CTA] │
│                                 │
│  ┌───────────────────────────┐  │
│  │   Hero Image/Video/       │  │  (background or right-aligned, fills 50% width)
│  │   Mockup                  │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

#### Typography
- **H1**: 2.5rem (40px) - 3.5rem (56px), weight: 700-800
- **H2**: 1.25rem (20px) - 1.5rem (24px), weight: 400-500, secondary color
- **Line height**: 1.1 for headlines, 1.6 for subheadings
- **Letter spacing**: -0.02em for tight headlines, normal for body

#### Visual Elements
1. **Background**: Subtle gradient OR solid color + organic SVG shape (OR particle effect if brand is creative/tech)
   - Gradient example: Dark blue → slightly lighter blue (5-10% opacity difference)
   - NO harsh transitions, NO rainbow gradients
2. **Hero Image/Mockup/Video** (optional but recommended):
   - Product in action (browser mockup, phone mockup, illustration)
   - High-quality Unsplash imagery for context
   - OR demo video (15-30sec loop, muted autoplay)
   - Positioned right (desktop), below headline (mobile)
   - Shadow: subtle drop shadow (0 20px 40px rgba(0,0,0,0.1))
3. **CTA Buttons**:
   - Primary: High contrast, filled (brand color)
   - Secondary: Outlined or ghost style
   - Hover: Scale 1.02x, shadow elevation

#### Motion
- **Fade-in on load**: Hero content fades in, 300ms, staggered (headline, then subheading, then CTA, then image)
- **Button hover**: Subtle scale 1.02x + shadow elevation
- **No scroll animation** (hero is the entry point)

#### Color Palette Example (Premium Blue Tech)
```
Primary: #0066cc (blue)
Secondary: #6366f1 (indigo)
Accent: #10b981 (green, for success CTAs)
Neutral: #ffffff (bg), #f9fafb (light), #1f2937 (dark)
```

#### Code Structure (Next.js + Tailwind)
```tsx
export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-20 pb-32 md:pt-32 md:pb-48">
      {/* Navigation: sticky at top */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        {/* Logo, nav items, CTA */}
      </nav>

      <div className="container mx-auto px-4 flex flex-col lg:flex-row gap-8 items-center">
        {/* Left: Text Content */}
        <div className="lg:w-1/2 flex flex-col gap-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-gray-900">
            Build faster, ship smarter
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
            Empower your team to ship products that matter. Less time managing infrastructure, more time building.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all hover:scale-105">
              Start Building
            </button>
            <button className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Right: Hero Image */}
        <div className="lg:w-1/2">
          <div className="relative rounded-lg overflow-hidden shadow-2xl">
            <Image
              src="/hero-mockup.png"
              alt="Product"
              width={600}
              height={400}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

### SECTION 2: PROBLEM/SOLUTION (Scroll Reveal)

**Purpose**: Deepen problem awareness, showcase solution, build credibility.

#### Layout Structure
```
┌─────────────────────────────────┐
│  Problem: "The Old Way"         │  (headline + 3-4 pain points)
│  ┌──────┬──────┬──────┐         │
│  │ Pain │ Pain │ Pain │         │
│  │ Icon │ Icon │ Icon │         │
│  └──────┴──────┴──────┘         │
├─────────────────────────────────┤
│  Solution: "A Better Way"       │  (headline + 3-4 benefits)
│  ┌──────┬──────┬──────┐         │
│  │ Bene │ Bene │ Bene │         │
│  │ Icon │ Icon │ Icon │         │
│  └──────┴──────┴──────┘         │
└─────────────────────────────────┘
```

#### Motion
- **Scroll reveal**: Content fades in as it enters viewport
- **Stagger timing**: Each column/item animates in sequence (100ms apart)
- **Duration**: 500-600ms per item

#### Color
- Problem section: Subtle red/orange tint (5% opacity)
- Solution section: Green/blue tint
- Icons: Brand color + secondary color (gradient icons optional)

#### Code Pattern
```tsx
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

export default function ProblemSolution() {
  const { ref, inView } = useInView({ threshold: 0.2 });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section ref={ref} className="py-24 md:py-40 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Problem Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="mb-24"
        >
          <h2 className="text-4xl font-bold text-center mb-16">The Old Way is Broken</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {problems.map((item, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="p-6 bg-white rounded-lg border border-gray-200"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Solution Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          <h2 className="text-4xl font-bold text-center mb-16">A Better Way</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {solutions.map((item, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

---

### SECTION 3: FEATURES/HOW IT WORKS (Sticky Sidebar + Content)

**Purpose**: Show product in action, feature by feature.

#### Layout: Sticky Sidebar (Desktop) OR Accordion (Mobile)
```
Desktop:
┌──────────────────────────────────────────┐
│ Feature 1 ← [Product Screenshot]         │
│ Feature 2                                │ (sidebar sticky, image scrolls)
│ Feature 3                                │
│ Feature 4                                │
└──────────────────────────────────────────┘

Mobile:
┌────────────────────────────────┐
│ Feature 1 [expand]             │
│ ├─ Feature 1 description       │
│ ├─ Feature 1 image             │
│ Feature 2 [expand]             │
│ Feature 3 [expand]             │
└────────────────────────────────┘
```

#### Motion
- Desktop: Content scrolls, sidebar remains sticky with indicator showing current section
- Mobile: Accordion expand/collapse (150ms animation)
- On scroll to each section: Active highlight in sidebar moves down smoothly

#### Code Pattern (Simplified)
```tsx
export default function Features() {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <section className="py-24 md:py-40 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Left: Sticky Sidebar */}
          <div className="md:sticky md:top-32 h-fit">
            <div className="flex flex-col gap-4">
              {features.map((feature, i) => (
                <motion.button
                  key={i}
                  onClick={() => setActiveFeature(i)}
                  className={`text-left p-4 rounded-lg transition-all ${
                    activeFeature === i
                      ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-900'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                  whileHover={{ x: 4 }}
                >
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Right: Feature Content */}
          <motion.div
            key={activeFeature}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="md:block"
          >
            <div className="rounded-lg overflow-hidden shadow-lg">
              <Image
                src={features[activeFeature].image}
                alt={features[activeFeature].title}
                width={600}
                height={400}
                className="w-full"
              />
            </div>
            <p className="text-gray-700 mt-6 leading-relaxed">
              {features[activeFeature].fullDescription}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
```

---

### SECTION 4: SOCIAL PROOF (Testimonials with Scroll Animation)

**Purpose**: Build credibility, show real customer wins.

#### Layout
```
┌────────────────────────────────────────────┐
│  Customer Testimonials                     │
│  ┌──────────┬──────────┬──────────┐        │
│  │ Quote 1  │ Quote 2  │ Quote 3  │        │ (horizontal scroll or grid)
│  │ Photo    │ Photo    │ Photo    │
│  │ Name     │ Name     │ Name     │
│  └──────────┴──────────┴──────────┘        │
│                                            │
│  Trust badges:                             │
│  [Logo]  [Logo]  [Logo]  [Logo]            │ (companies using product)
│                                            │
│  Stats:                                    │
│  [Number] [Number] [Number] [Number]       │ (e.g., "4000+ teams", "99.9% uptime")
└────────────────────────────────────────────┘
```

#### Design Details
- **Quote cards**: White background, left border accent (brand color), subtle shadow
- **Photo**: Circular (avatar style), 64x64px, border 2px brand color
- **Grid**: 1 col mobile, 3 cols desktop, gap 24px
- **Typography**: Quote is 18px, name is 14px semibold, title is 12px gray

#### Motion
- Fade-in on scroll: Each testimonial fades in as it enters viewport
- Stagger: 100ms between each
- Optional: Infinite scroll carousel with pause on hover

#### Code Pattern
```tsx
const testimonials = [
  {
    quote: "Reduced deployment time by 60%. Game changer.",
    name: "Sarah Chen",
    title: "Engineering Lead, TechCorp",
    photo: "/avatars/sarah.jpg",
  },
  // ... more testimonials
];

export default function Testimonials() {
  const { ref, inView } = useInView({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-24 md:py-40 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-16">Loved by Teams Worldwide</h2>

        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{
            visible: {
              transition: { staggerChildren: 0.1 },
            },
          }}
          className="grid md:grid-cols-3 gap-6"
        >
          {testimonials.map((item, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              className="bg-white p-6 rounded-lg border border-gray-200"
            >
              <p className="text-lg text-gray-900 mb-6 italic">"{item.quote}"</p>
              <div className="flex items-center gap-3">
                <Image
                  src={item.photo}
                  alt={item.name}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">{item.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
```

---

### SECTION 5: PRICING (Transparent, Clear Tiers)

**Purpose**: Show value, make pricing obvious, reduce friction.

#### Layout
```
┌──────────────────────────────────────────┐
│  Transparent Pricing                     │
│                                          │
│  ┌────────────┬────────────┬────────────┐ │
│  │ STARTER    │ PROFESSIONAL│ ENTERPRISE│ │
│  │ $29/mo     │ $99/mo     │ Custom    │ │
│  │            │            │           │ │
│  │ ✓ Feature1 │ ✓ Feature1 │ ✓ Feature1│ │
│  │ ✓ Feature2 │ ✓ Feature2 │ ✓ Feature2│ │
│  │ ✗ Feature3 │ ✓ Feature3 │ ✓ Feature3│ │
│  │ ✗ Feature4 │ ✗ Feature4 │ ✓ Feature4│ │
│  │            │            │           │ │
│  │ [CTA]      │ [CTA]      │ [CTA]     │ │
│  └────────────┴────────────┴────────────┘ │
│                                          │
│  Toggle: Monthly / Annual (save 20%)     │
│                                          │
│  FAQ below                               │
└──────────────────────────────────────────┘
```

#### Color
- Recommended tier: Highlighted with accent background or border
- Feature included: Green text or checkmark icon
- Feature not included: Gray text with X icon
- CTA: Primary color, filled button

#### Motion
- Pricing cards scale 1.05x on hover (if not recommended)
- Recommended card has subtle glow or animation effect
- Toggle switch: Smooth transition between monthly/annual

#### Code Pattern
```tsx
const plans = [
  {
    name: 'Starter',
    monthlyPrice: 29,
    annualPrice: 290,
    description: 'For individuals and small teams',
    features: [
      { name: 'Up to 10 projects', included: true },
      { name: 'Basic analytics', included: true },
      { name: 'Priority support', included: false },
      { name: 'Custom integrations', included: false },
    ],
    cta: 'Start Free Trial',
    recommended: false,
  },
  // ... more plans
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section className="py-24 md:py-40 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Choose the plan that fits your needs. All plans include a 14-day free trial.
        </p>

        {/* Toggle */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <span className={isAnnual ? 'text-gray-600' : 'text-gray-900 font-semibold'}>
            Monthly
          </span>
          <motion.button
            layout
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-200"
          >
            <motion.div
              layout
              className="h-7 w-7 rounded-full bg-white shadow-lg"
              animate={{ x: isAnnual ? 24 : 3 }}
            />
          </motion.button>
          <span className={isAnnual ? 'text-gray-900 font-semibold' : 'text-gray-600'}>
            Annual
          </span>
          {isAnnual && (
            <span className="ml-2 inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
              Save 20%
            </span>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className={`rounded-lg p-8 transition-all ${
                plan.recommended
                  ? 'border-2 border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                  : 'border border-gray-200 bg-white'
              }`}
            >
              {plan.recommended && (
                <div className="text-xs font-bold text-blue-600 mb-4 uppercase">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">
                  ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                </span>
                <span className="text-gray-600 ml-2">{isAnnual ? '/year' : '/month'}</span>
              </div>

              <button
                className={`w-full py-3 rounded-lg font-semibold mb-8 transition-all ${
                  plan.recommended
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-gray-300 text-gray-900 hover:bg-gray-50'
                }`}
              >
                {plan.cta}
              </button>

              <div className="space-y-4">
                {plan.features.map((feature, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <span
                      className={`mt-1 ${
                        feature.included
                          ? 'text-green-600 text-lg'
                          : 'text-gray-400 text-lg'
                      }`}
                    >
                      {feature.included ? '✓' : '×'}
                    </span>
                    <span
                      className={feature.included ? 'text-gray-900' : 'text-gray-500'}
                    >
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

### SECTION 6: FAQ (Accordion, Scroll Reveal)

**Purpose**: Answer objections, reduce friction to conversion.

#### Layout
```
┌──────────────────────────────────────┐
│  Frequently Asked Questions          │
│                                      │
│  Q: How is billing handled?          │  (accordion, click to expand)
│  ├─ A: We charge monthly by default. │
│  │    Annual plans save 20%.         │
│  │                                   │
│  Q: Is there a free trial?           │
│  A: Yes, 14 days, no credit card.    │  (expanded by default or collapsed)
│  │                                   │
│  Q: Can I cancel anytime?            │
│  A: Yes, cancel anytime.             │
│  └─ No hidden fees.                  │
│                                      │
└──────────────────────────────────────┘
```

#### Motion
- Accordion open/close: 300ms smooth expand/collapse
- Content fade-in: When accordion opens, content fades in
- Section scroll reveal: FAQ section fades in as it enters viewport

#### Code Pattern
```tsx
const faqs = [
  {
    question: 'How is billing handled?',
    answer: 'We charge monthly by default. Annual plans save you 20%.',
  },
  // ... more FAQs
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);
  const { ref, inView } = useInView({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-24 md:py-40 bg-gray-50">
      <div className="container mx-auto px-4 max-w-2xl">
        <h2 className="text-4xl font-bold text-center mb-16">Frequently Asked Questions</h2>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">{faq.question}</span>
                <motion.span
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-gray-600"
                >
                  ▼
                </motion.span>
              </button>

              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={
                  openIndex === i
                    ? { height: 'auto', opacity: 1 }
                    : { height: 0, opacity: 0 }
                }
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 text-gray-600">{faq.answer}</div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

### SECTION 7: FINAL CTA (Call to Action)

**Purpose**: Convert visitor to user. Last, most important section.

#### Layout
```
┌────────────────────────────────────────┐
│                                        │
│  Ready to Transform Your Workflow?     │  (H2, bold, centered)
│                                        │
│  [Primary CTA: Start Free Trial]       │
│  [Secondary: Schedule Demo]            │
│                                        │
│  ✓ No credit card required             │
│  ✓ 14 days free                        │
│  ✓ Full access to all features         │
│                                        │
└────────────────────────────────────────┘
```

#### Color
- Background: Subtle brand color (5% opacity) OR dark gradient
- CTA: High contrast, filled button (brand color)
- Text: Should be customer-benefit focused

#### Motion
- Fade-in on scroll
- CTA buttons: Hover scale 1.05x + shadow elevation
- Optional: Subtle pulse animation on primary button

---

## Global Navigation (Sticky Header)

```tsx
export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all ${
        isScrolled
          ? 'bg-white shadow-md border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="font-bold text-2xl">YourBrand</div>

        {/* Nav Items (hidden on mobile) */}
        <div className="hidden md:flex gap-8">
          <a href="#features" className="text-gray-700 hover:text-gray-900">Features</a>
          <a href="#pricing" className="text-gray-700 hover:text-gray-900">Pricing</a>
          <a href="#testimonials" className="text-gray-700 hover:text-gray-900">Customers</a>
          <a href="#faq" className="text-gray-700 hover:text-gray-900">FAQ</a>
        </div>

        {/* CTA */}
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Get Started
        </button>
      </div>
    </nav>
  );
}
```

---

## Complete Checklist: Premium SaaS Landing

Before shipping, verify:

### Content
- [ ] Hero headline is benefit-focused, not feature-focused
- [ ] Subheading clarifies the problem
- [ ] Social proof is credible (real customers, real logos)
- [ ] Pricing is transparent (no hidden fees)
- [ ] FAQ answers objections
- [ ] All CTAs are clear and obvious

### Design
- [ ] Typography hierarchy is strong (headlines are prominent)
- [ ] Whitespace is generous (sections clearly separated)
- [ ] Color palette has restraint (1-2 accent colors)
- [ ] Contrast meets WCAG AAA (7:1)
- [ ] No unnecessary gradients or decorations
- [ ] Responsive design (works on mobile, tablet, desktop)

### Motion
- [ ] Scroll reveals are subtle (300-400ms, fade-in + slide)
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Button hover states are smooth (1.02x scale)
- [ ] No rotating, bouncing, or excessive effects

### Performance
- [ ] Images optimized (WebP, correct size, lazy-loaded)
- [ ] Video is muted autoplay (mobile-friendly)
- [ ] Bundle size is reasonable (<200KB initial JS)
- [ ] Page loads in <3s on 4G
- [ ] Lighthouse score >90

### Conversion
- [ ] Primary CTA appears above the fold
- [ ] CTA appears at least 3 times (hero, features, pricing, final)
- [ ] Forms are minimal (email + password max)
- [ ] Trust signals are visible (logos, testimonials, guarantees)
- [ ] No unnecessary popup modal s

---

## Design Inspiration Sources

Study these for patterns, NOT to copy verbatim:
- **Vercel.com**: Navigation, hero, testimonials, pricing
- **Linear.com**: Features section, typography, color restraint
- **Stripe.com**: Simplicity, trust signals, footer
- **Cluely.com**: Scroll animations, sticky sections, product mockups
- **Supabase.com**: Hero with video, feature grid, pricing
- **Figma.com**: Product showcase, testimonials

---

## Quick Implementation Path

1. **Hero**: Problem headline + subheading + CTA + mockup
2. **Problem/Solution**: 3 columns problem, 3 columns solution
3. **Features**: Sticky sidebar with 4-5 key features
4. **Testimonials**: 3 testimonial cards with photos
5. **Pricing**: 3 pricing tiers with feature comparison
6. **FAQ**: 5-7 common questions
7. **Final CTA**: Reinforces offer + benefits
8. **Navigation**: Sticky header with nav items + CTA

**Time to build**: 4-6 hours for a polished landing page.

---

## Notes for AI Agents

- **DO** use this guide to build premium SaaS landing pages
- **DO** include scroll reveals (fade-in, slide-up) for every section
- **DO** use sticky navigation and feature sidebars
- **DO** include social proof and testimonials
- **DO** respect `prefers-reduced-motion` for all animations
- **DON'T** add unnecessary 3D effects or particle animations
- **DON'T** use harsh gradients or neon colors
- **DON'T** forget mobile responsiveness
- **DON'T** make CTA buttons hard to find
- **DON'T** fill page with too much content; whitespace is premium design
