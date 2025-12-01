# Enterprise UI Patterns & Code Examples

This document provides ready-to-implement patterns for world-class UI generation.

## 1. Hero Section with Scroll Parallax

```tsx
// components/hero.tsx
'use client'

import Image from 'next/image'
import { useScroll, useTransform, motion } from 'framer-motion'
import { useRef } from 'react'

export function HeroWithParallax() {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 100])
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.3, 0.7])

  return (
    <section ref={containerRef} className="relative h-screen overflow-hidden">
      <motion.div style={{ y: imageY }} className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-..."
          alt="Hero background - Photo by Photographer Name"
          fill
          className="object-cover"
          priority
        />
      </motion.div>

      <motion.div
        style={{ opacity: overlayOpacity }}
        className="absolute inset-0 bg-black"
      />

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-bold mb-6"
        >
          Stunning Visual Experience
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xl md:text-2xl mb-8 max-w-2xl"
        >
          Build beautiful, responsive applications with enterprise-grade quality
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-white text-black px-8 py-3 rounded-lg font-semibold hover:shadow-xl transition-shadow"
        >
          Get Started
        </motion.button>
      </div>
    </section>
  )
}
```

## 2. Feature Cards with Hover Effects

```tsx
// components/feature-cards.tsx
'use client'

import { motion } from 'framer-motion'
import { Zap, Globe, Shield } from 'lucide-react'

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Optimized performance for instant load times'
  },
  {
    icon: Globe,
    title: 'Global Scale',
    description: 'Deploy anywhere with enterprise reliability'
  },
  {
    icon: Shield,
    title: 'Secure',
    description: 'Enterprise-grade security and compliance'
  }
]

export function FeatureCards() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
    >
      {features.map((feature, index) => {
        const Icon = feature.icon
        return (
          <motion.div
            key={index}
            variants={itemVariants}
            whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
            className="bg-white p-8 rounded-xl border border-gray-200 cursor-pointer"
          >
            <motion.div
              whileHover={{ rotate: 12, scale: 1.1 }}
              className="mb-4"
            >
              <Icon className="w-12 h-12 text-blue-600" />
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
```

## 3. Scroll-Triggered Reveal Section

```tsx
// components/reveal-section.tsx
'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export function RevealSection({ children, delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay }}
    >
      {children}
    </motion.div>
  )
}

// Usage in page
export function Page() {
  return (
    <div className="space-y-20">
      <RevealSection>
        <h2 className="text-3xl font-bold">Section 1</h2>
      </RevealSection>

      <RevealSection delay={0.2}>
        <p className="text-lg text-gray-600">Content here</p>
      </RevealSection>
    </div>
  )
}
```

## 4. Gradient Button with Hover Effect

```tsx
// components/gradient-button.tsx
'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface GradientButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
}

export function GradientButton({ children, onClick, className = '' }: GradientButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden px-8 py-3 rounded-lg font-semibold text-white group ${className}`}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-100 group-hover:opacity-90 transition-opacity" />
      
      {/* Animated shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
        animate={{ x: ['100%', '-100%'] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {/* Content */}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}
```

## 5. Animated Loading Skeleton

```tsx
// components/skeleton-loader.tsx
'use client'

import { motion } from 'framer-motion'

export function SkeletonLoader() {
  const shimmer = {
    initial: { backgroundPosition: '200% center' },
    animate: { backgroundPosition: '-200% center' }
  }

  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          variants={shimmer}
          initial="initial"
          animate="animate"
          transition={{ duration: 2, repeat: Infinity }}
          className="h-12 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg"
          style={{ backgroundSize: '200% 100%' }}
        />
      ))}
    </div>
  )
}
```

## 6. 3D Product Showcase

```tsx
// components/3d-product.tsx
'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Suspense } from 'react'

const ProductModel = dynamic(() => import('./ProductModel'), { ssr: false })

export function Product3DShowcase() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="grid md:grid-cols-2 gap-12 max-w-6xl w-full px-4">
        {/* 3D Model */}
        <div className="h-96 md:h-full bg-white rounded-xl shadow-lg overflow-hidden">
          <Suspense fallback={<SkeletonLoader />}>
            <ProductModel />
          </Suspense>
        </div>

        {/* Product Info */}
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl font-bold mb-4">Premium Product</h1>
          <p className="text-lg text-gray-600 mb-6">
            Experience stunning 3D visualization of our products
          </p>
          <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-fit">
            Learn More
          </button>
        </div>
      </div>
    </section>
  )
}

// Fallback for reduced motion
export function ProductShowcaseFallback() {
  return (
    <div className="h-96 bg-white rounded-xl shadow-lg flex items-center justify-center">
      <Image
        src="https://images.unsplash.com/photo-..."
        alt="Product showcase"
        width={400}
        height={400}
        className="object-cover rounded-lg"
      />
    </div>
  )
}
```

## 7. Testimonials Section with Carousel

```tsx
// components/testimonials.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const testimonials = [
  {
    quote: 'Exceptional quality and attention to detail.',
    author: 'Sarah Johnson',
    role: 'CEO at TechCorp'
  },
  {
    quote: 'Transformed our business with modern design.',
    author: 'Michael Chen',
    role: 'Product Lead at StartupXYZ'
  },
  {
    quote: 'Best investment in our company\'s design.',
    author: 'Emma Davis',
    role: 'Founder at DesignStudio'
  }
]

