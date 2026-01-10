import * as React from 'react'

interface IconProps {
  className?: string
  size?: number
}

export function OpenAILogo({ className, size = 20 }: IconProps) {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <img
        src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Ff377af5d7184471a87f47a6b49d38ee3?format=webp&width=800"
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
        src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Fd744a48f659e4abbad0b7d5c1f19f072?format=webp&width=800"
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
        src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Fe94ebf3326bd493e99a88fa0a5b58545?format=webp&width=800"
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
        src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F10af51757cb24a848b4a4e3198631a6a?format=webp&width=800"
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
        src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F3e54001cbf9148e1a6b1dbb097871767?format=webp&width=800"
        alt="Together AI"
        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
      />
    </div>
  )
}

export function FirecrawlLogo({ className, size = 20 }: IconProps) {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <img
        src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Fd0626f7ab562440194b7f32039f63ed2?format=webp&width=800"
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
        src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F27fb3541e3f740b29c40f3c9bee7aa2a?format=webp&width=800"
        alt="ElevenLabs"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}
