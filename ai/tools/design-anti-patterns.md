# Design Anti-Patterns: What NOT to Do

This guide identifies common mistakes that make designs look amateur, generic, or trend-chasing instead of professional and timeless.

## Anti-Pattern 1: Gradient Everything

**The Problem**: Filling every surface with gradients is the #1 indicator of amateur design.

### Bad Examples

```jsx
// BAD: Gradient on every element
<section className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
  <div className="bg-gradient-to-b from-blue-300 to-cyan-300">
    <button className="bg-gradient-to-r from-yellow-300 to-orange-400">
      Click me
    </button>
  </div>
</section>
```

**Why it's bad**: 
- Screams 2015-era design
- Reduces readability (text over gradients)
- Feels cheap and overdone
- Doesn't convey hierarchy or purpose

### Good Alternative

```jsx
// GOOD: Restrained, purposeful color
<section className="bg-white">
  <div className="bg-gray-50">
    <button className="bg-blue-600 hover:bg-blue-700 text-white">
      Click me
    </button>
  </div>
</section>
```

**Why it's better**: 
- Clean, professional
- Text is readable
- Color conveys purpose (blue = action)
- Whitespace breathes

### When Gradients Are Acceptable
1. **Subtle accent**: 2-color gradient at 5-10% opacity
2. **Hero section**: As background with high contrast overlay
3. **CTA emphasis**: Subtle directional gradient on key button
4. **Texture**: Very subtle noise gradient (hard to notice)

```jsx
// GOOD: Subtle, purposeful gradient
<button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
  Primary Action
</button>

// GOOD: Subtle opacity gradient
<div className="relative">
  <Image src="..." />
  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
</div>
```

## Anti-Pattern 2: Rainbow Color Palettes

**The Problem**: Using 5+ colors fights for attention and creates visual chaos.

### Bad Example

```jsx
// BAD: Too many colors competing
<div className="space-y-4">
  <button className="bg-red-500">Delete</button>
  <button className="bg-orange-500">Archive</button>
  <button className="bg-yellow-500">Flag</button>
  <button className="bg-green-500">Approve</button>
  <button className="bg-blue-500">Save</button>
  <button className="bg-purple-500">Share</button>
  <button className="bg-pink-500">Favorite</button>
</div>
```

**Why it's bad**:
- Visual overwhelm
- No clear primary action
- Looks like a playground, not a professional app
- Hard to create visual hierarchy

### Good Alternative

```jsx
// GOOD: Restrained palette (primary + secondary + status)
<div className="space-y-4">
  <button className="bg-blue-600 text-white">Primary Action</button>
  <button className="bg-gray-200 text-gray-800">Secondary Action</button>
  <div className="text-red-600 text-sm">Error state</div>
  <div className="text-green-600 text-sm">Success state</div>
</div>
```

**Good palette structure**:
- 1 primary color (main actions)
- 1 secondary color (alternate actions)
- Semantic colors (red = error, green = success, yellow = warning)
- Grayscale neutrals (backgrounds, text)

## Anti-Pattern 3: Neon & Harsh Colors

**The Problem**: Oversaturated, glowing colors are visually exhausting.

### Bad Example

```css
/* BAD: Neon territory */
color: #00ff00;          /* Neon green */
background: #ff00ff;      /* Neon magenta */
box-shadow: 0 0 20px #00ff00;  /* Glowing */
text-shadow: 0 0 10px #0000ff; /* Blurry glow */
```

**Why it's bad**:
- Hard on the eyes
- Looks cheap/spammy
- 2000s design vibes
- Reduces accessibility (extreme contrast)

### Good Alternative

```css
/* GOOD: Vibrant but professional */
color: #0066cc;           /* Calm blue */
background: #f5f5f5;      /* Subtle gray */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);  /* Soft shadow */
```

## Anti-Pattern 4: Over-Animation

**The Problem**: Adding motion to everything is distracting, not delightful.

### Bad Example

```jsx
// BAD: Every element animated
<motion.div
  animate={{ rotate: 360, scale: [0.8, 1.2, 1] }}
  transition={{ repeat: Infinity, duration: 2 }}
>
  <motion.button
    whileHover={{ rotate: 180, scale: 1.5 }}
    whileTap={{ rotate: 360 }}
    animate={{ y: [-10, 10] }}
  >
    Hover me!
  </motion.button>
</motion.div>
```

**Why it's bad**:
- Distracting, not helpful
- Creates cognitive load
- Exhausting to use
- Violates prefers-reduced-motion expectations

### Good Alternative

```jsx
// GOOD: Purposeful, minimal motion
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.2 }}
  className="bg-blue-600 text-white px-4 py-2 rounded"
>
  Click me
</motion.button>
```

