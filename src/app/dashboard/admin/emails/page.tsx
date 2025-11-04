'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';

export default function EmailMonitorPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'success' | 'failed'>('all');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, error } = trpc.superAdmin.emails.getEmailLogs.useQuery({
    search: search || undefined,
    status,
    tenantId: selectedTenantId || undefined,
    limit,
    offset: page * limit,
  });

  const { data: stats } = trpc.superAdmin.emails.getEmailStats.useQuery();
  const { data: tenants } = trpc.superAdmin.tenants.getAllTenants.useQuery();

  const emails = data?.emails || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const getStatusColor = (success: boolean) => {
    return success
      ? 'bg-green-500/20 border-green-400/30 text-green-300'
      : 'bg-red-500/20 border-red-400/30 text-red-300';
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
          <h1 className="text-4xl font-bold text-white mb-2">📧 Email Delivery Monitor</h1>
          <p className="text-gray-400">Track all emails sent through the system</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Total Emails</h3>
              <div className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Last 24 Hours</h3>
              <div className="text-2xl font-bold text-white">{stats.last24Hours.toLocaleString()}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Last 7 Days</h3>
              <div className="text-2xl font-bold text-white">{stats.last7Days.toLocaleString()}</div>
            </div>
            <div className={`backdrop-blur-md border rounded-lg p-4 ${
              stats.failed24Hours > 10 ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'
            }`}>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Failed (24h)</h3>
              <div className={`text-2xl font-bold ${
                stats.failed24Hours > 10 ? 'text-red-400' : 'text-white'
              }`}>
                {stats.failed24Hours}
              </div>
            </div>
            <div className={`backdrop-blur-md border rounded-lg p-4 ${
              stats.failed7Days > 50 ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'
            }`}>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Failed (7d)</h3>
              <div className={`text-2xl font-bold ${
                stats.failed7Days > 50 ? 'text-red-400' : 'text-white'
              }`}>
                {stats.failed7Days}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search email, subject, error..."
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

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as any);
                  setPage(0);
                }}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: 'white' }}
              >
                <option value="all" style={{ backgroundColor: '#1e293b', color: 'white' }}>All Status</option>
                <option value="success" style={{ backgroundColor: '#1e293b', color: 'white' }}>Delivered</option>
                <option value="failed" style={{ backgroundColor: '#1e293b', color: 'white' }}>Failed</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-400">
              Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total} emails
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

        {/* Email List */}
        {isLoading ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-12 text-center">
            <div className="text-gray-400">Loading emails...</div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400">Error loading emails: {error.message}</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-12 text-center">
            <p className="text-gray-400 mb-2">No emails found</p>
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
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Template
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {emails.map((email) => (
                    <tr key={email.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {formatDistanceToNow(new Date(email.sentAt), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(email.sentAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{email.recipientEmail}</div>
                        {email.studioName && (
                          <div className="text-xs text-gray-500">{email.studioName}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300 max-w-md truncate">
                          {email.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded text-xs bg-blue-500/20 border border-blue-400/30 text-blue-300">
                          {email.templateType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {email.tenant ? (
                          <>
                            <div className="text-sm text-gray-300">{email.tenant.name}</div>
                            <div className="text-xs text-gray-500">{email.tenant.subdomain}</div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500">N/A</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(email.success)}`}>
                          {email.success ? 'Delivered' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {email.errorMessage ? (
                          <details className="cursor-pointer">
                            <summary className="text-sm text-red-400 hover:text-red-300">
                              View Error
                            </summary>
                            <div className="mt-2 text-xs text-red-400 bg-black/30 p-2 rounded max-w-md">
                              {email.errorMessage}
                            </div>
                          </details>
                        ) : (
                          <div className="text-sm text-gray-500">-</div>
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
