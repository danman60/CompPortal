'use client';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

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
  SortState,
  SortField,
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
  sort: SortState;
  handleSort: (field: SortField) => void;
  refetch: () => Promise<unknown>;
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
  sort,
  handleSort,
  refetch,
}: PipelineV2Props) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.loading('Refreshing...', { id: 'pipeline-refresh' });
    try {
      await refetch();
      toast.success('Pipeline refreshed!', { id: 'pipeline-refresh' });
    } catch {
      toast.error('Failed to refresh', { id: 'pipeline-refresh' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusFilterClick = (status: DisplayStatus | null) => {
    setFilters({ ...filters, status });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </Link>
              <h1 className="text-2xl font-bold text-white">Studio Pipeline</h1>
            </div>
              <p className="text-sm text-purple-200/60 mt-1">
                {allReservations.length} studios across {competitions.length} competitions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-purple-200/60">
                {reservations.length} of {allReservations.length} studios
              </span>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-purple-200 hover:text-white transition-all disabled:opacity-50"
                title="Refresh pipeline data"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
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
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-5 hover:bg-white/10 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-white">{comp.name}</h4>
                    <p className="text-xs text-purple-200/50 mt-0.5">{comp.year}</p>
                  </div>
                  {comp.pendingCount > 0 && (
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-300 rounded-md border border-yellow-500/30">
                      {comp.pendingCount} pending
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-200/50">Studios</span>
                    <span className="text-white">{comp.studioCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-200/50">Capacity</span>
                    <span className="text-white">
                      {comp.used} / {comp.totalCapacity || '?'}
                    </span>
                  </div>
                  {comp.totalCapacity > 0 && (
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          comp.percentage >= 90
                            ? 'bg-gradient-to-r from-red-500 to-pink-500'
                            : comp.percentage >= 70
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                            : 'bg-gradient-to-r from-emerald-500 to-green-500'
                        }`}
                        style={{ width: `${Math.min(comp.percentage, 100)}%` }}
                      />
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-purple-200/50">
                    <span>{comp.totalCapacity - comp.used} available</span>
                    <span>{comp.studioCount} studios</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
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
          sort={sort}
          onSort={handleSort}
        />
      </div>
    </div>
  );
}
