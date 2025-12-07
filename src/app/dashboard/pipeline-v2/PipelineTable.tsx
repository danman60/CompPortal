'use client';

import { PipelineRow } from './PipelineRow';
import { PipelineExpandedRow } from './PipelineExpandedRow';
import type { PipelineReservation, PipelineMutations } from './types';

interface PipelineTableProps {
  reservations: PipelineReservation[];
  expandedRowId: string | null;
  onRowExpand: (id: string) => void;
  mutations: PipelineMutations;
}

export function PipelineTable({
  reservations,
  expandedRowId,
  onRowExpand,
  mutations,
}: PipelineTableProps) {
  if (reservations.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border-2 border-white/20 p-8 text-center">
        <p className="text-purple-200/60">No reservations found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl border-2 border-white/20 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5">
            <tr className="border-b border-white/10">
              <th className="w-8 px-4 py-4"></th>
              <th className="px-4 py-4 text-left text-xs font-medium text-purple-200/60 uppercase tracking-wider">
                Studio
              </th>
              <th className="px-4 py-4 text-left text-xs font-medium text-purple-200/60 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-4 text-left text-xs font-medium text-purple-200/60 uppercase tracking-wider">
                Competition
              </th>
              <th className="px-4 py-4 text-center text-xs font-medium text-purple-200/60 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-4 py-4 text-center text-xs font-medium text-purple-200/60 uppercase tracking-wider">
                Entries
              </th>
              <th className="px-4 py-4 text-right text-xs font-medium text-purple-200/60 uppercase tracking-wider">
                Balance
              </th>
              <th className="px-4 py-4 text-center text-xs font-medium text-purple-200/60 uppercase tracking-wider">
                Action
              </th>
              <th className="w-10 px-4 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {reservations.map((reservation) => {
              const isExpanded = expandedRowId === reservation.id;
              return (
                <>
                  <PipelineRow
                    key={reservation.id}
                    reservation={reservation}
                    isExpanded={isExpanded}
                    onExpandChange={() => onRowExpand(reservation.id)}
                    mutations={mutations}
                  />
                  {isExpanded && (
                    <PipelineExpandedRow
                      key={`${reservation.id}-expanded`}
                      reservation={reservation}
                      mutations={mutations}
                    />
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
