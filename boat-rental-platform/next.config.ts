import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Resize through wsrv.nl (lib/image-loader.ts) instead of Vercel's
    // optimizer: the Hobby quota is exhausted (built-in optimization 402s),
    // and serving raw originals shipped ~100 MB pages on /search. The custom
    // loader gives real srcset scaling with no Vercel quota.
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.pexels.com' },
      { protocol: 'https', hostname: 'boatrentalinmarbella.com' },
      { protocol: 'https', hostname: '**.cloudflare.com' },
      { protocol: 'https', hostname: 'wsrv.nl' },
    ],
  },
  // Allow Supabase auth redirects
  async redirects() {
    return [
      // Outreach-campaign aliases — short URLs that route to /list-your-boat
      // (the canonical page is /list-your-boat, which reads ?city / ?op / ?ref
      // params for personalization).
      { source: '/list', destination: '/list-your-boat', permanent: false },
      { source: '/owners', destination: '/list-your-boat', permanent: false },
      { source: '/sell', destination: '/list-your-boat', permanent: false },
    ]
  },
}

export default nextConfig
