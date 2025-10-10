'use client';

import Link from 'next/link';
import { hapticMedium } from '@/lib/haptics';

interface FloatingActionButtonProps {
  href: string;
  icon: string;
  label: string;
  onClick?: () => void;
}

/**
 * Floating Action Button (FAB) for mobile-first primary actions
 * Appears in bottom-right corner on mobile devices
 * Hidden on desktop (md breakpoint and up)
 */
export default function FloatingActionButton({ href, icon, label, onClick }: FloatingActionButtonProps) {
  const className = "md:hidden fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-200 flex items-center justify-center text-2xl hover:scale-110 active:scale-95";

  const handleClick = (e?: React.MouseEvent) => {
    hapticMedium();
    if (onClick) {
      onClick();
    }
  };

  if (onClick) {
    return (
      <button
        onClick={handleClick}
        className={className}
        aria-label={label}
        title={label}
      >
        {icon}
      </button>
    );
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={className}
      aria-label={label}
      title={label}
    >
      {icon}
    </Link>
  );
}
