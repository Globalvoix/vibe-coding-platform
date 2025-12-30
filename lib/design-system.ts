/**
 * Institutional Design System
 * 
 * Enforces world-class design standards across all generated applications.
 * Ensures consistency in spacing, typography, colors, and component patterns.
 * 
 * Reference: Apple, Stripe, Linear, Netflix, Clerk
 */

/**
 * Spacing Scale (4px base unit)
 * Used for padding, margin, gaps, and layout dimensions
 */
export const SPACING = {
  px: '1px',
  0.5: '2px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
  72: '288px',
  80: '320px',
  96: '384px',
} as const

/**
 * Typography Scale
 * Based on professional SaaS standards (Stripe, Linear, Vercel)
 */
export const TYPOGRAPHY = {
  // Display (Hero Headlines)
  displayLg: {
    fontSize: '3.5rem', // 56px
    lineHeight: '1.1',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  displayMd: {
    fontSize: '2.75rem', // 44px
    lineHeight: '1.2',
    fontWeight: 700,
    letterSpacing: '-0.015em',
  },
  displaySm: {
    fontSize: '2.25rem', // 36px
    lineHeight: '1.2',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },

  // Heading Hierarchy
  h1: {
    fontSize: '2rem', // 32px
    lineHeight: '1.25',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  h2: {
    fontSize: '1.5rem', // 24px
    lineHeight: '1.33',
    fontWeight: 600,
    letterSpacing: '0',
  },
  h3: {
    fontSize: '1.25rem', // 20px
    lineHeight: '1.4',
    fontWeight: 600,
    letterSpacing: '0',
  },
  h4: {
    fontSize: '1.125rem', // 18px
    lineHeight: '1.44',
    fontWeight: 600,
    letterSpacing: '0',
  },

  // Body Text
  bodyLg: {
    fontSize: '1.125rem', // 18px
    lineHeight: '1.5',
    fontWeight: 400,
    letterSpacing: '0',
  },
  body: {
    fontSize: '1rem', // 16px
    lineHeight: '1.6',
    fontWeight: 400,
    letterSpacing: '0',
  },
  bodySm: {
    fontSize: '0.875rem', // 14px
    lineHeight: '1.6',
    fontWeight: 400,
    letterSpacing: '0',
  },

  // UI Labels
  labelMd: {
    fontSize: '0.875rem', // 14px
    lineHeight: '1.43',
    fontWeight: 500,
    letterSpacing: '0.005em',
  },
  labelSm: {
    fontSize: '0.75rem', // 12px
    lineHeight: '1.33',
    fontWeight: 500,
    letterSpacing: '0.01em',
  },

  // Caption
  caption: {
    fontSize: '0.75rem', // 12px
    lineHeight: '1.33',
    fontWeight: 400,
    letterSpacing: '0',
  },
  captionSm: {
    fontSize: '0.625rem', // 10px
    lineHeight: '1.2',
    fontWeight: 400,
    letterSpacing: '0.01em',
  },
} as const

/**
 * Component Spacing Patterns
 * Ensures consistent internal padding and sizing
 */
export const COMPONENT_SPACING = {
  button: {
    sm: {
      paddingY: SPACING[1],
      paddingX: SPACING[3],
      minHeight: '32px',
      minWidth: '32px',
    },
    md: {
      paddingY: SPACING[2],
      paddingX: SPACING[4],
      minHeight: '40px',
      minWidth: '40px',
    },
    lg: {
      paddingY: SPACING[3],
      paddingX: SPACING[5],
      minHeight: '48px',
      minWidth: '48px',
    },
  },
  input: {
    paddingY: SPACING[2],
    paddingX: SPACING[3],
    minHeight: '40px',
    borderRadius: '4px',
  },
  card: {
    padding: SPACING[4],
    borderRadius: '8px',
    gap: SPACING[4],
  },
  section: {
    paddingY: SPACING[12],
    paddingX: SPACING[4],
    gap: SPACING[8],
  },
} as const

/**
 * Grid System
 * Desktop-first responsive breakpoints
 */
export const GRID = {
  breakpoints: {
    mobile: 375,
    tablet: 768,
    desktop: 1024,
    wide: 1280,
    ultrawide: 1920,
  },
  container: {
    mobile: {
      width: '100%',
      paddingX: SPACING[4],
    },
    tablet: {
      maxWidth: '728px',
      paddingX: SPACING[5],
    },
    desktop: {
      maxWidth: '960px',
      paddingX: SPACING[6],
    },
    wide: {
      maxWidth: '1200px',
      paddingX: SPACING[8],
    },
  },
  gap: {
    sm: SPACING[3],
    md: SPACING[4],
    lg: SPACING[6],
    xl: SPACING[8],
  },
} as const

/**
 * Color System (Professional & Minimal)
 * Supports light and dark modes
 */
export const COLORS = {
  // Grayscale (Neutrals)
  gray: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1a6',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
  // Accent Color (Single primary color philosophy)
  accent: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c3d66',
  },
  // Semantic Colors
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  info: '#3b82f6',
} as const

/**
 * Elevation (Shadows)
 * Used for depth and layering
 */
export const SHADOWS = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const

/**
 * Border Radius (Subtle, Professional)
 */
export const BORDER_RADIUS = {
  none: '0',
  sm: '2px',
  md: '4px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
} as const

/**
 * Transitions & Animations
 * Keep motion minimal and purposeful
 */
export const MOTION = {
  // Timing Functions
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',

  // Durations
  fast: '100ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',

  // Common transitions
  default: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  colorChange: 'color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  shadowChange: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  scaleHover: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const

/**
 * Focus States (Accessibility)
 */
export const FOCUS = {
  outline: '2px solid #0ea5e9',
  outlineOffset: '2px',
  ring: 'ring-2 ring-offset-2 ring-blue-500',
} as const

/**
 * Layout Patterns
 */
export const LAYOUTS = {
  // Common spacing patterns
  hero: {
    padding: `${SPACING[12]} ${SPACING[4]}`,
    minHeight: '400px',
  },
  section: {
    padding: `${SPACING[12]} ${SPACING[4]}`,
    marginY: SPACING[8],
  },
  card: {
    padding: SPACING[4],
    borderRadius: BORDER_RADIUS.lg,
    boxShadow: SHADOWS.sm,
  },
  input: {
    padding: `${SPACING[2]} ${SPACING[3]}`,
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.gray[300]}`,
  },
} as const

/**
 * Responsive Utilities
 * Helper values for Tailwind breakpoints
 */
export const RESPONSIVE = {
  mobile: '@media (max-width: 767px)',
  tablet: '@media (min-width: 768px)',
  desktop: '@media (min-width: 1024px)',
  wide: '@media (min-width: 1280px)',
} as const

/**
 * Image Aspect Ratios
 * Standard dimensions for different contexts
 */
export const ASPECT_RATIOS = {
  square: '1 / 1',
  video: '16 / 9',
  portrait: '3 / 4',
  landscape: '4 / 3',
  widescreen: '21 / 9',
  golden: '1.618 / 1', // Golden ratio
} as const

/**
 * Validation: Ensure spacing consistency
 */
export function validateSpacing(value: string): boolean {
  const spacingValues = Object.values(SPACING)
  return spacingValues.includes(value as any)
}

/**
 * Generate CSS custom properties for design system
 */
export function generateDesignSystemCSS(): string {
  const lines: string[] = [':root {']

  // Spacing variables
  for (const [key, value] of Object.entries(SPACING)) {
    lines.push(`  --spacing-${key}: ${value};`)
  }

  // Color variables
  for (const [colorName, shades] of Object.entries(COLORS)) {
    if (typeof shades === 'object') {
      for (const [shade, color] of Object.entries(shades)) {
        lines.push(`  --color-${colorName}-${shade}: ${color};`)
      }
    }
  }

  // Motion variables
  for (const [key, value] of Object.entries(MOTION)) {
    lines.push(`  --motion-${key}: ${value};`)
  }

  lines.push('}')
  return lines.join('\n')
}
