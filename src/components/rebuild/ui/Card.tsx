import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Glassmorphic card component
 * Base primitive for all rebuild pages
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
      ${className}
    `}>
      {children}
    </div>
  );
}
