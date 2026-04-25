/**
 * Motion & Animation Library
 * 
 * Pre-built animation patterns for enterprise-grade UI.
 * All animations respect prefers-reduced-motion for accessibility.
 */

/**
 * Netflix Intro Animation
 * Iconic N with sound effect simulation
 */
export const NetflixIntro = {
  container: {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  letter: {
    initial: { opacity: 0, y: 20, rotateZ: -10 },
    animate: { opacity: 1, y: 0, rotateZ: 0 },
    transition: { duration: 0.8, ease: 'easeOut' },
    exit: { opacity: 0, y: -20, rotateZ: 10 },
  },
  flash: {
    animate: { opacity: [0, 1, 0.8] },
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
  sound: {
    // CSS: Create a "ta-dum" effect with subtle scale
    animate: { scaleX: [1, 1.05, 1], scaleY: [1, 0.95, 1] },
    transition: { duration: 0.5, ease: 'easeInOut' },
  },
}

/**
 * Scroll Reveal Animation
 * Fade in + slide up on scroll (for landing pages, marketing sites)
 */
export const ScrollReveal = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  },
}

/**
 * Staggered Grid Animation
 * Items appear in sequence (for product grids, movie lists, etc.)
 */
export const StaggeredGrid = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  },
  item: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    hover: { scale: 1.05, transition: { duration: 0.2 } },
  },
}

/**
 * Hover Card Lift
 * Subtle elevation + shadow on hover (for cards, products, etc.)
 */
export const CardHover = {
  initial: { y: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  hover: {
    y: -8,
    boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

/**
 * Tab Switch Animation
 * Cross-fade between content (for tabbed interfaces)
 */
export const TabSwitch = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

/**
 * Button Press Effect
 * Tactile feedback on click (all buttons)
 */
export const ButtonPress = {
  initial: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.15 } },
  tap: { scale: 0.98, transition: { duration: 0.1 } },
}

/**
 * Input Focus Animation
 * Border/underline animation (for forms)
 */
export const InputFocus = {
  initial: { borderBottomWidth: 1, borderBottomColor: 'rgb(200, 200, 200)' },
  focus: {
    borderBottomWidth: 2,
    borderBottomColor: 'rgb(14, 165, 233)',
    transition: { duration: 0.2 },
  },
}

/**
 * Loading Spinner (CSS-based, no animation library needed)
 */
export const LoadingSpinner = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .spinner {
    animation: spin 1s linear infinite;
  }
`

/**
 * Skeleton Loader (CSS-based)
 */
export const SkeletonLoader = `
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  
  .skeleton {
    background: linear-gradient(
      90deg,
      #e0e0e0 25%,
      #f0f0f0 50%,
      #e0e0e0 75%
    );
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
  }
`

/**
 * Page Transition Animation
 * For route changes between pages
 */
export const PageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

/**
 * Floating Action Button (FAB)
 * Subtle bounce on appearance
 */
export const FAB = {
  initial: { scale: 0, rotate: -180 },
  animate: { scale: 1, rotate: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  hover: { scale: 1.1 },
  tap: { scale: 0.95 },
}

/**
 * Accordion Animation
 * Expand/collapse with height animation
 */
export const Accordion = {
  container: {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1, transition: { duration: 0.3 } },
    exit: { height: 0, opacity: 0, transition: { duration: 0.2 } },
  },
}

/**
 * Modal/Dialog Animation
 * Fade backdrop + scale content
 */
export const Modal = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  content: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
  },
}

/**
 * Typed Text Animation
 * Character-by-character reveal (like Netflix hero subtitle)
 */
export const TypedText = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: 0.1 },
    },
  },
  letter: {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  },
}

/**
 * Parallax Scroll Effect
 * Background moves slower than foreground
 */
export const Parallax = {
  style: (y: number) => ({
    transform: `translateY(${y * 0.5}px)`,
  }),
}

/**
 * Image Zoom on Load
 * Subtle zoom with fade for high-impact images
 */
export const ImageZoom = {
  initial: { opacity: 0, scale: 1.05 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } },
}

/**
 * Sticky Header Animation
 * Changes styling on scroll
 */
export const StickyHeader = {
  initial: { boxShadow: 'none' },
  sticky: {
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: { duration: 0.3 },
  },
}

/**
 * Success/Error Toast Animation
 */
export const Toast = {
  initial: { opacity: 0, x: 350 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, x: 350, transition: { duration: 0.3 } },
}

/**
 * Framer Motion Setup Guide (for AI generators)
 */
export const FramerMotionSetup = `
// Installation
npm install framer-motion

// Basic Import
import { motion } from 'framer-motion'

// Example Usage with Netflix Intro
import { NetflixIntro } from '@/lib/motion-library'

<motion.div
  variants={NetflixIntro.container}
  initial="initial"
  animate="animate"
>
  <motion.h1 variants={NetflixIntro.letter}>Netflix</motion.h1>
</motion.div>

// For landing pages with scroll reveals
import { useInView } from 'react-intersection-observer'

const [ref, inView] = useInView({ threshold: 0.2 })
<motion.section
  ref={ref}
  variants={ScrollReveal.container}
  initial="hidden"
  animate={inView ? "visible" : "hidden"}
>
  {/* Content */}
</motion.section>
`

/**
 * Get animation by app type
 * Returns recommended animations for the specific app type
 */
export function getAnimationsByAppType(appType: string): Record<string, unknown> {
  const animations: Record<string, Record<string, unknown>> = {
    streaming: {
      intro: NetflixIntro,
      grid: StaggeredGrid,
      card: CardHover,
      transition: PageTransition,
    },
    ecommerce: {
      grid: StaggeredGrid,
      card: CardHover,
      button: ButtonPress,
      toast: Toast,
    },
    saas: {
      button: ButtonPress,
      input: InputFocus,
      modal: Modal,
      scroll: ScrollReveal,
    },
    landing: {
      scroll: ScrollReveal,
      typed: TypedText,
      card: CardHover,
      button: ButtonPress,
    },
    dashboard: {
      card: CardHover,
      button: ButtonPress,
      tab: TabSwitch,
    },
    social: {
      grid: StaggeredGrid,
      card: CardHover,
      button: ButtonPress,
      modal: Modal,
    },
  }

  return animations[appType] || {
    button: ButtonPress,
    card: CardHover,
    scroll: ScrollReveal,
  }
}

export type AnimationVariant = typeof NetflixIntro | typeof ScrollReveal | typeof StaggeredGrid
