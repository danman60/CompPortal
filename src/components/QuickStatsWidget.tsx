'use client';

import Link from 'next/link';

interface Stat {
  icon: string; // Emoji
  value: string | number;
  label: string;
  color?: string; // Tailwind text color class
  tooltip?: string; // Tooltip text displayed above CARD
  href?: string; // Optional link to make card clickable
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

          const content = (
            <>
              {/* Tooltip above CARD */}
              {stat.tooltip && (
                <div className="text-xs text-purple-300/80 font-medium mb-1.5">
                  {stat.tooltip}
                </div>
              )}
              <div className="text-2xl mb-2 opacity-80" aria-hidden>
                {stat.icon}
              </div>
              <div className={`text-3xl font-bold leading-tight ${stat.color || 'text-white'} ${hasUnpaidInvoices ? 'relative' : ''}`}>
                {stat.value}
                {hasUnpaidInvoices && (
                  <span className="absolute -top-2 -right-6 flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center font-bold">
                      {stat.value}
                    </span>
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-2 font-normal tracking-wide">{stat.label}</div>
            </>
          );

          const cardClassName = `text-center block rounded-lg p-3 transition-all ${
            stat.href ? 'hover:bg-white/5' : ''
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
