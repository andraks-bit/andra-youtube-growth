import type { Metadata } from 'next'

// Auth page — keep it out of every index. The page itself is 'use client'
// and can't export metadata, so this server layout carries it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
