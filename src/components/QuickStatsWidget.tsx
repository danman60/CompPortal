'use client';

import Link from 'next/link';
import { getIconFromEmoji } from '@/lib/icons';

interface Stat {
  icon: string; // Emoji
  value: string | number;
  label: string;
  color?: string; // Tailwind text color class
  tooltip?: string; // Tooltip text displayed above CARD
  href?: string; // Optional link to make card clickable
  subtitle?: string; // Optional subtitle below the label (e.g., "$1,500 deposit")
}

interface QuickStatsWidgetProps {
  stats: Stat[];
  className?: string;
}

export default function QuickStatsWidget({ stats, className = '' }: QuickStatsWidgetProps) {
  return (
    <div className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => {
          // Check if this is unpaid invoices widget
          const isUnpaidInvoices = stat.label.toLowerCase().includes('invoice') && stat.label.toLowerCase().includes('unpaid');
          const hasUnpaidInvoices = isUnpaidInvoices && Number(stat.value) > 0;

          const IconComponent = getIconFromEmoji(stat.icon);

          const content = (
            <div className="relative">
              {/* Notification badge in top right corner */}
              {hasUnpaidInvoices && (
                <span className="absolute -top-2 -right-2 flex h-6 w-6 z-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 text-white text-xs items-center justify-center font-bold">
                    {stat.value}
                  </span>
                </span>
              )}

              {/* Icon at top */}
              <div className="mb-3 flex justify-center">
                <IconComponent size={40} strokeWidth={1.5} className="text-purple-300/90" />
              </div>

              {/* Value in middle - consistent text size */}
              <div className={`text-2xl font-bold leading-tight mb-2 ${stat.color || 'text-white'}`}>
                {stat.value}
              </div>

              {/* Label */}
              <div className="text-xs text-gray-300 font-semibold uppercase tracking-wide mb-1">{stat.label}</div>

              {/* Subtitle (optional, below label) */}
              {stat.subtitle && (
                <div className="text-sm text-green-300 font-medium">
                  {stat.subtitle}
                </div>
              )}

              {/* Tooltip at bottom */}
              {stat.tooltip && (
                <div className="text-xs text-purple-300/70 font-medium mt-2">
                  {stat.tooltip}
                </div>
              )}
            </div>
          );

          const cardClassName = `text-center block rounded-lg p-4 transition-all ${
            stat.href ? 'hover:bg-white/5 cursor-pointer' : ''
          } ${hasUnpaidInvoices ? 'animate-pulse-slow border-2 border-red-400/50 bg-red-500/10' : ''}`;

          return stat.href ? (
            <Link
              key={i}
              href={stat.href}
              className={cardClassName}
            >
              {content}
            </Link>
          ) : (
            <div key={i} className={cardClassName}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
