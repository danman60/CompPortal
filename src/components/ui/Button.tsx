import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles - all buttons
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Primary: Full color, prominent (for main CTAs)
        primary:
          'bg-gradient-to-r from-dance-pink to-dance-purple text-white shadow-lg shadow-dance-purple/30 hover:shadow-xl hover:shadow-dance-purple/40 hover:-translate-y-0.5 active:translate-y-0',

        // Secondary: Outline, less prominent (for secondary actions)
        secondary:
          'border-2 border-white/20 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10 hover:border-white/30 hover:-translate-y-0.5 active:translate-y-0',

        // Ghost: Minimal, tertiary actions (for less important actions)
        ghost:
          'text-white/70 hover:text-white hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0',

        // Destructive: For delete/remove actions
        destructive:
          'bg-red-600 text-white shadow-lg shadow-red-600/30 hover:bg-red-700 hover:shadow-xl hover:shadow-red-600/40 hover:-translate-y-0.5 active:translate-y-0',

        // Link: Text-only link style
        link:
          'text-dance-purple underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
