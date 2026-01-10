import * as React from 'react'
import Image from 'next/image'

interface IconProps {
  className?: string
  size?: number
}

export function OpenAILogo({ className, size = 20 }: IconProps) {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <img
        src="https://cdn.simpleicons.org/openai/000000"
        alt="OpenAI"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}

export function GoogleGeminiLogo({ className, size = 20 }: IconProps) {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <img
        src="https://cdn.simpleicons.org/googlegemini/8E75B2"
        alt="Google Gemini"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}

export function DeepseekLogo({ className, size = 20 }: IconProps) {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <img
        src="https://avatars.githubusercontent.com/u/148332152?s=200&v=4"
        alt="DeepSeek"
        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
      />
    </div>
  )
}

export function PerplexityLogo({ className, size = 20 }: IconProps) {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <img
        src="https://cdn.simpleicons.org/perplexity/1FB8CD"
        alt="Perplexity"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}

export function TogetherAILogo({ className, size = 20 }: IconProps) {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <img
        src="https://avatars.githubusercontent.com/u/108395955?s=200&v=4"
        alt="Together AI"
        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
      />
    </div>
  )
}

export function OpenRouterLogo({ className, size = 20 }: IconProps) {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <img
        src="https://openrouter.ai/favicon.ico"
        alt="OpenRouter"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}

export function FirecrawlLogo({ className, size = 20 }: IconProps) {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <img
        src="https://firecrawl.dev/favicon.ico"
        alt="Firecrawl"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}

export function ElevenLabsLogo({ className, size = 20 }: IconProps) {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <img
        src="https://cdn.simpleicons.org/elevenlabs/000000"
        alt="ElevenLabs"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}
