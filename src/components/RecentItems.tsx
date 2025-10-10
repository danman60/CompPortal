'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRecentItems, type RecentItem } from '@/hooks/useRecentItems';
import { formatDistanceToNow } from 'date-fns';

interface RecentItemsProps {
  type?: RecentItem['type'];
  maxItems?: number;
  title?: string;
  emptyMessage?: string;
}

const TypeIcons: Record<RecentItem['type'], string> = {
  routine: '🎭',
  dancer: '💃',
  invoice: '📄',
  competition: '🏆',
  studio: '🏛️',
  reservation: '📅',
};

const TypeLabels: Record<RecentItem['type'], string> = {
  routine: 'Routine',
  dancer: 'Dancer',
  invoice: 'Invoice',
  competition: 'Event',
  studio: 'Studio',
  reservation: 'Reservation',
};

/**
 * Recent Items List Component
 * Displays recently accessed items with quick access links
 */
export default function RecentItems({
  type,
  maxItems = 5,
  title = 'Recent Items',
  emptyMessage = 'No recent items',
}: RecentItemsProps) {
  const { items, removeItem, getByType } = useRecentItems({ maxItems: 20 });

  const displayItems = type ? getByType(type).slice(0, maxItems) : items.slice(0, maxItems);

  if (displayItems.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">⏱️</div>
          <p className="text-sm text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="text-xs text-gray-500">{displayItems.length} items</span>
      </div>

      <div className="space-y-2">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="group flex items-center justify-between gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 hover:border-purple-500/30 transition-all"
          >
            <Link
              href={item.href}
              className="flex-1 min-w-0 flex items-center gap-3"
            >
              <div className="text-2xl flex-shrink-0">
                {TypeIcons[item.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {item.title}
                </div>
                {item.subtitle && (
                  <div className="text-xs text-gray-400 truncate">
                    {item.subtitle}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-0.5">
                  {TypeLabels[item.type]} • {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                </div>
              </div>
            </Link>

            <button
              onClick={() => removeItem(item.id)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all text-gray-400 hover:text-red-300"
              aria-label="Remove from recent"
              title="Remove from recent"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Recent Items Dropdown Component
 * Compact dropdown for navigation menu
 */
export function RecentItemsDropdown() {
  const { items, clearAll } = useRecentItems({ maxItems: 10 });
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors relative"
        aria-label="Recent items"
      >
        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-white/20 rounded-xl shadow-2xl z-50 animate-fade-in max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Recent Items</h3>
              <button
                onClick={() => {
                  clearAll();
                  setIsOpen(false);
                }}
                className="text-xs text-gray-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            </div>

            <div className="p-2">
              {items.slice(0, 8).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <div className="text-xl">{TypeIcons[item.type]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
