import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#74cfe8] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        /* Gold fill — primary CTA */
        default: 'bg-[#74cfe8] text-[#07101e] hover:bg-[#3a9ab8] shadow-[0_8px_24px_rgba(116,207,232,0.22)]',
        /* Alias kept for legacy pages that still use variant="sea" */
        sea:     'bg-[#74cfe8] text-[#07101e] hover:bg-[#3a9ab8] shadow-[0_8px_24px_rgba(116,207,232,0.22)]',
        /* WhatsApp green — booking CTA only */
        booking: 'bg-[#25d366] text-white hover:bg-[#1dab52] shadow-[0_8px_20px_rgba(37,211,102,0.22)]',
        /* Ghost — dark bg, gold border */
        outline: 'border border-[rgba(116,207,232,0.30)] bg-transparent text-[rgba(244,244,242,0.80)] hover:border-[#74cfe8] hover:text-[#74cfe8]',
        /* Minimal — no border */
        ghost:   'bg-transparent text-[rgba(244,244,242,0.65)] hover:text-[#74cfe8] hover:bg-[rgba(116,207,232,0.06)]',
        /* Danger */
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        /* Text link */
        link: 'text-[#74cfe8] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm:      'h-8 px-4 text-xs',
        default: 'h-10 px-5 py-2',
        lg:      'h-12 px-8 text-base',
        icon:    'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
