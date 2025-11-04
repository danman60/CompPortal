'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';

export default function ImpersonationPage() {
  const [selectedUserId, setSelectedUserId] = useState('');

  const { data: history, refetch } = trpc.superAdmin.impersonation.getImpersonationHistory.useQuery();
  const { data: users } = trpc.superAdmin.users.getAllUsers.useQuery({ limit: 100 });

  const startImpersonationMutation = trpc.superAdmin.impersonation.startImpersonation.useMutation({
    onSuccess: (data) => {
      alert(`Impersonation logged for ${data.targetUser.email}. Full session switching requires additional client implementation.`);
      refetch();
      setSelectedUserId('');
    },
    onError: (error) => {
      alert(`Failed to start impersonation: ${error.message}`);
    },
  });

  const stopImpersonationMutation = trpc.superAdmin.impersonation.stopImpersonation.useMutation({
    onSuccess: () => {
      alert('Impersonation stopped and logged.');
      refetch();
    },
    onError: (error) => {
      alert(`Failed to stop impersonation: ${error.message}`);
    },
  });

  const handleStartImpersonation = async () => {
    if (!selectedUserId) {
      alert('Please select a user');
      return;
    }

    const user = users?.users.find(u => u.id === selectedUserId);
    const confirmed = confirm(
      `Start impersonating ${user?.first_name} ${user?.last_name} (${user?.users.email})?\n\nThis will be logged in the audit trail.`
    );

    if (!confirmed) return;

    await startImpersonationMutation.mutateAsync({ userId: selectedUserId });
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
          <h1 className="text-4xl font-bold text-white mb-2">👤 Impersonation Mode</h1>
          <p className="text-gray-400">View as another user for debugging (fully audited)</p>
        </div>

        {/* Warning */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-red-400 mb-2">⚠️ Security Notice</h3>
          <p className="text-gray-300 text-sm mb-2">
            All impersonation actions are logged and auditable. Use this feature responsibly and only for:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm ml-2">
            <li>Debugging user-reported issues</li>
            <li>Verifying permissions and access controls</li>
            <li>Testing user-specific workflows</li>
          </ul>
          <p className="text-yellow-400 text-sm mt-3">
            <strong>Note:</strong> This MVP logs impersonation requests but does not switch sessions. Full implementation requires client-side session management.
          </p>
        </div>

        {/* Start Impersonation */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Start Impersonation</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: 'white' }}
              >
                <option value="" style={{ backgroundColor: '#1e293b', color: 'white' }}>Choose a user...</option>
                {users?.users.map((user) => (
                  <option key={user.id} value={user.id} style={{ backgroundColor: '#1e293b', color: 'white' }}>
                    {user.first_name} {user.last_name} ({user.users.email}) - {user.role || 'No Role'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleStartImpersonation}
                disabled={!selectedUserId || startImpersonationMutation.isPending}
                className="w-full px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startImpersonationMutation.isPending ? 'Starting...' : 'Log Impersonation Start'}
              </button>
            </div>
          </div>
        </div>

        {/* Impersonation History */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Impersonation History</h3>

          {!history || history.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No impersonation history found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Target User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {history.map((record) => (
                    <tr key={record.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(record.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          record.action === 'impersonation.start'
                            ? 'bg-blue-500/20 border-blue-400/30 text-blue-300'
                            : 'bg-green-500/20 border-green-400/30 text-green-300'
                        }`}>
                          {record.action.replace('impersonation.', '')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{record.targetUserName}</div>
                        <div className="text-xs text-gray-500">{record.targetUserEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        {record.details ? (
                          <details className="cursor-pointer">
                            <summary className="text-sm text-purple-400 hover:text-purple-300">
                              View Details
                            </summary>
                            <pre className="mt-2 text-xs text-gray-400 bg-black/30 p-2 rounded overflow-x-auto max-w-md">
                              {JSON.stringify(record.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <div className="text-sm text-gray-500">No details</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {record.action === 'impersonation.start' && (
                          <button
                            onClick={() => stopImpersonationMutation.mutate({ targetUserId: record.targetUserId })}
                            disabled={stopImpersonationMutation.isPending}
                            className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-400/30 rounded hover:bg-red-500/30 transition-all text-xs disabled:opacity-50"
                          >
                            Log Stop
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Implementation Notes */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">Implementation Notes</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p><strong className="text-white">Current MVP:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Logs all impersonation requests to audit trail</li>
              <li>Tracks who impersonated whom and when</li>
              <li>Provides history of all impersonation sessions</li>
            </ul>
            <p className="mt-4"><strong className="text-white">Full Implementation TODO:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Client-side session switching (store original session, switch to target user)</li>
              <li>Banner component showing "Viewing as [User Name]" with Exit button</li>
              <li>Automatic timeout (e.g., 30 minutes max impersonation)</li>
              <li>Real-time permission/tenant context switching</li>
              <li>Prevent impersonating other Super Admins</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