export function Testimonials() {
  const [current, setCurrent] = useState(0)

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">What Clients Say</h2>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="bg-white p-8 rounded-xl shadow-lg"
            >
              <p className="text-lg text-gray-700 mb-4">"{testimonials[current].quote}"</p>
              <p className="font-semibold">{testimonials[current].author}</p>
              <p className="text-sm text-gray-600">{testimonials[current].role}</p>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => setCurrent((current - 1 + testimonials.length) % testimonials.length)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ChevronLeft />
            </button>
            <button
              onClick={() => setCurrent((current + 1) % testimonials.length)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
```

## 8. Animated Form with Validation

```tsx
// components/contact-form.tsx
'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Check } from 'lucide-react'

export function ContactForm() {
  const [formState, setFormState] = useState({ name: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Name Field */}
      <div>
        <input
          type="text"
          placeholder="Your Name"
          value={formState.name}
          onChange={(e) => setFormState({ ...formState, name: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
        />
      </div>

      {/* Email Field */}
      <div>
        <input
          type="email"
          placeholder="Your Email"
          value={formState.email}
          onChange={(e) => setFormState({ ...formState, email: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
        />
      </div>

      {/* Message Field */}
      <div>
        <textarea
          placeholder="Your Message"
          value={formState.message}
          onChange={(e) => setFormState({ ...formState, message: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors resize-none h-32"
        />
      </div>

      {/* Submit Button */}
      <motion.button
        type="submit"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors relative overflow-hidden"
      >
        {submitted ? (
          <motion.div className="flex items-center justify-center gap-2">
            <Check size={20} />
            <span>Message Sent!</span>
          </motion.div>
        ) : (
          'Send Message'
        )}
      </motion.button>
    </motion.form>
  )
}
```

## 9. Glassmorphism Card

```tsx
// components/glassmorphic-card.tsx
'use client'

import { motion } from 'framer-motion'

export function GlassmorphicCard() {
  return (
    <motion.div
      whileHover={{ y: -8, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      className="backdrop-blur-md bg-white/30 border border-white/40 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow"
    >
      <h3 className="text-2xl font-bold text-white mb-4">Glassmorphic Design</h3>
      <p className="text-white/80">
        Modern frosted glass effect with backdrop blur for premium visual appeal
      </p>
    </motion.div>
  )
}
```

## 10. Navbar with Scroll Animation

```tsx
// components/navbar.tsx
'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'

export function Navbar() {
  const { scrollY } = useScroll()
  const bgOpacity = useTransform(scrollY, [0, 100], [0, 1])
  const blur = useTransform(scrollY, [0, 100], [0, 10])

  return (
    <motion.nav
      style={{
        backgroundColor: `rgba(255, 255, 255, var(--bg-opacity))`,
        backdropFilter: blur.get() > 0 ? `blur(${blur.get()}px)` : 'none'
      }}
      className="sticky top-0 z-50 border-b border-gray-200"
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          Logo
        </Link>

        <ul className="flex gap-8">
          {['Features', 'Pricing', 'About', 'Contact'].map((item) => (
            <motion.li
              key={item}
              whileHover={{ color: '#3b82f6' }}
              className="text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
            >
              {item}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.nav>
  )
}
```

## 11. Price Comparison Table

```tsx
// components/pricing-table.tsx
'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Starter',
    price: '$29',
    features: ['10 Projects', 'Email Support', 'Basic Analytics']
  },
  {
    name: 'Pro',
    price: '$79',
    popular: true,
    features: ['Unlimited Projects', 'Priority Support', 'Advanced Analytics', 'API Access']
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Everything in Pro', 'Dedicated Support', 'Custom Integration', 'SLA Guarantee']
  }
]

export function PricingTable() {
  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {plans.map((plan, index) => (
        <motion.div
          key={plan.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.2 }}
          className={`rounded-xl p-8 ${plan.popular ? 'ring-2 ring-blue-600 shadow-xl' : 'border border-gray-200'}`}
        >
          <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
          <p className="text-3xl font-bold mb-6">{plan.price}</p>
          <ul className="space-y-3 mb-8">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <button className={`w-full py-2 rounded-lg font-semibold ${plan.popular ? 'bg-blue-600 text-white' : 'border border-gray-300'}`}>
            Get Started
          </button>
        </motion.div>
      ))}
    </div>
  )
}
```

## General Implementation Notes

1. **Always include Tailwind CSS** for styling consistency
2. **Import motion components** at component level, not page level
3. **Use dynamic imports** for heavy libraries (3D, Lottie)
4. **Test with prefers-reduced-motion** for accessibility
5. **Optimize images** with next/image and responsive sizes
6. **Lazy-load animations** for better performance
7. **Use TypeScript** for type safety
8. **Comment code** with design inspiration sources
9. **Test responsive behavior** across breakpoints
10. **Follow accessibility standards** (WCAG AA minimum)

These patterns provide a solid foundation for generating world-class, enterprise-grade UIs.
