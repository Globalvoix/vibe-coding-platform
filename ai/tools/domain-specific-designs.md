# Domain-Specific Design Patterns

This guide ensures that generated applications visually reflect their intended purpose. When a user requests an app type, use these patterns to guide design decisions.

---

## 1. E-COMMERCE STORES

### Visual Identity
- **Color Strategy**: High contrast, vibrant accent colors (primary color + complementary), neutral backgrounds
- **Typography**: Bold, large product imagery. Clean, readable body text for pricing/descriptions
- **Key Principle**: Products are the hero, not the interface

### Essential Sections

#### Header/Navigation
```tsx
// Sticky header with cart icon, search bar, mega menu
<header className="sticky top-0 z-50 bg-white border-b">
  <div className="flex items-center justify-between h-16 px-6">
    {/* Logo */}
    <Logo className="text-2xl font-bold" />
    
    {/* Mega menu with category dropdowns */}
    <nav className="hidden md:flex gap-8">
      {/* Hover states reveal subcategories */}
    </nav>
    
    {/* Search, Wishlist, Cart */}
    <div className="flex items-center gap-4">
      <SearchBar />
      <Heart className="cursor-pointer" />
      <ShoppingCart className="cursor-pointer relative">
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>
      </ShoppingCart>
    </div>
  </div>
</header>
```

#### Hero Section
```tsx
// Large hero image + seasonal/promotional banner
<section className="relative h-96 md:h-[500px] overflow-hidden">
  <Image src="hero-image" fill className="object-cover" />
  <div className="absolute inset-0 bg-black/30 flex items-end">
    <div className="p-8 text-white">
      <h1 className="text-4xl font-bold mb-4">New Collection</h1>
      <button className="bg-white text-black px-8 py-3 font-semibold hover:bg-gray-100">
        Shop Now
      </button>
    </div>
  </div>
</section>
```

#### Product Grid
```tsx
// Responsive product cards with quick actions
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
  {products.map(product => (
    <div className="group cursor-pointer">
      {/* Product Image with hover overlay */}
      <div className="relative overflow-hidden bg-gray-100 h-64">
        <Image src={product.image} fill className="object-cover group-hover:scale-105 transition-transform" />
        
        {/* Hover actions: Add to Cart, Quick View, Wishlist */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
          <button className="bg-white text-black px-6 py-2 rounded-lg font-semibold">Add to Cart</button>
          <Heart className="bg-white rounded-full p-2 cursor-pointer" />
        </div>
        
        {/* Badges: Sale, New, Limited */}
        {product.badge && (
          <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 text-xs font-bold">
            {product.badge}
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <div className="mt-4">
        <p className="text-sm text-gray-600 truncate">{product.category}</p>
        <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-lg font-bold text-gray-900">${product.salePrice}</span>
          {product.originalPrice && (
            <span className="text-sm text-gray-500 line-through">${product.originalPrice}</span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
          ))}
          <span className="text-xs text-gray-600">({product.reviews})</span>
        </div>
      </div>
    </div>
  ))}
</div>
```

#### Filtering & Sorting (Critical for UX)
```tsx
// Sidebar + Top filters
<div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
  {/* Sidebar filters */}
  <aside className="md:col-span-1">
    <div className="space-y-6">
      {/* Category, Price range, Color, Size, Brand, etc. */}
      {filters.map(filter => (
        <div key={filter.name}>
          <h4 className="font-semibold mb-3">{filter.name}</h4>
          <ul className="space-y-2">
            {filter.options.map(option => (
              <li key={option} className="flex items-center gap-2">
                <input type="checkbox" id={option} />
                <label htmlFor={option} className="text-sm cursor-pointer">{option}</label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </aside>
  
  {/* Products grid */}
  <div className="md:col-span-3">
    {/* Top controls: Sort dropdown, View toggle */}
    <div className="flex items-center justify-between mb-6">
      <p className="text-sm text-gray-600">Showing {products.length} products</p>
      <select className="border rounded-lg px-3 py-2">
        <option>Sort by: Newest</option>
        <option>Price: Low to High</option>
        <option>Price: High to Low</option>
        <option>Most Popular</option>
      </select>
    </div>
    
    {/* Product grid */}
  </div>
</div>
```

