import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Glassmorphic card component
 * Base primitive for all rebuild pages
 * Now with hover lift effect for better interactivity
 */
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`
      bg-white/10
      backdrop-blur-md
      rounded-xl
      border border-white/20
      p-6
      shadow-lg
      transition-all duration-200
      hover:border-white/30
      hover:-translate-y-1
      hover:shadow-xl hover:shadow-purple-500/20
      ${className}
    `}>
      {children}
    </div>
  );
}
