'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';

export default function TenantManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = trpc.superAdmin.tenants.getAllTenants.useQuery({
    search: searchQuery || undefined,
    limit: 100,
  });

  const tenants = data?.tenants || [];
  const total = data?.total || 0;

  const getBrandingColor = (branding: any) => {
    if (branding && typeof branding === 'object') {
      return branding.primaryColor || '#8b5cf6';
    }
    return '#8b5cf6';
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
          <h1 className="text-4xl font-bold text-white mb-2">🏛️ Tenant Management</h1>
          <p className="text-gray-400">Manage competitions and branding across all tenants</p>
        </div>

        {/* Search */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
          <input
            type="text"
            placeholder="Search by name or subdomain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          <div className="mt-4 text-sm text-gray-400">
            Showing {tenants.length} of {total} tenants
          </div>
        </div>

        {/* Tenant List */}
        {isLoading ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-12 text-center">
            <div className="text-gray-400">Loading tenants...</div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400">Error loading tenants: {error.message}</p>
          </div>
        ) : tenants.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-12 text-center">
            <p className="text-gray-400 mb-2">No tenants found</p>
            <p className="text-gray-500 text-sm">Try adjusting your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors"
                style={{
                  borderColor: `${getBrandingColor(tenant.branding)}40`,
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{tenant.name}</h3>
                    <p className="text-sm text-gray-400">{tenant.subdomain}.compsync.net</p>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getBrandingColor(tenant.branding) }}
                  />
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Competitions</span>
                    <span className="font-semibold text-white">{tenant._count.competitions}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Studios</span>
                    <span className="font-semibold text-white">{tenant._count.studios}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Users</span>
                    <span className="font-semibold text-white">{tenant._count.user_profiles}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-500">
                    Created {formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Quick Link */}
                <div className="mt-4">
                  <a
                    href={`https://${tenant.subdomain}.compsync.net`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    Visit Site →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
