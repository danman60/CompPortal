'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';

export default function AccountRecoveryPanel() {
  const [processingStudioId, setProcessingStudioId] = useState<string | null>(null);
  const [sendingEmailToStudioId, setSendingEmailToStudioId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testingManual, setTestingManual] = useState(false);

  const { data: orphanedStudios, isLoading, refetch } = trpc.accountRecovery.getOrphanedStudios.useQuery();
  const prepareRecoveryMutation = trpc.accountRecovery.prepareRecovery.useMutation();
  const sendEmailMutation = trpc.accountRecovery.sendRecoveryEmail.useMutation();

  const handlePrepareRecovery = async (studioId: string) => {
    if (!confirm('This will create an auth account and recovery token for this studio. Continue?')) {
      return;
    }

    setProcessingStudioId(studioId);
    try {
      await prepareRecoveryMutation.mutateAsync({ studioId });
      await refetch();
      alert('Recovery prepared successfully! You can now send the recovery email.');
    } catch (error) {
      alert(`Failed to prepare recovery: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingStudioId(null);
    }
  };

  const handleSendEmail = async (studioId: string) => {
    if (!confirm('This will send a recovery email to the studio. Continue?')) {
      return;
    }

    setSendingEmailToStudioId(studioId);
    try {
      await sendEmailMutation.mutateAsync({ studioId });
      await refetch();
      alert('Recovery email sent successfully!');
    } catch (error) {
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingEmailToStudioId(null);
    }
  };

  const handleManualTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    // Find studio by email
    const studio = orphanedStudios?.find((s) => s.email === testEmail);
    if (!studio) {
      alert(`No studio found with email: ${testEmail}. Make sure the studio exists and is orphaned.`);
      return;
    }

    // Prepare and send in sequence
    setTestingManual(true);
    try {
      // Step 1: Prepare recovery
      await prepareRecoveryMutation.mutateAsync({ studioId: studio.id });
      await refetch();

      // Step 2: Send email
      if (confirm(`Recovery prepared for ${studio.name}. Send recovery email now?`)) {
        await sendEmailMutation.mutateAsync({ studioId: studio.id });
        await refetch();
        alert(`Test recovery email sent to ${testEmail}!`);
      }
    } catch (error) {
      alert(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingManual(false);
      setTestEmail('');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Recovery</h1>
          <p className="text-gray-600">
            Manage studios with orphaned auth accounts (auth.users deleted but studio data remains)
          </p>
        </div>

        {/* Manual Test Section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">Manual Test</h3>
          <p className="text-sm text-yellow-800 mb-4">
            Enter any email address to test the recovery flow. The studio must exist and be orphaned.
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="studio@example.com"
              className="flex-1 px-4 py-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              disabled={testingManual}
            />
            <button
              onClick={handleManualTest}
              disabled={testingManual || !testEmail}
              className="px-6 py-2 bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingManual ? 'Processing...' : 'Test Recovery'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Orphaned Studios</div>
            <div className="text-3xl font-bold text-purple-600">{orphanedStudios?.length || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">With Recovery Tokens</div>
            <div className="text-3xl font-bold text-blue-600">
              {orphanedStudios?.filter((s) => s.has_recovery_token).length || 0}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Total Affected Dancers</div>
            <div className="text-3xl font-bold text-green-600">
              {orphanedStudios?.reduce((sum, s) => sum + s.dancer_count, 0) || 0}
            </div>
          </div>
        </div>

        {/* Studios List */}
        {!orphanedStudios || orphanedStudios.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-green-500 text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Clear!</h2>
            <p className="text-gray-600">No orphaned studios found. All studios have valid auth accounts.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Studio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dancers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orphanedStudios.map((studio) => (
                    <tr key={studio.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{studio.name}</div>
                          {studio.code && (
                            <div className="text-sm text-purple-600 font-mono">{studio.code}</div>
                          )}
                          <div className="text-sm text-gray-500">{studio.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div>{studio.tenants?.name}</div>
                        <div className="text-xs text-gray-400">{studio.tenants?.subdomain}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {studio.dancer_count} dancers
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {studio.has_recovery_token ? (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-1">
                              ✓ Ready
                            </span>
                            {studio.recovery_token_expires && (
                              <div className="text-xs text-gray-500">
                                Expires {formatDistanceToNow(new Date(studio.recovery_token_expires), { addSuffix: true })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Not Prepared
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          {!studio.has_recovery_token ? (
                            <button
                              onClick={() => handlePrepareRecovery(studio.id)}
                              disabled={processingStudioId === studio.id}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingStudioId === studio.id ? 'Preparing...' : 'Prepare Recovery'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendEmail(studio.id)}
                              disabled={sendingEmailToStudioId === studio.id}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {sendingEmailToStudioId === studio.id ? 'Sending...' : 'Send Email'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How Account Recovery Works</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li><strong>Prepare Recovery:</strong> Creates auth account with random password and generates recovery token</li>
            <li><strong>Send Email:</strong> Manually send recovery email with secure link (NEVER automatic)</li>
            <li><strong>User Flow:</strong> User clicks link → sets password → auto-login → sees all their data</li>
            <li><strong>Result:</strong> Studio reconnected, all dancers and data accessible</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
