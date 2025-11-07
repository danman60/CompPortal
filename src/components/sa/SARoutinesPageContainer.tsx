'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

/**
 * Super Admin Routines View
 * Multi-tenant view of all routines across all studios and tenants with comprehensive filtering
 * Click any row to edit routine with SA override permissions
 */
export function SARoutinesPageContainer() {
  // Filter state
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [selectedStudioId, setSelectedStudioId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<'draft' | 'summarized' | 'all'>('all');
  const [selectedCategoryTypeId, setSelectedCategoryTypeId] = useState<string>('');
  const [selectedDanceCategoryId, setSelectedDanceCategoryId] = useState<string>('');
  const [selectedAgeDivisionId, setSelectedAgeDivisionId] = useState<string>('');

  // Fetch data
  const { data: tenantsData, isLoading: tenantsLoading } = trpc.superAdmin.tenants.getAllTenants.useQuery();
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

  const tenants = tenantsData?.tenants || [];
  const competitions = competitionsData?.competitions || [];
  const studios = studiosData?.studios || [];
  const categoryTypes = settingsData?.categoryTypes || [];
  const danceCategories = settingsData?.danceCategories || [];
  const ageDivisions = settingsData?.ageDivisions || [];
  const entries = entriesData?.entries || [];

  const isLoading = tenantsLoading || competitionsLoading || studiosLoading || settingsLoading || entriesLoading;

  // Filter by tenant (frontend filter since backend already returns all)
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Tenant filter
    if (selectedTenantId) {
      result = result.filter((entry: any) => entry.competitions?.tenant_id === selectedTenantId);
    }

    return result;
  }, [entries, selectedTenantId]);

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
            <h1 className="text-4xl font-bold text-white">All Routines (SA)</h1>
            <p className="text-white/60 mt-2">
              Multi-tenant view • {filteredEntries.length} routines • Click to edit
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tenant Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Tenant</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="" className="bg-gray-900">All Tenants</option>
              {tenants.map((tenant: any) => (
                <option key={tenant.id} value={tenant.id} className="bg-gray-900">
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          {/* Competition Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Event/Competition</label>
            <select
              value={selectedCompetitionId}
              onChange={(e) => setSelectedCompetitionId(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="" className="bg-gray-900">All Events</option>
              {competitions.map((comp: any) => (
                <option key={comp.id} value={comp.id} className="bg-gray-900">
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Studio Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Studio</label>
            <select
              value={selectedStudioId}
              onChange={(e) => setSelectedStudioId(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="" className="bg-gray-900">All Studios</option>
              {studios.map((studio: any) => (
                <option key={studio.id} value={studio.id} className="bg-gray-900">
                  {studio.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="all" className="bg-gray-900">All Status</option>
              <option value="draft" className="bg-gray-900">Draft</option>
              <option value="summarized" className="bg-gray-900">Summarized</option>
            </select>
          </div>

          {/* Category Type Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Category Type</label>
            <select
              value={selectedCategoryTypeId}
              onChange={(e) => setSelectedCategoryTypeId(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="" className="bg-gray-900">All Categories</option>
              {categoryTypes.map((cat: any) => (
                <option key={cat.id} value={cat.id} className="bg-gray-900">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dance Category Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Dance Category</label>
            <select
              value={selectedDanceCategoryId}
              onChange={(e) => setSelectedDanceCategoryId(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="" className="bg-gray-900">All Dance Categories</option>
              {danceCategories.map((cat: any) => (
                <option key={cat.id} value={cat.id} className="bg-gray-900">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Age Division Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Age Division</label>
            <select
              value={selectedAgeDivisionId}
              onChange={(e) => setSelectedAgeDivisionId(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              disabled={isLoading}
            >
              <option value="" className="bg-gray-900">All Ages</option>
              {ageDivisions.map((div: any) => (
                <option key={div.id} value={div.id} className="bg-gray-900">
                  {div.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
          <div className="text-white/60">Loading routines...</div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
          <div className="text-white/60">No routines found matching the selected filters.</div>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/20">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Tenant
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Competition
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Studio
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Dancers
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Dance Category
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Classification
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Age
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Choreographer
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">
                    Fee
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry: any) => {
                  const dancerCount = entry._count?.entry_participants || 0;
                  const isDraft = entry.reservations?.status !== 'summarized';
                  const statusColor = isDraft ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300';
                  const statusLabel = isDraft ? 'Draft' : 'Summarized';

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => {
                        window.location.href = `/dashboard/entries/${entry.id}`;
                      }}
                    >
                      <td className="px-6 py-4 text-white font-medium">{entry.title}</td>
                      <td className="px-6 py-4 text-white/70">{entry.competitions?.tenants?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">{entry.competitions?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">{entry.studios?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">{dancerCount}</td>
                      <td className="px-6 py-4 text-white/70">{entry.dance_categories?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">{entry.classifications?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">{entry.routine_age || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white/70">{entry.choreographer || 'N/A'}</td>
                      <td className="px-6 py-4 text-right text-white/70">
                        ${Number(entry.total_fee || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
