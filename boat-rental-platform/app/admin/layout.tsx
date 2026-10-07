import type { Metadata } from 'next'

// Admin area (incl. /admin/leads, /admin/boathire24) — never in the index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
