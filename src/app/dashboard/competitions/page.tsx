'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Plus } from '@/lib/icons';

type ViewMode = 'grid' | 'table';
type SortColumn = 'name' | 'year' | 'tenant' | 'status' | 'capacity';
type SortDirection = 'asc' | 'desc';

export default function CompetitionsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: userData } = trpc.user.getCurrentUser.useQuery();
  const { data: tenantsData } = trpc.user.getAllTenants.useQuery(undefined, {
    enabled: userData?.role === 'super_admin',
  });

  const [filter, setFilter] = useState<'active' | 'all' | 'upcoming' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled'>('active');
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data, isLoading } = trpc.competition.getAll.useQuery({
    tenantId: selectedTenantId,
  });

  const deleteMutation = trpc.competition.delete.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
    onError: (error) => {
      alert(`Delete failed: ${error.message}`);
    },
  });

  const cloneMutation = trpc.competition.clone.useMutation({
    onSuccess: (result) => {
      alert(
        `✅ Competition cloned successfully!\n\n` +
        `New: ${result.competition?.name}\n` +
        `Cloned from: ${result.clonedFrom}\n` +
        `Sessions: ${result.sessionsCloned}\n` +
        `Locations: ${result.locationsCloned}`
      );
      utils.competition.getAll.invalidate();
    },
    onError: (error) => {
      alert(`Clone failed: ${error.message}`);
    },
  });

  // Move hook definitions BEFORE any early returns to maintain consistent hook count
  const competitions = data?.competitions || [];
  const tenants = tenantsData?.tenants || [];
  const isSuperAdmin = userData?.role === 'super_admin';

  const filteredCompetitions = filter === 'all'
    ? competitions
    : filter === 'active'
    ? competitions.filter(c => c.status !== 'cancelled')
    : competitions.filter(c => c.status === filter);

  // Sort competitions for table view (hook must be called consistently)
  const sortedCompetitions = useMemo(() => {
    if (viewMode !== 'table') return filteredCompetitions;

    return [...filteredCompetitions].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'year':
          aValue = a.year;
          bValue = b.year;
          break;
        case 'tenant':
          aValue = a.tenants?.name.toLowerCase() || '';
          bValue = b.tenants?.name.toLowerCase() || '';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'capacity':
          const aReserved = a.reservations?.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0) || 0;
          const bReserved = b.reservations?.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0) || 0;
          aValue = (a.venue_capacity || 600) - aReserved;
          bValue = (b.venue_capacity || 600) - bReserved;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCompetitions, viewMode, sortColumn, sortDirection]);

  const displayCompetitions = viewMode === 'table' ? sortedCompetitions : filteredCompetitions;

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleClone = (id: string, name: string, currentYear: number) => {
    const newYearStr = prompt(
      `Clone "${name}" (${currentYear})\n\nEnter the year for the new competition:`,
      (currentYear + 1).toString()
    );

    if (!newYearStr) return;

    const newYear = parseInt(newYearStr, 10);
    if (isNaN(newYear) || newYear < 2000 || newYear > 2100) {
      alert('Invalid year. Must be between 2000 and 2100.');
      return;
    }

    const newName = prompt(
      `Optional: Enter custom name for the cloned competition\n\n(Leave blank to use "${name} ${newYear}")`,
      ''
    );

    if (confirm(`Clone "${name}" for year ${newYear}?`)) {
      cloneMutation.mutate({
        id,
        newYear,
        newName: newName || undefined,
      });
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-white/20 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      {/* Header */}
      <div className="mb-8">
        {/* Back to Dashboard */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-all mb-4"
        >
          <span className="text-xl">←</span>
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🎭 Event Management</h1>
            <p className="text-gray-400">Create and manage dance competition events</p>
          </div>
          <Button asChild variant="primary" size="lg">
            <Link href="/dashboard/competitions/new">
              <Plus size={20} strokeWidth={2} />
              Create New Event
            </Link>
          </Button>
        </div>

        {/* SA Controls: Tenant Filter + View Toggle */}
        {isSuperAdmin && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Tenant Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-300">Tenant:</label>
                <select
                  value={selectedTenantId || 'all'}
                  onChange={(e) => setSelectedTenantId(e.target.value === 'all' ? undefined : e.target.value)}
                  className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Tenants ({competitions.length})</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({competitions.filter(c => c.tenant_id === tenant.id).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm font-medium text-gray-300">View:</label>
                <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      viewMode === 'grid'
                        ? 'bg-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      viewMode === 'table'
                        ? 'bg-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Table
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Filters */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'active'
                ? 'bg-white text-gray-900'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Active ({competitions.filter(c => c.status !== 'cancelled').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-gray-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All ({competitions.length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'upcoming'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Upcoming ({competitions.filter(c => c.status === 'upcoming').length})
          </button>
          <button
            onClick={() => setFilter('registration_open')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'registration_open'
                ? 'bg-green-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Registration Open ({competitions.filter(c => c.status === 'registration_open').length})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'in_progress'
                ? 'bg-yellow-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            In Progress ({competitions.filter(c => c.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'completed'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Completed ({competitions.filter(c => c.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'cancelled'
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Cancelled ({competitions.filter(c => c.status === 'cancelled').length})
          </button>
        </div>
      </div>

      {/* Competitions Display */}
      {displayCompetitions.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
          <div className="text-6xl mb-4">🎭</div>
          <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
          <p className="text-gray-400 mb-4">
            {filter === 'all'
              ? 'No events have been created yet.'
              : filter === 'active'
              ? 'No active events found.'
              : `No ${filter.replace('_', ' ')} events found.`}
          </p>
          <Button asChild variant="primary" size="lg">
            <Link href="/dashboard/competitions/new">
              <Plus size={20} strokeWidth={2} />
              Create Your First Event
            </Link>
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/10 border-b border-white/10">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {sortColumn === 'name' && (
                        <span className="text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('year')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Year
                      {sortColumn === 'year' && (
                        <span className="text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  {isSuperAdmin && (
                    <th
                      onClick={() => handleSort('tenant')}
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Tenant
                        {sortColumn === 'tenant' && (
                          <span className="text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  )}
                  <th
                    onClick={() => handleSort('status')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortColumn === 'status' && (
                        <span className="text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('capacity')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Capacity Remaining
                      {sortColumn === 'capacity' && (
                        <span className="text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {displayCompetitions.map((competition) => {
                  const totalCapacity = competition.venue_capacity || 600;
                  const reservedCount = competition.reservations
                    ?.filter(r => r.status === 'approved')
                    .reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0) || 0;
                  const remainingSlots = totalCapacity - reservedCount;

                  return (
                    <tr
                      key={competition.id}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/competitions/${competition.id}/edit`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{competition.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{competition.year}</div>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {competition.tenants?.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {competition.tenants?.subdomain}.compsync.net
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          competition.status === 'registration_open' ? 'bg-green-500/20 text-green-400' :
                          competition.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                          competition.status === 'completed' ? 'bg-purple-500/20 text-purple-400' :
                          competition.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {competition.status?.replace('_', ' ') || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <span className="text-blue-400 font-semibold">{remainingSlots}</span>
                          <span className="text-gray-500"> / {totalCapacity}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClone(competition.id, competition.name, competition.year);
                            }}
                            className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-400/30 rounded hover:bg-green-500/30 transition-all"
                            disabled={cloneMutation.isPending}
                          >
                            Clone
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(competition.id, competition.name);
                            }}
                            className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-400/30 rounded hover:bg-red-500/30 transition-all"
                            disabled={deleteMutation.isPending}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayCompetitions.map((competition) => {
            // Calculate capacity metrics
            const totalCapacity = competition.venue_capacity || 600;
            const reservedCount = competition.reservations
              ?.filter(r => r.status === 'approved')
              .reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0) || 0;
            const remainingSlots = totalCapacity - reservedCount;

            return (
              <div
                key={competition.id}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all flex flex-col group cursor-pointer"
                onClick={() => router.push(`/dashboard/competitions/${competition.id}/edit`)}
              >
                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{competition.name}</h3>
                  <p className="text-gray-400 text-xs">Year: {competition.year}</p>
                  {isSuperAdmin && competition.tenants && (
                    <p className="text-gray-500 text-xs mt-1">{competition.tenants.name}</p>
                  )}
                </div>

                {/* Capacity Summary */}
                <div className="bg-white/5 rounded-lg p-3 mb-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Capacity</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total:</span>
                      <span className="text-white font-semibold">{totalCapacity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Reserved:</span>
                      <span className="text-green-400 font-semibold">{reservedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Remaining:</span>
                      <span className="text-blue-400 font-semibold">{remainingSlots}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto space-y-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClone(competition.id, competition.name, competition.year);
                    }}
                    className="w-full px-4 py-2 bg-green-500/20 text-green-400 border border-green-400/30 rounded-lg hover:bg-green-500/30 transition-all font-medium text-sm"
                    disabled={cloneMutation.isPending}
                  >
                    {cloneMutation.isPending ? 'Cloning...' : '📋 Clone'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(competition.id, competition.name);
                    }}
                    className="w-full px-4 py-2 bg-red-500/20 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-500/30 transition-all font-medium text-sm"
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
