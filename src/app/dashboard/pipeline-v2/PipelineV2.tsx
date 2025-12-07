'use client';

import { CollapsibleSection } from './CollapsibleSection';
import { KPICards } from './KPICards';
import { Filters } from './Filters';
import { PipelineTable } from './PipelineTable';
import type {
  PipelineReservation,
  PipelineMutations,
  PipelineStats,
  FilterState,
  DisplayStatus,
  CompetitionCapacity,
} from './types';

interface PipelineV2Props {
  reservations: PipelineReservation[];
  allReservations: PipelineReservation[];
  competitions: CompetitionCapacity[];
  stats: PipelineStats;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  expandedRowId: string | null;
  toggleRowExpansion: (id: string) => void;
  mutations: PipelineMutations;
}

export function PipelineV2({
  reservations,
  allReservations,
  competitions,
  stats,
  filters,
  setFilters,
  expandedRowId,
  toggleRowExpansion,
  mutations,
}: PipelineV2Props) {
  const handleStatusFilterClick = (status: DisplayStatus | null) => {
    setFilters({ ...filters, status });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Studio Pipeline</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage reservations through approval, invoicing, and payment
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {reservations.length} of {allReservations.length} studios
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Cards */}
        <CollapsibleSection title="Overview" defaultOpen={true} badge={stats.total}>
          <KPICards
            stats={stats}
            onFilterClick={handleStatusFilterClick}
            activeFilter={filters.status}
          />
        </CollapsibleSection>

        {/* Capacity Overview - reuse existing EventMetricsGrid */}
        <CollapsibleSection title="Capacity by Competition" defaultOpen={false} badge={competitions.length}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitions.map((comp) => (
              <div
                key={comp.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{comp.name}</h4>
                    <p className="text-xs text-gray-500">{comp.year}</p>
                  </div>
                  {comp.pendingCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                      {comp.pendingCount} pending
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Studios</span>
                    <span className="font-medium text-gray-900">{comp.studioCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Capacity Used</span>
                    <span className="font-medium text-gray-900">
                      {comp.used} / {comp.totalCapacity || '?'}
                    </span>
                  </div>
                  {comp.totalCapacity > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          comp.percentage >= 90
                            ? 'bg-red-500'
                            : comp.percentage >= 70
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(comp.percentage, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <Filters
            filters={filters}
            onChange={setFilters}
            competitions={competitions}
          />
        </div>

        {/* Table */}
        <PipelineTable
          reservations={reservations}
          expandedRowId={expandedRowId}
          onRowExpand={toggleRowExpansion}
          mutations={mutations}
        />
      </div>
    </div>
  );
}