#### Product Detail Page
```tsx
// Large image gallery on left, details on right
<div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
  {/* Image gallery */}
  <div>
    <div className="bg-gray-100 h-96 md:h-full relative overflow-hidden">
      <Image src={selectedImage} fill className="object-cover" />
    </div>
    <div className="flex gap-2 mt-4 overflow-x-auto">
      {product.images.map((img, i) => (
        <button key={i} className="flex-shrink-0 w-20 h-20 border-2 overflow-hidden">
          <Image src={img} width={80} height={80} className="object-cover" />
        </button>
      ))}
    </div>
  </div>
  
  {/* Details */}
  <div className="space-y-6">
    <div>
      <p className="text-sm text-gray-600">{product.category}</p>
      <h1 className="text-3xl font-bold mt-2">{product.name}</h1>
      <div className="flex items-center gap-2 mt-2">
        {/* Ratings */}
      </div>
    </div>
    
    {/* Price, Stock, Reviews */}
    <div className="border-t pt-4">
      <p className="text-3xl font-bold">${product.price}</p>
      <p className="text-sm text-green-600 font-semibold mt-2">In Stock</p>
    </div>
    
    {/* Options: Size, Color, Quantity */}
    <div className="border-t pt-4 space-y-4">
      <div>
        <label className="text-sm font-semibold">Size</label>
        <div className="flex gap-2 mt-2">
          {product.sizes.map(size => (
            <button key={size} className="border-2 px-4 py-2 hover:border-gray-900">
              {size}
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="text-sm font-semibold">Quantity</label>
        <div className="flex items-center border rounded w-fit mt-2">
          <button className="px-4 py-2">-</button>
          <input type="number" value="1" className="w-12 text-center border-l border-r" />
          <button className="px-4 py-2">+</button>
        </div>
      </div>
    </div>
    
    {/* Action buttons */}
    <div className="flex gap-3 border-t pt-6">
      <button className="flex-1 bg-black text-white py-3 font-bold text-lg hover:bg-gray-900">
        Add to Cart
      </button>
      <button className="px-4 py-3 border-2 hover:bg-gray-50">
        <Heart />
      </button>
    </div>
    
    {/* Trust signals, shipping info, reviews preview */}
    <div className="bg-gray-50 p-4 rounded space-y-3">
      <div className="flex gap-2 text-sm">
        <Check className="text-green-600" />
        <span>Free shipping on orders over $50</span>
      </div>
      <div className="flex gap-2 text-sm">
        <Check className="text-green-600" />
        <span>30-day returns guaranteed</span>
      </div>
    </div>
  </div>
</div>
```

#### Footer with Social/Newsletter
```tsx
// Newsletter signup + links + social + contact
<footer className="bg-gray-900 text-white mt-16">
  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 p-8 border-b border-gray-800">
    {/* Company info */}
    <div>
      <h4 className="font-bold mb-4">About</h4>
      <p className="text-sm text-gray-400">Quality products delivered fast.</p>
      <div className="flex gap-4 mt-4">
        {/* Social icons */}
      </div>
    </div>
    
    {/* Help, Account, Info links */}
    <div>
      <h4 className="font-bold mb-4">Help</h4>
      <ul className="space-y-2 text-sm text-gray-400">
        <li><a href="#" className="hover:text-white">Contact Us</a></li>
        <li><a href="#" className="hover:text-white">Shipping Info</a></li>
        <li><a href="#" className="hover:text-white">Returns</a></li>
      </ul>
    </div>
    
    {/* Newsletter */}
    <div className="md:col-span-2">
      <h4 className="font-bold mb-4">Subscribe to our newsletter</h4>
      <div className="flex">
        <input type="email" placeholder="Enter your email" className="flex-1 px-4 py-2 text-black rounded-l" />
        <button className="bg-blue-600 px-6 rounded-r font-bold">Subscribe</button>
      </div>
    </div>
  </div>
  
  <div className="p-8 text-center text-sm text-gray-400">
    <p>&copy; 2024 Your Store. All rights reserved.</p>
  </div>
</footer>
```

### Color Palettes for Fashion/Apparel
- **Luxury Fashion**: Deep blacks, whites, gold accents, minimal photography
- **Fast Fashion**: Vibrant primary colors, bold typography, energetic CTAs
- **Streetwear**: Dark backgrounds, neon/contrasting accent colors, bold sans-serif

