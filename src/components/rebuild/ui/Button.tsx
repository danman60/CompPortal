import React from 'react';
import Link from 'next/link';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

/**
 * Button component with 4 variants
 * Supports both onClick and href (Next.js Link)
 */
export function Button({
  children,
  variant = 'secondary',
  onClick,
  href,
  disabled = false,
  className = '',
  type = 'button'
}: ButtonProps) {
  const baseClass = `
    px-4 py-2
    rounded-lg
    font-medium
    transition-all
    duration-200
    inline-flex items-center justify-center
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
  `;

  const variantClass = {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg',
    secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
    ghost: 'text-white hover:bg-white/10',
    danger: 'bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30'
  }[variant];

  const combinedClass = `${baseClass} ${variantClass} ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={combinedClass}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={combinedClass}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
