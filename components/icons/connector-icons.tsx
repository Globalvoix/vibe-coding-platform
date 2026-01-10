import * as React from 'react'

export function OpenAILogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5153-4.9066 6.0462 6.0462 0 0 0-3.9471-3.1298 6.0945 6.0945 0 0 0-5.043.6514 6.0318 6.0318 0 0 0-3.0032 3.8568 6.0908 6.0908 0 0 0-4.331 1.0506 6.0527 6.0527 0 0 0-2.5644 3.6631 6.0236 6.0236 0 0 0 .5153 4.9066 6.0544 6.0544 0 0 0 3.9461 3.1298 6.0968 6.0968 0 0 0 5.054-.6541 6.0331 6.0331 0 0 0 3.0023-3.8541 6.0927 6.0927 0 0 0 4.331-1.0526 6.0546 6.0546 0 0 0 2.5584-3.661zm-15.515 3.172l-2.078-1.202a4.426 4.426 0 0 1-1.892-3.441c0-1.666.924-3.122 2.29-3.903l.115-.064 2.127 1.231c.013.007.025.015.038.022V9.088c0 .256.136.492.356.619l4.831 2.789-1.332 2.306-4.455-2.57zm12.553-6.689l-.114.064-2.125-1.229a.128.128 0 0 1-.039-.022V1.543a4.41 4.41 0 0 1 3.665 1.578c1.036 1.303 1.255 3.005.589 4.49zm-5.971-1.911l-2.101 1.215V1.421c.159-.026.319-.04.479-.04 2.534 0 4.754 1.54 5.601 3.864l-3.979 2.298zm-1.089 5.912L7.43 7.515l1.332-2.306 4.455 2.57 2.078 1.202a4.426 4.426 0 0 1 1.892 3.441c0 1.666-.924 3.122-2.29 3.903l-.115.064-2.127-1.231a.128.128 0 0 1-.038-.022v-3.453a.717.717 0 0 0-.356-.619zM4.755 4.954c.452-.57 1.023-1.048 1.666-1.399l2.125 1.229a.127.127 0 0 1 .039.022v3.452c0 .256-.136.492-.356.619L3.398 11.666l-1.332-2.306 2.689-1.553zm.643 12.01l.114-.064 2.125 1.229c.013.008.026.015.039.022v3.453a4.41 4.41 0 0 1-3.665-1.578c-1.036-1.303-1.255-3.005-.589-4.49zm5.971 1.911l2.101-1.215V22.58a5.93 5.93 0 0 1-.479.04c-2.534 0-4.754-1.54-5.601-3.864l3.979-2.298zm1.089-5.912l4.831 2.789-1.332 2.306-4.455-2.57-2.078-1.202a4.426 4.426 0 0 1-1.892-3.441c0-1.666.924-3.122 2.29-3.903l.115-.064 2.127 1.231c.013-.007.025-.015.038-.022v3.453c0 .256.136.492.356.619zM19.245 19.046c-.452.57-1.023 1.048-1.666 1.399l-2.125-1.229a.127.127 0 0 1-.039-.022v-3.452c0-.256.136-.492.356-.619l4.831-2.789 1.332 2.306-2.689 1.553z" />
    </svg>
  )
}

export function GoogleGeminiLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 24c-.215 0-.421-.082-.577-.23L1.225 13.577a.816.816 0 0 1 0-1.154L11.423.23a.816.816 0 0 1 1.154 0l10.198 12.193a.816.816 0 0 1 0 1.154L12.577 23.77A.816.816 0 0 1 12 24z" fill="#4285F4" />
      <path d="M12 20.4a.408.408 0 0 1-.288-.12L4.012 12.6l7.7-7.68a.408.408 0 0 1 .576 0l7.7 7.68-7.7 7.68A.408.408 0 0 1 12 20.4z" fill="#FFF" />
      <circle cx="12" cy="12" r="3" fill="#4285F4" />
    </svg>
  )
}

export function DeepseekLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
    </svg>
  )
}

export function PerplexityLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10zm-1-15h2v6h-2zm0 8h2v2h-2z" />
    </svg>
  )
}

export function TogetherAILogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 22h20L12 2zm0 4.83L18.17 19H5.83L12 6.83z" />
    </svg>
  )
}

export function OpenRouterLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7v10l10 5 10-5V7l-10-5zm8 14.23l-8 4-8-4V8.77l8-4 8 4v7.46z" />
    </svg>
  )
}

export function FirecrawlLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  )
}

export function ElevenLabsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h-2v-2h2v2zm0-4h-2V7h2v5zm4 4h-2v-2h2v2zm0-4h-2V7h2v5z" />
    </svg>
  )
}