### Key Interactions
- Product hover: Scale image, reveal quick-add overlay
- Cart feedback: Toast notification with product image and total
- Wishlist toggle: Heart animation + count update
- Filters: Smooth count updates as filters change

---

## 2. SAAS LANDING PAGES

### Visual Identity
- **Color Strategy**: 1-2 accent colors (blue/purple common), clean grayscale neutrals
- **Typography**: Large, bold headline emphasizing benefits. Smaller subheadings for features
- **Key Principle**: Trust, clarity, and demonstrating value quickly

### Essential Sections

#### Sticky Navigation
```tsx
// Minimal, clean navigation with CTA
<nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
  <div className="flex items-center justify-between h-16 px-6 max-w-7xl mx-auto">
    <Logo className="text-xl font-bold" />
    
    <div className="hidden md:flex items-center gap-8">
      <a href="#features" className="text-sm text-gray-600 hover:text-black">Features</a>
      <a href="#pricing" className="text-sm text-gray-600 hover:text-black">Pricing</a>
      <a href="#docs" className="text-sm text-gray-600 hover:text-black">Documentation</a>
      <a href="#about" className="text-sm text-gray-600 hover:text-black">About</a>
    </div>
    
    <div className="flex items-center gap-4">
      <button className="text-sm font-semibold hover:text-blue-600">Sign In</button>
      <button className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
        Get Started
      </button>
    </div>
  </div>
</nav>
```

#### Hero Section (Problem + Solution)
```tsx
// Headline emphasizes problem solved, not product name
<section className="pt-32 pb-16 px-6 text-center">
  <div className="max-w-4xl mx-auto">
    <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
      Manage your entire workflow in one place
    </h1>
    
    <p className="text-xl text-gray-600 mb-8">
      Streamline collaboration, automate repetitive tasks, and ship faster. 
      Join 10,000+ teams already saving hours every week.
    </p>
    
    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
      <button className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-700">
        Start Free Trial
      </button>
      <button className="border-2 border-gray-300 px-8 py-4 rounded-lg font-semibold hover:border-gray-900">
        Watch Demo (2 min)
      </button>
    </div>
    
    {/* Trust badges */}
    <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 border-t pt-8">
      <div className="flex items-center gap-2">
        <Check className="w-5 h-5 text-green-600" />
        <span>No credit card required</span>
      </div>
      <div className="flex items-center gap-2">
        <Check className="w-5 h-5 text-green-600" />
        <span>Setup in minutes</span>
      </div>
      <div className="flex items-center gap-2">
        <Check className="w-5 h-5 text-green-600" />
        <span>24/7 support</span>
      </div>
    </div>
  </div>
</section>
```

#### Floating Mockup/Dashboard Preview
```tsx
// High-quality app screenshot with depth effect
<section className="py-16 px-6 bg-gradient-to-b from-blue-50 to-white">
  <div className="max-w-6xl mx-auto">
    <div className="relative">
      {/* Browser mockup */}
      <div className="rounded-xl overflow-hidden shadow-2xl bg-gray-900 border border-gray-800">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-800">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <input type="text" value="app.example.com" className="ml-4 flex-1 bg-gray-700 text-white text-xs px-3 py-1 rounded" disabled />
        </div>
        
        {/* Dashboard image */}
        <Image src="dashboard-screenshot" width={1200} height={600} className="w-full" />
      </div>
      
      {/* Floating cards with features */}
      <motion.div className="absolute -left-8 -bottom-8 bg-white p-4 rounded-xl shadow-lg w-64">
        <p className="text-sm font-semibold mb-2">30% faster workflows</p>
        <p className="text-xs text-gray-600">On average, teams ship 30% faster with our platform</p>
      </motion.div>
    </div>
  </div>
</section>
```

