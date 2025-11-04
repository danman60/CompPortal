'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';

export default function ActivityLogsPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, error } = trpc.superAdmin.activityLogs.getActivityLogs.useQuery({
    search: search || undefined,
    action: action || undefined,
    entityType: entityType || undefined,
    tenantId: selectedTenantId || undefined,
    limit,
    offset: page * limit,
  });

  const { data: tenants } = trpc.superAdmin.tenants.getAllTenants.useQuery();

  const activities = data?.activities || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('approve')) {
      return 'bg-green-500/20 border-green-400/30 text-green-300';
    }
    if (action.includes('delete') || action.includes('reject')) {
      return 'bg-red-500/20 border-red-400/30 text-red-300';
    }
    if (action.includes('update') || action.includes('edit')) {
      return 'bg-blue-500/20 border-blue-400/30 text-blue-300';
    }
    return 'bg-gray-500/20 border-gray-400/30 text-gray-300';
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-500/20 border-purple-400/30 text-purple-300';
      case 'competition_director':
        return 'bg-blue-500/20 border-blue-400/30 text-blue-300';
      case 'studio_director':
        return 'bg-green-500/20 border-green-400/30 text-green-300';
      default:
        return 'bg-gray-500/20 border-gray-400/30 text-gray-300';
    }
  };

  const formatRole = (role: string | null) => {
    if (!role) return 'No Role';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-purple-400 hover:text-purple-300 text-sm inline-block mb-4"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">📋 Activity Logs</h1>
          <p className="text-gray-400">Monitor all system activity across tenants</p>
        </div>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search users, actions, entities..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Tenant Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tenant</label>
              <select
                value={selectedTenantId}
                onChange={(e) => {
                  setSelectedTenantId(e.target.value);
                  setPage(0);
                }}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: 'white' }}
              >
                <option value="" style={{ backgroundColor: '#1e293b', color: 'white' }}>All Tenants</option>
                {tenants?.tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id} style={{ backgroundColor: '#1e293b', color: 'white' }}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Action</label>
              <input
                type="text"
                placeholder="Filter by action..."
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(0);
                }}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Entity Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Entity Type</label>
              <select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value);
                  setPage(0);
                }}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: 'white' }}
              >
                <option value="" style={{ backgroundColor: '#1e293b', color: 'white' }}>All Types</option>
                <option value="user" style={{ backgroundColor: '#1e293b', color: 'white' }}>User</option>
                <option value="tenant" style={{ backgroundColor: '#1e293b', color: 'white' }}>Tenant</option>
                <option value="competition" style={{ backgroundColor: '#1e293b', color: 'white' }}>Competition</option>
                <option value="dancer" style={{ backgroundColor: '#1e293b', color: 'white' }}>Dancer</option>
                <option value="entry" style={{ backgroundColor: '#1e293b', color: 'white' }}>Entry</option>
                <option value="reservation" style={{ backgroundColor: '#1e293b', color: 'white' }}>Reservation</option>
                <option value="studio" style={{ backgroundColor: '#1e293b', color: 'white' }}>Studio</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-400">
              Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total} activities
            </div>

            {/* Pagination */}
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-400/30">
                Page {page + 1} of {totalPages || 1}
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1 || totalPages === 0}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Activity List */}
        {isLoading ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-12 text-center">
            <div className="text-gray-400">Loading activity logs...</div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400">Error loading activity logs: {error.message}</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-12 text-center">
            <p className="text-gray-400 mb-2">No activity logs found</p>
            <p className="text-gray-500 text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(activity.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{activity.user.name}</div>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getRoleColor(activity.user.role)}`}>
                          {formatRole(activity.user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getActionColor(activity.action)}`}>
                          {activity.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">
                          {activity.entityType}
                        </div>
                        {activity.entityName && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {activity.entityName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activity.tenant ? (
                          <>
                            <div className="text-sm text-gray-300">{activity.tenant.name}</div>
                            <div className="text-xs text-gray-500">{activity.tenant.subdomain}</div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500">N/A</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {activity.details ? (
                          <details className="cursor-pointer">
                            <summary className="text-sm text-purple-400 hover:text-purple-300">
                              View JSON
                            </summary>
                            <pre className="mt-2 text-xs text-gray-400 bg-black/30 p-2 rounded overflow-x-auto max-w-md">
                              {JSON.stringify(activity.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <div className="text-sm text-gray-500">No details</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
