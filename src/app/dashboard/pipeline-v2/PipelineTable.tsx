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
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No reservations found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Studio
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Competition
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Spaces
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entries
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
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