#### Feature Section (3-Column Grid)
```tsx
// Features solving key pain points
<section className="py-24 px-6 bg-white">
  <div className="max-w-6xl mx-auto">
    <h2 className="text-4xl font-bold text-center mb-4">Everything you need</h2>
    <p className="text-lg text-gray-600 text-center mb-16">
      Built for modern teams to move fast without breaking things.
    </p>
    
    <div className="grid md:grid-cols-3 gap-8">
      {[
        {
          icon: Zap,
          title: 'Lightning Performance',
          desc: 'Sub-100ms latency, built for speed. Deploy to 200+ edge locations.'
        },
        {
          icon: Lock,
          title: 'Enterprise Security',
          desc: 'SOC 2, GDPR compliant. Role-based access with audit logs.'
        },
        {
          icon: Users,
          title: 'Team Collaboration',
          desc: 'Real-time sync, comments, and approval workflows.'
        }
      ].map((feature, i) => {
        const Icon = feature.icon
        return (
          <div key={i} className="p-6">
            <div className="mb-4">
              <Icon className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.desc}</p>
          </div>
        )
      })}
    </div>
  </div>
</section>
```

#### Pricing Table
```tsx
// Clear pricing with highlighted popular plan
<section className="py-24 px-6 bg-gray-50" id="pricing">
  <div className="max-w-6xl mx-auto">
    <h2 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
    <p className="text-lg text-gray-600 text-center mb-16">
      Choose the perfect plan for your team. Always upgrade or downgrade.
    </p>
    
    <div className="grid md:grid-cols-3 gap-6">
      {[
        {
          name: 'Starter',
          price: '$29',
          desc: 'For small teams',
          features: ['Up to 10 users', 'Basic support', 'Core features']
        },
        {
          name: 'Professional',
          price: '$79',
          desc: 'Most popular',
          popular: true,
          features: ['Up to 100 users', 'Priority support', 'All features', 'SSO']
        },
        {
          name: 'Enterprise',
          price: 'Custom',
          desc: 'For large orgs',
          features: ['Unlimited users', 'Dedicated support', 'Custom features', 'SLA guarantee']
        }
      ].map(plan => (
        <div key={plan.name} className={`rounded-xl p-8 ${plan.popular ? 'ring-2 ring-blue-600 bg-white shadow-xl' : 'bg-white border border-gray-200'}`}>
          <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
          <p className="text-sm text-gray-600 mb-6">{plan.desc}</p>
          
          <p className="text-4xl font-bold mb-6">{plan.price}</p>
          
          <button className={`w-full py-3 rounded-lg font-bold mb-8 ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border-2 border-gray-300 hover:border-gray-900'}`}>
            Get Started
          </button>
          
          <ul className="space-y-4">
            {plan.features.map(feature => (
              <li key={feature} className="flex items-center gap-3 text-sm">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
</section>
```

#### Social Proof / Testimonials
```tsx
// Customer logos + quotes
<section className="py-16 px-6 bg-white">
  <div className="max-w-6xl mx-auto">
    <p className="text-center text-sm text-gray-600 font-semibold mb-8">TRUSTED BY LEADING COMPANIES</p>
    
    <div className="flex flex-wrap items-center justify-center gap-12 mb-16 opacity-60">
      {/* Company logos */}
      {['Acme', 'Stripe', 'Figma', 'Vercel', 'GitHub'].map(company => (
        <div key={company} className="font-bold text-gray-700">{company}</div>
      ))}
    </div>
    
    {/* Testimonials grid */}
    <div className="grid md:grid-cols-3 gap-6">
      {testimonials.map(testimonial => (
        <div key={testimonial.author} className="bg-gray-50 p-6 rounded-lg">
          <div className="flex items-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="text-gray-700 mb-4">"{testimonial.quote}"</p>
          <div>
            <p className="font-semibold text-sm">{testimonial.author}</p>
            <p className="text-xs text-gray-600">{testimonial.role}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

#### CTA Footer
```tsx
// Final conversion push
<section className="py-24 px-6 bg-blue-600 text-white text-center">
  <h2 className="text-4xl font-bold mb-6">Ready to ship faster?</h2>
  <p className="text-xl mb-8">Join thousands of teams already using our platform.</p>
  
  <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-50 mb-8">
    Start 14-Day Free Trial
  </button>
  
  <p className="text-white/80 text-sm">No credit card required. Includes all features.</p>
</section>
```

### Key Interactions
- Smooth scroll to sections
- Hover effect on pricing cards (lift + border color change)
- CTA button consistency (same across page)
- FAQ accordion with smooth open/close
- Form validation with clear error states

### Color Palettes
- **Tech/Cloud**: Blue (#0066cc) + Purple accent
- **Finance**: Dark blue (#003366) + Green accent
- **Marketing/Growth**: Purple (#7c3aed) + Pink accent

---

## 3. WEB APP CLONES

### General Principles
- **Study the original** thoroughly before generating
- **Preserve key patterns**: Navigation style, card layouts, interactions
- **Recreate visual hierarchy**: Typography sizes, spacing, color usage
- **Match interaction feel**: Hover states, transitions, animations
- **Adapt intelligently**: Use similar colors/fonts but respect the original brand

### Example: Twitter/X Clone
```tsx
// Sidebar navigation structure
// Main feed with tweets/posts
// Right sidebar with trending/search
// Consistent spacing and typography with original
```

### Example: Figma Clone
```tsx
// Left sidebar with file browser (tree structure)
// Center canvas area (large, responsive)
// Right sidebar with properties
// Minimal, clean, professional color scheme
```

### Example: Notion Clone
```tsx
// Hierarchical left sidebar
// Rich text editor in center
// Database-like views (grid, list, calendar)
// Flexible, modular layout
```

---

## INTENT DETECTION CHECKLIST

When analyzing user requests, look for these keywords to determine app type:

**E-COMMERCE INDICATORS**:
- "store", "shop", "buy", "sell", "products", "catalog", "cart", "checkout", "fashion", "clothing", "apparel"

**SAAS INDICATORS**:
- "dashboard", "app", "tool", "manage", "collaboration", "productivity", "workflow", "analytics", "business"

**CLONE INDICATORS**:
- "like", "clone", "similar to", "based on", specific app names (Twitter, Figma, Notion, etc.)

---

## IMPLEMENTATION GUIDELINES

### For Every Generated App

1. **Analyze Intent**: Determine app type from user request
2. **Select Pattern**: Use relevant pattern from this guide
3. **Extract Inspiration**: Use EXA + Firecrawl to find premium examples of that app type
4. **Adapt & Remix**: Combine patterns, customize colors/typography for user brand
5. **Implement Interactions**: Smooth hover states, proper feedback
6. **Test Responsiveness**: Mobile, tablet, desktop all look intentional
7. **Quality Check**: Does this look authentic to its type?

### DO NOT

- Generate a generic "web app" that doesn't reflect its purpose
- Use e-commerce design for a SaaS landing page
- Ignore important UI patterns specific to the app type
- Copy designs verbatim without understanding them
- Forget about key interactions and animations

### DO

- Vary designs across requests (never generate the same layout twice)
- Combine insights from multiple inspirations
- Respect user intent above all else
- Include proper loading states, empty states, error states
- Ensure accessibility and responsive design
- Use professional imagery (Unsplash, high quality)
- Add subtle animations and micro-interactions

---

## SAMPLE APP GENERATION WORKFLOW

**User Request**: "Create an e-commerce store for a clothing brand called 'Vibe'"

1. **Intent Detection**: E-commerce (clothing brand = apparel vertical)
2. **Pattern Selection**: Use e-commerce patterns above
3. **Design Inspiration**:
   - Search: "magicui.design product card component"
   - Search: "shots.so ecommerce hero section"
   - Search: "shopify theme design inspiration"
4. **Color Extraction**: Vibrant primary color + neutral backgrounds
5. **Implementation**:
   - Sticky navigation with logo "Vibe" + cart
   - Large hero image with "New Collection" CTA
   - Responsive product grid with quick-add
   - Filters sidebar
   - High-quality product images
6. **Interactions**:
   - Product hover: Scale image, reveal quick-add
   - Add to cart: Toast notification
   - Filter changes: Smooth count updates
7. **Review**: Does this look like a real clothing store?

---

## Q&A

**Q: What if the user doesn't specify an app type?**
A: Ask clarifying questions or make reasonable assumptions. "A productivity app" could be SaaS. "A boutique" is e-commerce.

**Q: Should I always use these exact patterns?**
A: No. Use these as starting points and guides. Adapt based on user feedback and preferences.

**Q: How do I avoid making apps look "templated"?**
A: Vary color schemes, typography pairings, component layouts, and interaction styles. Never generate the same design twice.

**Q: What if user wants a hybrid (e-commerce + SaaS)?**
A: Analyze primary intent, then blend patterns. E.g., a B2B SaaS marketplace combines SaaS dashboard patterns with e-commerce transaction flows.
