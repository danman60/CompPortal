'use client';

import { ReactNode } from 'react';

interface ResponsiveTableProps {
  headers: Array<{ key: string; label: string; className?: string }>;
  data: Array<any>;
  renderRow: (item: any, isMobile: boolean) => ReactNode;
  renderMobileCard: (item: any) => ReactNode;
  keyExtractor: (item: any) => string;
  emptyMessage?: string;
  emptyIcon?: string;
}

/**
 * Responsive table component that shows:
 * - Table layout on desktop (md breakpoint and up)
 * - Card layout on mobile (below md breakpoint)
 */
export default function ResponsiveTable({
  headers,
  data,
  renderRow,
  renderMobileCard,
  keyExtractor,
  emptyMessage = 'No items found',
  emptyIcon = '📋',
}: ResponsiveTableProps) {
  if (data.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <div className="flex flex-col items-center">
          <div className="text-6xl mb-4">{emptyIcon}</div>
          <h3 className="text-xl font-bold text-white mb-2">No Items Found</h3>
          <p className="text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View - hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5 border-b border-white/20 sticky top-0 z-10 backdrop-blur-md">
            <tr>
              {headers.map((header) => (
                <th
                  key={header.key}
                  className={`px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider ${header.className || ''}`}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {data.map((item) => renderRow(item, false))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - hidden on desktop */}
      <div className="md:hidden space-y-4 p-4">
        {data.map((item) => (
          <div key={keyExtractor(item)}>{renderMobileCard(item)}</div>
        ))}
      </div>
    </>
  );
}
