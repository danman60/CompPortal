'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { RoutinesFilters } from './RoutinesFilters';
import { RoutinesTable } from './RoutinesTable';

/**
 * Competition Director Routines View
 * Read-only view of all routines across all studios with comprehensive filtering
 */
export function RoutinesPageContainer() {
  // Filter state
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [selectedStudioId, setSelectedStudioId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<'draft' | 'submitted' | 'confirmed' | 'all'>('all');
  const [selectedCategoryTypeId, setSelectedCategoryTypeId] = useState<string>('');
  const [selectedDanceCategoryId, setSelectedDanceCategoryId] = useState<string>('');
  const [selectedAgeDivisionId, setSelectedAgeDivisionId] = useState<string>('');

  // Fetch data
  const { data: competitionsData, isLoading: competitionsLoading } = trpc.competition.getAll.useQuery({});
  const { data: studiosData, isLoading: studiosLoading } = trpc.studio.getAll.useQuery({});
  const { data: settingsData, isLoading: settingsLoading } = trpc.competition.getTenantSettings.useQuery();

  // Fetch entries with cumulative filters
  const { data: entriesData, isLoading: entriesLoading } = trpc.entry.getAllForCompetitionDirector.useQuery({
    competitionId: selectedCompetitionId || undefined,
    studioId: selectedStudioId || undefined,
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    categoryTypeId: selectedCategoryTypeId || undefined,
    danceCategoryId: selectedDanceCategoryId || undefined,
    ageDivisionId: selectedAgeDivisionId || undefined,
  });

  const competitions = competitionsData?.competitions || [];
  const studios = studiosData?.studios || [];
  const categoryTypes = settingsData?.categoryTypes || [];
  const danceCategories = settingsData?.danceCategories || [];
  const ageDivisions = settingsData?.ageDivisions || [];
  const entries = entriesData?.entries || [];
  const total = entriesData?.total || 0;

  const isLoading = competitionsLoading || studiosLoading || settingsLoading || entriesLoading;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-2 mb-4"
        >
          ← Back to Dashboard
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">All Routines</h1>
            <p className="text-white/60 mt-2">
              View all routines across all studios • {total} total
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <RoutinesFilters
        competitions={competitions}
        studios={studios}
        categoryTypes={categoryTypes}
        danceCategories={danceCategories}
        ageDivisions={ageDivisions}
        selectedCompetitionId={selectedCompetitionId}
        selectedStudioId={selectedStudioId}
        selectedStatus={selectedStatus}
        selectedCategoryTypeId={selectedCategoryTypeId}
        selectedDanceCategoryId={selectedDanceCategoryId}
        selectedAgeDivisionId={selectedAgeDivisionId}
        onCompetitionChange={setSelectedCompetitionId}
        onStudioChange={setSelectedStudioId}
        onStatusChange={setSelectedStatus}
        onCategoryTypeChange={setSelectedCategoryTypeId}
        onDanceCategoryChange={setSelectedDanceCategoryId}
        onAgeDivisionChange={setSelectedAgeDivisionId}
        isLoading={isLoading}
      />

      {/* Table */}
      <RoutinesTable entries={entries} isLoading={isLoading} />
    </div>
  );
}
