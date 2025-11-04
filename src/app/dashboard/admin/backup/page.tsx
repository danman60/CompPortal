'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';

export default function BackupRestorePage() {
  const [backupNotes, setBackupNotes] = useState('');

  const { data: dbInfo, isLoading: dbLoading } = trpc.superAdmin.backup.getDatabaseInfo.useQuery();
  const { data: backupHistory } = trpc.superAdmin.backup.getBackupHistory.useQuery();

  const createBackupMutation = trpc.superAdmin.backup.createBackupLog.useMutation({
    onSuccess: () => {
      alert('Backup logged successfully. Visit Supabase Dashboard to download.');
      setBackupNotes('');
    },
    onError: (error) => {
      alert(`Failed to log backup: ${error.message}`);
    },
  });

  const handleCreateBackup = async () => {
    const confirmed = confirm(
      'This will log a backup request. You will need to use the Supabase Dashboard to create and download the actual backup file. Continue?'
    );

    if (!confirmed) return;

    await createBackupMutation.mutateAsync({ notes: backupNotes });
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
          <h1 className="text-4xl font-bold text-white mb-2">💾 Backup & Restore</h1>
          <p className="text-gray-400">Manage database backups and restores</p>
        </div>

        {/* Database Info */}
        {dbLoading ? (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-12 text-center mb-6">
            <div className="text-gray-400">Loading database info...</div>
          </div>
        ) : dbInfo ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Database Size */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Database Size</h3>
              <div className="text-4xl font-bold text-purple-400 mb-2">
                {dbInfo.sizeMB.toFixed(2)} MB
              </div>
              <p className="text-sm text-gray-400">Total size of all tables</p>
            </div>

            {/* Largest Tables */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Largest Tables</h3>
              <div className="space-y-2">
                {dbInfo.tables.slice(0, 5).map((table, idx) => (
                  <div key={table.name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{idx + 1}. {table.name}</span>
                    <span className="text-purple-400 font-medium">
                      {table.rowCount.toLocaleString()} rows
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Create Backup */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create Backup</h3>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
            <p className="text-yellow-400 text-sm mb-2">
              ⚠️ Manual Backup Process
            </p>
            <p className="text-gray-300 text-sm">
              This will log your backup request. To create an actual backup, visit the{' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Supabase Dashboard
              </a>
              {' '}→ Database → Backups to create and download a backup file.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Backup Notes (Optional)
            </label>
            <textarea
              value={backupNotes}
              onChange={(e) => setBackupNotes(e.target.value)}
              placeholder="e.g., Before major migration, pre-deployment backup, etc."
              rows={3}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            onClick={handleCreateBackup}
            disabled={createBackupMutation.isPending}
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createBackupMutation.isPending ? 'Logging...' : 'Log Backup Request'}
          </button>
        </div>

        {/* Backup History */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Backup History</h3>

          {!backupHistory || backupHistory.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No backup history found</p>
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
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {backupHistory.map((backup) => (
                    <tr key={backup.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {formatDistanceToNow(new Date(backup.createdAt), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(backup.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          backup.action.includes('backup')
                            ? 'bg-blue-500/20 border-blue-400/30 text-blue-300'
                            : 'bg-green-500/20 border-green-400/30 text-green-300'
                        }`}>
                          {backup.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {backup.details ? (
                          <details className="cursor-pointer">
                            <summary className="text-sm text-purple-400 hover:text-purple-300">
                              View Details
                            </summary>
                            <pre className="mt-2 text-xs text-gray-400 bg-black/30 p-2 rounded overflow-x-auto max-w-md">
                              {JSON.stringify(backup.details, null, 2)}
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
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">Backup Instructions</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p><strong className="text-white">To create a backup:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Click "Log Backup Request" above</li>
              <li>Visit <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">Supabase Dashboard</a></li>
              <li>Go to Database → Backups</li>
              <li>Click "Create Backup" or download existing backup</li>
              <li>Save the backup file securely</li>
            </ol>
            <p className="mt-4"><strong className="text-white">To restore a backup:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Contact Supabase support or use CLI: <code className="bg-black/30 px-2 py-1 rounded text-purple-300">supabase db reset</code></li>
              <li>Import your backup SQL file</li>
              <li>Verify data integrity after restore</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
