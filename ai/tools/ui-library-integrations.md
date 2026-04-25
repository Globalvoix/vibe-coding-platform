# Enterprise UI Library Integration Guide

This guide outlines how to integrate premium UI libraries and components into generated applications for world-class visual quality.

## Animation Libraries

### Framer Motion (Scroll & Micro-Interactions)
**Use Case**: Scroll animations, button hover effects, card transitions, page transitions
**Installation**: `pnpm add framer-motion`

```tsx
// Example: Scroll-triggered fade-in
import { useScroll, useTransform, motion } from 'framer-motion'
import { useRef } from 'react'

export function ScrollReveal({ children }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref })
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1])

  return (
    <motion.div ref={ref} style={{ opacity }}>
      {children}
    </motion.div>
  )
}
```

### Lenis (Smooth Scroll)
**Use Case**: Smooth, physics-based scroll behavior for entire page
**Installation**: `pnpm add lenis`

```tsx
// In app/layout.tsx
import { ReactLenis } from 'lenis/react'

export default function RootLayout({ children }) {
  return (
    <ReactLenis root>
      {children}
    </ReactLenis>
  )
}
```

### Lottie React (Animated Icons)
**Use Case**: Animated icons from LottieLab, loading animations, celebration effects
**Installation**: `pnpm add lottie-react`

```tsx
import Lottie from 'lottie-react'
import animationData from './animation.json'

export function AnimatedIcon() {
  return (
    <Lottie
      animationData={animationData}
      loop
      style={{ width: 100, height: 100 }}
    />
  )
}
```

## 3D & Graphics Libraries

### React Three Fiber + Three.js
**Use Case**: 3D product displays, rotating icons, particle effects, immersive backgrounds
**Installation**: `pnpm add @react-three/fiber three @react-three/drei`

```tsx
import { Canvas } from '@react-three/fiber'
import { dynamic } from 'next/dynamic'

// Lazy-load 3D component
const Model = dynamic(() => import('./Model'), { ssr: false })

export function Product3D() {
  return (
    <Canvas>
      <Model />
    </Canvas>
  )
}
```

### Three-stdlib
**Use Case**: Advanced shaders, material effects, post-processing
**Installation**: `pnpm add three-stdlib`

## Component Libraries

### ShadCN/UI
**Use Case**: High-quality, accessible, unstyled components
**Source**: https://shadcn.com/ui
**Components to Extract**:
- Button with variants (outline, ghost, etc.)
- Card components with proper spacing
- Select/Dropdown with smooth animations
- Toast/Toast notifications
- Dialog/Modal with proper accessibility

```tsx
// Example integration
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function Dashboard() {
  return (
    <Card className="p-6">
      <Button variant="outline">Click me</Button>
    </Card>
  )
}
```

### MagicUI Components
**Use Case**: Pre-built animated components (gradient buttons, animated cards, particles)
**Source**: https://magicui.design
**Popular Components**:
- Gradient button with animated background
- Animated card with hover lift effect
- Particle background effect
- Animated text reveal
- Gradient mesh background
- Smooth text animation

**Integration Pattern**:
1. Visit magicui.design
2. Copy the component code
3. Customize colors, sizes, animations to match user intent
4. Integrate into application structure

### ReactBits Components
**Use Case**: Beautiful, production-ready component designs
**Source**: https://reactbits.dev
**Popular Components**:
- Feature cards with icons
- Pricing tables with hover effects
- Team member cards
- Testimonial sliders
- Feature comparison tables
- Hero sections with CTA

### Unicorn Studio
**Use Case**: Animation-first interactive components
**Source**: https://unicorn.studio
**Features**:
- Interactive component previews
- Export to React code
- Customizable animations
- Micro-interaction patterns

## Icon Libraries & Strategies

### Lucide React
**Use Case**: System icons for consistent, lightweight SVGs
**Installation**: `pnpm add lucide-react`

```tsx
import { Menu, Search, Heart } from 'lucide-react'

export function Navigation() {
  return (
    <nav>
      <Menu size={24} className="text-gray-700" />
      <Search size={24} />
      <Heart size={24} />
    </nav>
  )
}
```

### Custom SVG Icons
**Use Case**: Brand icons, unique designs with gradients
**Pattern**:
```tsx
// components/icons/CustomIcon.tsx
export function CustomIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff6b6b" />
          <stop offset="100%" stopColor="#ff8e72" />
        </linearGradient>
      </defs>
      <path d="..." fill="url(#grad1)" />
    </svg>
  )
}
```

### Lottie Lab Animated Icons
**Use Case**: Animated icon variations (checkmark, loading, success states)
**Source**: https://lottielab.com
**Pattern**: Export as JSON, use with lottie-react

## Image & Video Handling

