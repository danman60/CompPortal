'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { parseISODateToUTC } from '@/lib/date-utils';
import { calculateAge, getAgeGroup } from '@/lib/ageGroupCalculator';

/**
 * Super Admin Dancers View
 * Multi-tenant view of all dancers across all studios and tenants with comprehensive filtering
 */
export function SADancersPageContainer() {
  // Filter state
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedStudioId, setSelectedStudioId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'inactive' | 'archived' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch data
  const { data: tenantsData, isLoading: tenantsLoading } = trpc.superAdmin.tenants.getAllTenants.useQuery();
  const { data: studiosData, isLoading: studiosLoading } = trpc.studio.getAll.useQuery({});

  // Fetch dancers with filters
  const { data: dancersData, isLoading: dancersLoading } = trpc.dancer.getAllForSuperAdmin.useQuery({
    tenantId: selectedTenantId || undefined,
    studioId: selectedStudioId || undefined,
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    search: searchQuery || undefined,
  });

  const tenants = tenantsData?.tenants || [];
  const studios = studiosData?.studios || [];
  const dancers = dancersData?.dancers || [];

  const isLoading = tenantsLoading || studiosLoading || dancersLoading;

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
            <h1 className="text-4xl font-bold text-white">All Dancers (SA)</h1>
            <p className="text-white/60 mt-2">
              Multi-tenant view • {dancers.length} dancers
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-4">
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
              <option value="active" className="bg-gray-900">Active</option>
              <option value="inactive" className="bg-gray-900">Inactive</option>
              <option value="archived" className="bg-gray-900">Archived</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Search</label>
          <input
            type="text"
            placeholder="Search by name, email, or registration number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
          <div className="text-white/60">Loading dancers...</div>
        </div>
      ) : dancers.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
          <div className="text-white/60">No dancers found matching the selected filters.</div>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/20">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Tenant
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Studio
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Birthdate
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Age Group
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Classification
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Routines
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {dancers.map((dancer: any) => {
                  const dob = parseISODateToUTC(dancer.date_of_birth);
                  const age = dob ? calculateAge(dob) : 0;
                  const ageGroup = getAgeGroup(age);
                  const routineCount = dancer._count?.entry_participants || 0;
                  const statusColor =
                    dancer.status === 'active' ? 'bg-green-500/20 text-green-300' :
                    dancer.status === 'inactive' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-gray-500/20 text-gray-300';

                  return (
                    <tr
                      key={dancer.id}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4 text-white font-medium">
                        {dancer.first_name} {dancer.last_name}
                      </td>
                      <td className="px-6 py-4 text-white/70">{dancer.tenants?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">{dancer.studios?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">
                        {dob ? dob.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          timeZone: 'UTC'
                        }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-white/70">{ageGroup}</td>
                      <td className="px-6 py-4 text-white/70">{dancer.classifications?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">{dancer.email || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">{routineCount}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                          {dancer.status}
                        </span>
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