**Motion rules**:
- Hover: subtle scale (1.02x) or shadow
- Press: tactile feedback (0.98x)
- Focus: outline, not glow
- Transitions: 200-300ms (snappy)
- NEVER animate without purpose

## Anti-Pattern 5: Poor Typography Hierarchy

**The Problem**: Failing to establish clear visual hierarchy makes content hard to scan.

### Bad Example

```jsx
// BAD: No hierarchy, everything the same
<div className="text-gray-600 text-sm space-y-2">
  <p>Premium Features</p>
  <p>Unlimited projects</p>
  <p>Priority support</p>
  <p>Advanced analytics</p>
  <p>Custom integrations</p>
</div>
```

**Why it's bad**:
- Can't quickly understand content structure
- No visual emphasis on important information
- All text looks equal, so nothing stands out
- Boring, unprofessional

### Good Alternative

```jsx
// GOOD: Clear hierarchy
<div>
  <h2 className="text-2xl font-bold text-gray-900 mb-4">
    Premium Features
  </h2>
  <ul className="space-y-3">
    <li className="flex gap-2">
      <span className="text-green-600 font-semibold">✓</span>
      <span className="text-gray-700">Unlimited projects</span>
    </li>
    <li className="flex gap-2">
      <span className="text-green-600 font-semibold">✓</span>
      <span className="text-gray-700">Priority support</span>
    </li>
    {/* More items */}
  </ul>
</div>
```

**Typography hierarchy rules**:
- h1/h2/h3/p have distinct sizes and weights
- Line heights: 1.1 (headlines), 1.6 (body)
- Font weight varies: bold for headers, regular for body
- Color contrast: dark text on light, light on dark

## Anti-Pattern 6: Cramped Layout (No Whitespace)

**The Problem**: Packing content tightly looks unprofessional and is hard to scan.

### Bad Example

```jsx
// BAD: No breathing room
<div className="p-2 space-y-1">
  <h1 className="text-xl">Title</h1>
  <p className="text-xs">Subtitle that's packed in</p>
  <div className="text-xs space-y-1">
    <p>Feature 1</p>
    <p>Feature 2</p>
    <p>Feature 3</p>
  </div>
</div>
```

**Why it's bad**:
- Feels cramped, unprofessional
- Hard to scan
- Overwhelms the reader
- Looks like a budget app

### Good Alternative

```jsx
// GOOD: Generous whitespace
<div className="p-8 space-y-8">
  <div>
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Title</h1>
    <p className="text-lg text-gray-600">Subtitle with breathing room</p>
  </div>

  <div className="space-y-4">
    <h2 className="text-xl font-semibold text-gray-900">Features</h2>
    <ul className="space-y-3">
      <li className="text-gray-700">Feature 1 with description</li>
      <li className="text-gray-700">Feature 2 with description</li>
      <li className="text-gray-700">Feature 3 with description</li>
    </ul>
  </div>
</div>
```

**Whitespace rules**:
- Section margins: 24px+ (generous separation)
- Component padding: 16-24px (breathing room)
- Text spacing: 1.6 line height (readable)
- Group related items; separate unrelated ones

## Anti-Pattern 7: Generic/Templated Design

**The Problem**: Using the exact same structure for every project looks unprofessional.

### Bad Example

```jsx
// BAD: Same layout every project (templates)
<section className="py-12 bg-gradient-to-r from-blue-600 to-purple-600">
  <h1 className="text-4xl text-white">Generic Hero</h1>
  <p className="text-white">Generic subtitle</p>
</section>

<section className="py-12 bg-white">
  <h2 className="text-3xl">Three Column Features</h2>
  <div className="grid grid-cols-3">
    {/* Same card repeated 3x */}
  </div>
</section>

<section className="py-12 bg-gray-50">
  <h2>Pricing Cards</h2>
  {/* Standard pricing table */}
</section>
```

**Why it's bad**:
- Feels like a WordPress theme
- No personality
- Unmemorable
- Looks cheap

### Good Alternative

**Create unique designs**:
- Different hero approach (could be text-only, image-first, or 3D)
- Varied layouts (not always 3-column grids)
- Custom illustrations or photography
- Unique color/typography combinations
- Original micro-interactions

```jsx
// GOOD: Unique design for each project
// Project 1: Minimalist with strong typography
<section className="py-24 bg-white">
  <h1 className="text-5xl font-bold text-gray-900 max-w-2xl">
    Bold, unique headline specific to this product
  </h1>
  <p className="text-xl text-gray-600 mt-6">Contextual description</p>
</section>

// Project 2: Image-first hero
<section className="relative h-screen">
  <Image src="custom-photo" fill object-cover />
  <div className="absolute inset-0 bg-black/30" />
  <div className="relative z-10 text-white">Custom content</div>
</section>

// Project 3: Creative layout
<section className="grid md:grid-cols-2 gap-12 items-center">
  {/* Unique asymmetrical layout */}
</section>
```

