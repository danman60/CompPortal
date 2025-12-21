'use client';

import { Fragment } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { PipelineRow } from './PipelineRow';
import { PipelineExpandedRow } from './PipelineExpandedRow';
import { PipelineMobileCard } from './PipelineMobileCard';
import type { PipelineReservation, PipelineMutations, SortState, SortField } from './types';

interface PipelineTableProps {
  reservations: PipelineReservation[];
  expandedRowId: string | null;
  onRowExpand: (id: string) => void;
  mutations: PipelineMutations;
  sort: SortState;
  onSort: (field: SortField) => void;
}

// Sortable column header component
function SortableHeader({
  label,
  field,
  currentSort,
  onSort,
  className = '',
}: {
  label: string;
  field: SortField;
  currentSort: SortState;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentSort.field === field;

  return (
    <th
      className={`px-4 py-4 text-xs font-medium text-purple-200/60 uppercase tracking-wider cursor-pointer hover:text-purple-200 hover:bg-white/5 transition-colors select-none ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="inline-flex">
          {isActive ? (
            currentSort.direction === 'asc' ? (
              <ChevronUp className="w-4 h-4 text-purple-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-purple-300" />
            )
          ) : (
            <ChevronsUpDown className="w-4 h-4 opacity-40" />
          )}
        </span>
      </div>
    </th>
  );
}

export function PipelineTable({
  reservations,
  expandedRowId,
  onRowExpand,
  mutations,
  sort,
  onSort,
}: PipelineTableProps) {
  if (reservations.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border-2 border-white/20 p-8 text-center">
        <p className="text-purple-200/60">No reservations found matching your filters.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View - visible on small screens only */}
      <div className="md:hidden space-y-3">
        {reservations.map((reservation) => (
          <PipelineMobileCard
            key={reservation.id}
            reservation={reservation}
            mutations={mutations}
          />
        ))}
      </div>

      {/* Desktop Table View - hidden on small screens */}
      <div className="hidden md:block bg-white/10 backdrop-blur-sm rounded-xl border-2 border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/5">
              <tr className="border-b border-white/10">
                <th className="w-8 px-4 py-4"></th>
                <SortableHeader label="Studio" field="studio" currentSort={sort} onSort={onSort} className="text-left" />
                <SortableHeader label="Status" field="status" currentSort={sort} onSort={onSort} className="text-left" />
                <SortableHeader label="Competition" field="competition" currentSort={sort} onSort={onSort} className="text-left" />
                <SortableHeader label="Progress" field="progress" currentSort={sort} onSort={onSort} className="text-center" />
                <SortableHeader label="Entries" field="entries" currentSort={sort} onSort={onSort} className="text-center" />
                <SortableHeader label="Balance" field="balance" currentSort={sort} onSort={onSort} className="text-right" />
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
                  <Fragment key={reservation.id}>
                    <PipelineRow
                      reservation={reservation}
                      isExpanded={isExpanded}
                      onExpandChange={() => onRowExpand(reservation.id)}
                      mutations={mutations}
                    />
                    {isExpanded && (
                      <PipelineExpandedRow
                        reservation={reservation}
                        mutations={mutations}
                      />
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
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
