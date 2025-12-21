'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CollapsibleSectionProps } from './types';

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  badge,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl border-2 border-white/20 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {badge !== undefined && (
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/30 text-purple-200 rounded-full border border-purple-400/30">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-purple-200/50 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}
