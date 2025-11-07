'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

type SortField = 'title' | 'studio' | 'competition' | 'tenant' | 'category' | 'classification' | 'age' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

/**
 * Super Admin Routines View
 * Multi-tenant view of all routines across all studios and tenants with comprehensive filtering
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
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

    // Sort
    result.sort((a: any, b: any) => {
      let aVal, bVal;

      switch (sortField) {
        case 'title':
          aVal = a.title || '';
          bVal = b.title || '';
          break;
        case 'studio':
          aVal = a.studios?.name || '';
          bVal = b.studios?.name || '';
          break;
        case 'competition':
          aVal = a.competitions?.name || '';
          bVal = b.competitions?.name || '';
          break;
        case 'tenant':
          aVal = a.competitions?.tenants?.name || '';
          bVal = b.competitions?.tenants?.name || '';
          break;
        case 'category':
          aVal = a.dance_categories?.name || '';
          bVal = b.dance_categories?.name || '';
          break;
        case 'classification':
          aVal = a.classifications?.name || '';
          bVal = b.classifications?.name || '';
          break;
        case 'age':
          aVal = a.routine_age || 0;
          bVal = b.routine_age || 0;
          break;
        case 'status':
          aVal = a.reservations?.status || 'draft';
          bVal = b.reservations?.status || 'draft';
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? (aVal < bVal ? -1 : 1) : (bVal < aVal ? -1 : 1);
    });

    return result;
  }, [entries, selectedTenantId, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1800px] mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center gap-2 mb-4"
          >
            ← Back to Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">All Routines (Super Admin)</h1>
              <p className="text-gray-600 mt-2">
                Multi-tenant view across all competitions and studios • {filteredEntries.length} routines
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tenant Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tenant</label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                disabled={isLoading}
              >
                <option value="">All Tenants</option>
                {tenants.map((tenant: any) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Competition Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Competition</label>
              <select
                value={selectedCompetitionId}
                onChange={(e) => setSelectedCompetitionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                disabled={isLoading}
              >
                <option value="">All Competitions</option>
                {competitions.map((comp: any) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Studio Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Studio</label>
              <select
                value={selectedStudioId}
                onChange={(e) => setSelectedStudioId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                disabled={isLoading}
              >
                <option value="">All Studios</option>
                {studios.map((studio: any) => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                disabled={isLoading}
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="summarized">Summarized</option>
              </select>
            </div>

            {/* Category Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category Type</label>
              <select
                value={selectedCategoryTypeId}
                onChange={(e) => setSelectedCategoryTypeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                disabled={isLoading}
              >
                <option value="">All Categories</option>
                {categoryTypes.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dance Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dance Category</label>
              <select
                value={selectedDanceCategoryId}
                onChange={(e) => setSelectedDanceCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                disabled={isLoading}
              >
                <option value="">All Dance Categories</option>
                {danceCategories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Age Division Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age Division</label>
              <select
                value={selectedAgeDivisionId}
                onChange={(e) => setSelectedAgeDivisionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                disabled={isLoading}
              >
                <option value="">All Ages</option>
                {ageDivisions.map((div: any) => (
                  <option key={div.id} value={div.id}>
                    {div.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">🩰</div>
              <div className="text-xl">Loading routines...</div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">🎭</div>
              <div className="text-xl">No routines found</div>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('title')}
                    >
                      Title {getSortIcon('title')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('tenant')}
                    >
                      Tenant {getSortIcon('tenant')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('competition')}
                    >
                      Competition {getSortIcon('competition')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('studio')}
                    >
                      Studio {getSortIcon('studio')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('category')}
                    >
                      Dance Category {getSortIcon('category')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('classification')}
                    >
                      Classification {getSortIcon('classification')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('age')}
                    >
                      Age {getSortIcon('age')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('status')}
                    >
                      Status {getSortIcon('status')}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('created_at')}
                    >
                      Created {getSortIcon('created_at')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Dancers
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Choreographer
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {entry.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.competitions?.tenants?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.competitions?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.studios?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.dance_categories?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.classifications?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.routine_age || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          entry.reservations?.status === 'summarized'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entry.reservations?.status === 'summarized' ? 'Summarized' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry._count?.entry_participants || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.choreographer || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
