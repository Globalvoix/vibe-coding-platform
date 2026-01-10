import * as React from 'react'

interface IconProps {
  className?: string
  size?: 16 | 20 | 24 | 28 | 32
}

function sizeClass(size: IconProps['size']) {
  switch (size) {
    case 16:
      return 'h-4 w-4'
    case 24:
      return 'h-6 w-6'
    case 28:
      return 'h-7 w-7'
    case 32:
      return 'h-8 w-8'
    case 20:
    default:
      return 'h-5 w-5'
  }
}

function LogoImage({
  src,
  alt,
  size,
  className,
}: {
  src: string
  alt: string
  size: IconProps['size']
  className?: string
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={[
        'block',
        sizeClass(size),
        'object-contain',
        className ?? '',
      ]
        .join(' ')
        .trim()}
      loading="lazy"
      decoding="async"
    />
  )
}

export function OpenAILogo({ className, size = 20 }: IconProps) {
  return (
    <LogoImage
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Ff377af5d7184471a87f47a6b49d38ee3?format=webp&width=800"
      alt="OpenAI"
      size={size}
      className={className}
    />
  )
}

export function GoogleGeminiLogo({ className, size = 20 }: IconProps) {
  return (
    <LogoImage
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Fd744a48f659e4abbad0b7d5c1f19f072?format=webp&width=800"
      alt="Google Gemini"
      size={size}
      className={className}
    />
  )
}

export function DeepseekLogo({ className, size = 20 }: IconProps) {
  return (
    <LogoImage
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Fe94ebf3326bd493e99a88fa0a5b58545?format=webp&width=800"
      alt="DeepSeek"
      size={size}
      className={['rounded-[4px]', className ?? ''].join(' ').trim()}
    />
  )
}

export function TogetherAILogo({ className, size = 20 }: IconProps) {
  return (
    <LogoImage
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F3e54001cbf9148e1a6b1dbb097871767?format=webp&width=800"
      alt="Together AI"
      size={size}
      className={['rounded-[4px]', className ?? ''].join(' ').trim()}
    />
  )
}

export function PerplexityLogo({ className, size = 20 }: IconProps) {
  return (
    <LogoImage
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F10af51757cb24a848b4a4e3198631a6a?format=webp&width=800"
      alt="Perplexity"
      size={size}
      className={className}
    />
  )
}

export function FirecrawlLogo({ className, size = 20 }: IconProps) {
  return (
    <LogoImage
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Fd0626f7ab562440194b7f32039f63ed2?format=webp&width=800"
      alt="Firecrawl"
      size={size}
      className={className}
    />
  )
}

export function ElevenLabsLogo({ className, size = 20 }: IconProps) {
  return (
    <LogoImage
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F27fb3541e3f740b29c40f3c9bee7aa2a?format=webp&width=800"
      alt="ElevenLabs"
      size={size}
      className={className}
    />
  )
}
