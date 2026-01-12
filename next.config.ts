import type { NextConfig } from 'next'
import { withBotId } from 'botid/next/config'
import path from 'path'

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.md/,
      type: 'asset/source',
    })
    return config
  },
  turbopack: {
    rules: {
      '*.md': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vercel.com',
        port: '',
        pathname: '/api/www/avatar/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.builder.io',
        port: '',
        pathname: '/api/v1/image/**',
      },
      // Unsplash - High-quality royalty-free images
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        port: '',
      },
      // Pexels - Free stock photos
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'pexels.com',
        port: '',
      },
      // Pixabay - Royalty-free images
      {
        protocol: 'https',
        hostname: 'cdn.pixabay.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'pixabay.com',
        port: '',
      },
      // Cloudflare Images
      {
        protocol: 'https',
        hostname: 'imagedelivery.net',
        port: '',
      },
      // Lorem Picsum - Placeholder service
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
}

export default withBotId(nextConfig)
