import Image from 'next/image'

interface LogoProps {
  /** Height in pixels. Width auto-scales (logo is square). */
  size?: number
  /** Not used with image logo — kept for API compatibility */
  markOnly?: boolean
  className?: string
}

/**
 * BoatHire24 brand logo — uses the actual brand image with transparent background.
 * The `size` prop controls the rendered height (logo is square so width = height).
 */
export default function Logo({ size = 44, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center select-none ${className}`}>
      <Image
        src="/logo.png"
        alt="BoatHire24 — Rent Boats & Yachts"
        width={size}
        height={size}
        priority
        style={{ display: 'block', width: size, height: size, objectFit: 'contain' }}
      />
    </span>
  )
}