## Anti-Pattern 8: Inaccessible Design

**The Problem**: Low contrast, missing focus states, and ignored keyboard nav signal low quality.

### Bad Example

```jsx
// BAD: Inaccessible
<button className="bg-gray-300 text-gray-500">
  Click me (hard to see)
</button>

<input className="border-0" /> {/* No focus indicator */}

<div role="button">Not actually a button</div> {/* Not keyboard accessible */}
```

**Why it's bad**:
- 1 in 4 people have low vision
- Excludes users with disabilities
- Signals poor craftsmanship
- Legally risky

### Good Alternative

```jsx
// GOOD: Accessible and professional
<button className="bg-blue-600 text-white px-4 py-2
  focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
  hover:bg-blue-700 transition-colors">
  Click me (high contrast, clear focus)
</button>

<input className="border-2 border-gray-300 px-3 py-2
  focus:outline-none focus:ring-2 focus:ring-blue-600
  focus:border-blue-600" />

<button>Actual button with keyboard support</button>
```

**Accessibility rules**:
- Contrast: 7:1 minimum (WCAG AAA)
- Focus: Visible outline on all interactive elements
- Semantic HTML: Use correct elements
- Keyboard: Tab through entire interface logically
- Motion: Respect prefers-reduced-motion

## Anti-Pattern 9: Overusing Special Effects

**The Problem**: 3D, shaders, and heavy effects distract from content.

### Bad Example

```jsx
// BAD: Effects > Content
<Canvas>
  <Mesh rotation={[1, 2, 3]} scale={[1.5, 1.5, 1.5]}>
    <meshStandardMaterial emissive="#ff00ff" />
  </Mesh>
</Canvas>

<motion.div animate={{ rotateX: 360, rotateY: 360 }} transition={{ repeat: Infinity }}>
  Spinning text (hard to read)
</motion.div>
```

**Why it's bad**:
- Effects distract from actual content
- Looks gimmicky
- Expensive to render
- Poor accessibility

### Good Alternative

```jsx
// GOOD: Effects serve a purpose
<section className="relative overflow-hidden">
  <Image src="product" alt="..." />
  {/* Subtle parallax on scroll */}
  <motion.div
    style={{ y: parallaxY }}
    className="absolute inset-0 opacity-5 bg-gradient-to-b from-blue-600 to-transparent"
  />
</section>
```

**Effect rules**:
- Use ONLY for core experience (not decoration)
- Must improve UX or convey information
- Always optimize (lazy-load, fallbacks)
- Test on low-power devices
- Provide static alternatives

## Anti-Pattern 10: Ignoring Mobile Experience

**The Problem**: Scaling desktop down for mobile instead of rethinking the layout.

### Bad Example

```jsx
// BAD: Same layout, just squeezed
<div className="grid grid-cols-3 gap-8">
  {/* Tiny on mobile, unusable */}
</div>

<button className="px-8 py-4 text-sm">
  {/* Hard to tap on mobile */}
</button>
```

**Why it's bad**:
- Unusable on small screens
- Tiny touch targets (< 44px)
- Horizontal scrolling required
- Looks lazy

### Good Alternative

```jsx
// GOOD: Mobile-first, intelligent adaptation
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
  {/* Mobile: 1 col, Tablet: 2 col, Desktop: 3 col */}
</div>

<button className="w-full md:w-auto px-6 py-3 text-base md:text-sm">
  {/* 44x44px min on all devices */}
</button>

<nav className="flex flex-col md:flex-row gap-4">
  {/* Stack on mobile, horizontal on desktop */}
</nav>
```

**Mobile-first rules**:
- Design for 320px first
- Touch targets: 44x44px minimum
- Adapt layout per breakpoint (don't shrink)
- Test on real devices (not browser resize)
- Optimize performance (less bandwidth on mobile)

## The Anti-Pattern Checklist

Before shipping:
- [ ] NOT filling screen with gradients
- [ ] NOT using 5+ colors
- [ ] NOT using neon/harsh colors
- [ ] NOT animating everything
- [ ] Clear typography hierarchy
- [ ] Generous whitespace
- [ ] Unique design (not templated)
- [ ] Accessible (7:1 contrast, focus states, keyboard nav)
- [ ] Effects serve a purpose
- [ ] Mobile experience is thoughtful

If any item is unchecked, your design needs refinement.

---

**Remember**: Sophisticated design is defined by restraint, intentionality, and craft—not by how many effects or colors you use.
