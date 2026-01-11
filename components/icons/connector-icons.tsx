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
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F3e54001cbf9148e1a6b1dbb097871767?format=webp&width=800"
      alt="OpenAI"
      size={size}
      className={className}
    />
  )
}

export function GoogleGeminiLogo({ className, size = 20 }: IconProps) {
  return (
    <LogoImage
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F500ac0b471d143e8a753b4461316be02?format=webp&width=800"
      alt="Google Gemini"
      size={size}
      className={className}
    />
  )
}

export function DeepseekLogo({ className, size = 20 }: IconProps) {
  return (
    <LogoImage
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F1cb8023f0fbd4d73a86e767a49c87e56?format=webp&width=800"
      alt="DeepSeek"
      size={size}
      className={['rounded-[4px]', className ?? ''].join(' ').trim()}
    />
  )
}

export function TogetherAILogo({ className, size = 20 }: IconProps) {
  return (
    <LogoImage
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Fe913c4d994eb401c9e86babd1ba8c490?format=webp&width=800"
      alt="Together AI"
      size={size}
      className={['rounded-[4px]', className ?? ''].join(' ').trim()}
    />
  )
}

export function PerplexityLogo({ className, size = 20 }: IconProps) {
  return (
    <LogoImage
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F2ab274d790874fc6b643e4488281642c?format=webp&width=800"
      alt="Perplexity"
      size={size}
      className={className}
    />
  )
}

export function FirecrawlLogo({ className, size = 20 }: IconProps) {
  return (
    <LogoImage
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F9e670edc325942cfbb4dda37793e81df?format=webp&width=800"
      alt="Firecrawl"
      size={size}
      className={className}
    />
  )
}

export function ElevenLabsLogo({ className, size = 20 }: IconProps) {
  return (
    <LogoImage
      src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2Ffbb32398d4d04113ab02f8209004aa05?format=webp&width=800"
      alt="ElevenLabs"
      size={size}
      className={className}
    />
  )
}
