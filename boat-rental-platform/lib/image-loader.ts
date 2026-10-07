// Custom next/image loader — resizes through wsrv.nl (free, Cloudflare-backed
// image CDN) instead of Vercel's optimizer. Context: the Vercel Hobby image
// quota is exhausted, so built-in optimization 402s (broken photos), and
// serving originals unoptimized shipped ~100 MB pages on /search. This gives
// real srcset scaling with no Vercel quota and no broken images.
export default function wsrvLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  // Local/static assets (e.g. /video/hero-1.jpg) stay on our own origin.
  if (src.startsWith('/')) return src
  return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}&output=webp`
}
