'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';

export default function SystemHealthPage() {
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = trpc.superAdmin.health.getHealthMetrics.useQuery();
  const { data: slowQueries, isLoading: queriesLoading } = trpc.superAdmin.health.getSlowQueries.useQuery();

  const getHealthStatus = () => {
    if (!metrics) return { color: 'gray', text: 'Unknown' };

    const { database, activity, issues } = metrics;

    if (!database.healthy) {
      return { color: 'red', text: 'Critical' };
    }

    if (issues.capacityInconsistencies > 0 || activity.errors > 50) {
      return { color: 'yellow', text: 'Warning' };
    }

    if (database.latency > 500) {
      return { color: 'yellow', text: 'Degraded' };
    }

    return { color: 'green', text: 'Healthy' };
  };

  const status = getHealthStatus();

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
          <h1 className="text-4xl font-bold text-white mb-2">💚 System Health</h1>
          <p className="text-gray-400">Monitor system performance and issues</p>
        </div>

        {metricsLoading ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-12 text-center">
            <div className="text-gray-400">Loading health metrics...</div>
          </div>
        ) : metricsError ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400">Error loading health metrics: {metricsError.message}</p>
          </div>
        ) : !metrics ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-12 text-center">
            <p className="text-gray-400">No metrics available</p>
          </div>
        ) : (
          <>
            {/* Overall Status */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full ${
                  status.color === 'green' ? 'bg-green-500' :
                  status.color === 'yellow' ? 'bg-yellow-500' :
                  status.color === 'red' ? 'bg-red-500' : 'bg-gray-500'
                } animate-pulse`} />
                <div>
                  <h2 className="text-2xl font-bold text-white">System Status: {status.text}</h2>
                  <p className="text-gray-400 text-sm">Last checked: {new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Database Health */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Database</h3>
                <div className="flex items-baseline gap-2">
                  <div className={`w-3 h-3 rounded-full ${metrics.database.healthy ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-2xl font-bold text-white">
                    {metrics.database.healthy ? 'Healthy' : 'Down'}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Latency: {metrics.database.latency}ms
                </p>
                <p className="text-sm text-gray-400">
                  Storage: {metrics.database.storageMB.toFixed(2)} MB
                </p>
              </div>

              {/* User Count */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Total Users</h3>
                <div className="text-3xl font-bold text-white">{metrics.counts.users.toLocaleString()}</div>
                <p className="text-sm text-gray-400 mt-2">Across all tenants</p>
              </div>

              {/* Tenant Count */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Active Tenants</h3>
                <div className="text-3xl font-bold text-white">{metrics.counts.tenants.toLocaleString()}</div>
                <p className="text-sm text-gray-400 mt-2">Registered competitions</p>
              </div>

              {/* Entry Count */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Total Entries</h3>
                <div className="text-3xl font-bold text-white">{metrics.counts.entries.toLocaleString()}</div>
                <p className="text-sm text-gray-400 mt-2">Competition entries</p>
              </div>
            </div>

            {/* Activity & Errors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Recent Activity */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Activity (Last 24h)</h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-3xl font-bold text-white">{metrics.activity.last24Hours.toLocaleString()}</div>
                  <span className="text-gray-400">actions</span>
                </div>
                <div className="mt-4">
                  <Link
                    href="/dashboard/admin/activity-logs"
                    className="text-purple-400 hover:text-purple-300 text-sm"
                  >
                    View Activity Logs →
                  </Link>
                </div>
              </div>

              {/* Recent Errors */}
              <div className={`backdrop-blur-md border rounded-lg p-6 ${
                metrics.activity.errors > 50 ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'
              }`}>
                <h3 className="text-lg font-semibold text-white mb-4">Errors (Last 24h)</h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className={`text-3xl font-bold ${
                    metrics.activity.errors > 50 ? 'text-red-400' : 'text-white'
                  }`}>
                    {metrics.activity.errors}
                  </div>
                  <span className="text-gray-400">errors</span>
                </div>
                {metrics.activity.errors > 50 && (
                  <p className="text-sm text-red-400 mt-2">⚠️ High error rate detected</p>
                )}
              </div>
            </div>

            {/* Issues */}
            {metrics.issues.capacityInconsistencies > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-yellow-400 mb-4">
                  ⚠️ Capacity Inconsistencies Detected
                </h3>
                <p className="text-gray-300 mb-4">
                  {metrics.issues.capacityInconsistencies} competition(s) have capacity discrepancies
                </p>
                {metrics.issues.capacityDetails.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-yellow-500/30">
                        <tr>
                          <th className="text-left py-2 text-yellow-300">Competition</th>
                          <th className="text-right py-2 text-yellow-300">Max</th>
                          <th className="text-right py-2 text-yellow-300">Reserved</th>
                          <th className="text-right py-2 text-yellow-300">Available</th>
                          <th className="text-right py-2 text-yellow-300">Discrepancy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.issues.capacityDetails.map((issue: any) => (
                          <tr key={issue.id} className="border-b border-yellow-500/20">
                            <td className="py-2 text-gray-300">{issue.name}</td>
                            <td className="text-right text-gray-300">{issue.max_capacity}</td>
                            <td className="text-right text-gray-300">{issue.reserved_capacity}</td>
                            <td className="text-right text-gray-300">{issue.available_reservation_tokens}</td>
                            <td className="text-right text-yellow-400 font-medium">{issue.discrepancy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Slow Queries */}
            {!queriesLoading && slowQueries && (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Slow Queries (&gt;1s)</h3>
                {!slowQueries.enabled ? (
                  <p className="text-gray-400 text-sm">
                    pg_stat_statements extension not enabled
                  </p>
                ) : slowQueries.queries.length === 0 ? (
                  <p className="text-gray-400 text-sm">No slow queries detected</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-white/10">
                        <tr>
                          <th className="text-left py-2 text-gray-300">Query</th>
                          <th className="text-right py-2 text-gray-300">Calls</th>
                          <th className="text-right py-2 text-gray-300">Avg (ms)</th>
                          <th className="text-right py-2 text-gray-300">Max (ms)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slowQueries.queries.map((query: any, idx: number) => (
                          <tr key={idx} className="border-b border-white/5">
                            <td className="py-2 text-gray-300 font-mono text-xs max-w-md truncate">
                              {query.query}
                            </td>
                            <td className="text-right text-gray-300">{query.calls}</td>
                            <td className="text-right text-yellow-400">{query.mean_time_ms}</td>
                            <td className="text-right text-red-400">{query.max_time_ms}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