### Next Image Optimization
**Use Case**: High-quality, responsive images with automatic optimization
**Source**: Unsplash (https://unsplash.com)

```tsx
import Image from 'next/image'

export function HeroImage() {
  return (
    <Image
      src="https://images.unsplash.com/photo-..."
      alt="Product showcase - Photo by John Doe"
      width={1200}
      height={600}
      className="w-full h-auto object-cover rounded-lg"
      priority
    />
  )
}
```

### Video Backgrounds
**Use Case**: Hero sections, immersive backgrounds
**Pattern**:
```tsx
export function VideoBackground() {
  return (
    <video
      autoPlay
      muted
      loop
      className="absolute inset-0 w-full h-full object-cover"
    >
      <source src="/background.mp4" type="video/mp4" />
    </video>
  )
}
```

## Scroll Animation Patterns

### Parallax on Scroll
**Libraries**: framer-motion + Lenis

```tsx
import { useScroll, useTransform, motion } from 'framer-motion'

export function ParallaxHero() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 150])

  return (
    <motion.div style={{ y }} className="relative h-screen overflow-hidden">
      {/* Hero content */}
    </motion.div>
  )
}
```

### Reveal on Scroll
**Libraries**: framer-motion + Intersection Observer

```tsx
export function RevealOnScroll({ children }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.div>
  )
}
```

## Shader & Advanced Effects

### Canvas-Based Shaders
**Libraries**: three.js + react-use-gesture

**Pattern**:
1. Use Three.js to create shader material
2. Apply to plane or background
3. Animate with mouse input or time
4. Provide static image fallback

```tsx
// Example: Animated gradient shader
const fragmentShader = `
  varying vec2 vUv;
  uniform float time;

  void main() {
    vec3 color = vec3(sin(vUv.x + time) * 0.5 + 0.5, cos(vUv.y + time) * 0.5 + 0.5, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`
```

## Responsive & Mobile Strategy

### Breakpoints
- **sm**: 640px (mobile landscape)
- **md**: 768px (tablet)
- **lg**: 1024px (desktop)
- **xl**: 1280px (large desktop)
- **2xl**: 1536px (extra large)

### Touch-Friendly Design
- Button/link minimum size: 44x44px
- Use `cursor-pointer` for interactive elements
- Larger touch targets on mobile
- No hover-only interactions (provide alternatives)

## Performance Optimization

### Code Splitting & Dynamic Imports
```tsx
// Lazy-load expensive components
const Model3D = dynamic(() => import('./Model3D'), { ssr: false })
const AnimationComponent = dynamic(() => import('./Animation'))

export function Page() {
  return <Model3D />
}
```

### Image Optimization
```tsx
// Use responsive images
<Image
  src="..."
  alt="..."
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  responsive
/>
```

## Accessibility & Motion

### Respect Reduced Motion
```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function AnimatedCard() {
  return (
    <motion.div
      animate={prefersReducedMotion ? {} : { x: 20 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
    >
      {/* Content */}
    </motion.div>
  )
}
```

### Semantic HTML & ARIA
```tsx
// Always use semantic elements
export function Navigation() {
  return (
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  )
}
```

## Design Source Templates

### Extract from MagicUI
1. Browse https://magicui.design
2. Select component
3. Copy HTML/CSS code
4. Convert to React component
5. Customize colors and animations

### Extract from ShadCN
1. Visit https://shadcn.com/ui
2. Find component
3. Copy code or use CLI: `npx shadcn-ui@latest add button`
4. Modify as needed for brand alignment

### Extract from Awwwards
1. Research design inspiration
2. Analyze layout, colors, animations
3. Create original implementation
4. Include attribution comment

## Bundle Size Considerations

- **framer-motion**: ~40KB gzipped
- **lenis**: ~15KB gzipped
- **@react-three/fiber**: ~130KB (with three.js ~300KB)
- **lottie-react**: ~50KB
- **lucide-react**: ~2KB per icon imported

**Strategy**: Only import what's needed, use dynamic imports for heavy libraries.

## Common Integration Patterns

### Pattern 1: Hero with Scroll Parallax
- High-quality image + Unsplash
- Overlay gradient + text
- Framer-motion parallax on scroll
- CTA button with hover effect
- MagicUI gradient button

### Pattern 2: Feature Cards with Animations
- Grid of cards from ShadCN or custom
- Lucide icons or custom SVGs
- Hover lift effect with framer-motion
- Scroll reveal animation
- Tailwind gradients for backgrounds

### Pattern 3: 3D Product Showcase
- React Three Fiber canvas
- Rotating 3D model
- Dynamic import with fallback image
- Touch controls on mobile
- Prefers-reduced-motion fallback

### Pattern 4: Animated Form
- ShadCN form components
- Field focus animations
- Validation feedback
- Toast notifications
- Smooth transitions

## Continuous Improvement

- Monitor bundle size regularly
- Test performance on low-power devices
- Gather user feedback on animations
- Update component libraries periodically
- Stay current with design trends from Awwwards and Dark.design
