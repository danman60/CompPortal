'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/rebuild/ui/Button';
import { Mail, Send, Eye, AlertCircle, CheckCircle } from 'lucide-react';

export default function DigestControlPage() {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [sendStatus, setSendStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Get all Competition Directors
  const { data: usersData } = trpc.superAdmin.users.getAllUsers.useQuery({
    role: 'competition_director',
    limit: 100,
  });

  // Preview digest mutation
  const previewMutation = trpc.superAdmin.digest.previewDigest.useQuery(
    { userId: selectedUserId },
    { enabled: false }
  );

  // Send digest to user mutation
  const sendDigestMutation = trpc.superAdmin.digest.sendDigestToUser.useMutation({
    onSuccess: (data) => {
      setSendStatus({
        type: 'success',
        message: `Digest sent successfully! ${data.summary.totalPendingActions} pending actions included.`,
      });
    },
    onError: (error) => {
      setSendStatus({
        type: 'error',
        message: error.message,
      });
    },
  });

  // Send scheduled digests mutation
  const sendScheduledMutation = trpc.superAdmin.digest.sendScheduledDigests.useMutation({
    onSuccess: (results) => {
      setSendStatus({
        type: 'success',
        message: `Batch complete: ${results.sent.length} sent, ${results.failed.length} failed, ${results.skipped.length} skipped.`,
      });
    },
    onError: (error) => {
      setSendStatus({
        type: 'error',
        message: error.message,
      });
    },
  });

  const handlePreview = async () => {
    if (!selectedUserId) {
      setSendStatus({ type: 'error', message: 'Please select a user' });
      return;
    }
    previewMutation.refetch();
  };

  const handleSendToUser = async () => {
    if (!selectedUserId) {
      setSendStatus({ type: 'error', message: 'Please select a user' });
      return;
    }
    sendDigestMutation.mutate({ userId: selectedUserId });
  };

  const handleSendScheduled = async () => {
    if (
      !confirm(
        'This will send digests to ALL Competition Directors who are due for their digest right now. Continue?'
      )
    ) {
      return;
    }
    sendScheduledMutation.mutate();
  };

  const users = usersData?.users || [];
  const previewData = previewMutation.data;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-purple-400 hover:text-purple-300 text-sm inline-block mb-4"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">📬 Daily Digest Control Panel</h1>
          <p className="text-gray-400">
            Test, preview, and manually trigger daily digest emails for Competition Directors
          </p>
        </div>

        {/* Status Messages */}
        {sendStatus.type && (
          <div
            className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
              sendStatus.type === 'success'
                ? 'bg-green-500/10 border-green-400/30 text-green-300'
                : 'bg-red-500/10 border-red-400/30 text-red-300'
            }`}
          >
            {sendStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {sendStatus.type === 'success' ? 'Success' : 'Error'}
              </p>
              <p className="text-sm mt-1">{sendStatus.message}</p>
            </div>
          </div>
        )}

        {/* Test Send Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">🧪 Test Send</h2>
          <p className="text-gray-400 mb-4">
            Send a test digest email to a specific Competition Director to verify content and
            formatting.
          </p>

          <div className="space-y-4">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Competition Director
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setSendStatus({ type: null, message: '' });
                }}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Select User --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.users.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handlePreview}
                disabled={!selectedUserId || previewMutation.isFetching}
                variant="secondary"
              >
                <Eye className="w-4 h-4 mr-2" />
                {previewMutation.isFetching ? 'Loading...' : 'Preview Content'}
              </Button>
              <Button
                onClick={handleSendToUser}
                disabled={!selectedUserId || sendDigestMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                {sendDigestMutation.isPending ? 'Sending...' : 'Send Digest'}
              </Button>
            </div>
          </div>

          {/* Preview Data */}
          {previewData && (
            <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
              <h3 className="text-lg font-semibold text-white mb-3">Preview Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <p className="text-gray-400">Total Pending Actions</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {previewData.summary.totalPendingActions}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Pending Reservations</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {previewData.pendingActions.reservationReviews.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Need approval</p>
                </div>
                <div>
                  <p className="text-gray-400">Summarized Reservations</p>
                  <p className="text-2xl font-bold text-green-400">
                    {previewData.pendingActions.summarizedReservations.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Need invoices</p>
                </div>
                <div>
                  <p className="text-gray-400">Draft Invoices</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {previewData.pendingActions.draftInvoices.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Need to be sent</p>
                </div>
                <div>
                  <p className="text-gray-400">Exception Requests</p>
                  <p className="text-2xl font-bold text-red-400">
                    {previewData.pendingActions.classificationRequests.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
                </div>
              </div>

              {previewData.summary.totalPendingActions === 0 && (
                <p className="text-amber-400 mt-4 text-sm">
                  ⚠️ This digest would be empty (no pending actions)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Batch Send Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">📤 Scheduled Batch Send</h2>
          <p className="text-gray-400 mb-4">
            Send digests to all Competition Directors who are currently due for their scheduled
            digest based on their preferences (daily, weekly, or monthly).
          </p>

          <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-300">
                <p className="font-medium mb-1">Manual Trigger</p>
                <p>
                  This checks current time against user preferences and sends to users who are due
                  right now. Normally triggered by Vercel cron job.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSendScheduled}
            disabled={sendScheduledMutation.isPending}
            variant="primary"
          >
            <Mail className="w-4 h-4 mr-2" />
            {sendScheduledMutation.isPending ? 'Processing...' : 'Send Scheduled Digests'}
          </Button>
        </div>

        {/* Tenant Digest Toggles */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">🔔 Tenant Digest Settings</h2>
          <p className="text-gray-400 mb-4">
            Enable or disable daily digest emails for each Competition Director. When disabled, no
            digest emails will be sent to that tenant.
          </p>

          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-600"
              >
                <div>
                  <p className="text-white font-medium">
                    {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.users.email}
                  </p>
                  <p className="text-sm text-gray-400">{user.users.email}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    className="sr-only peer"
                    disabled
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  <span className="ms-3 text-sm font-medium text-gray-400">
                    {true ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
            <p className="text-sm text-blue-300">
              💡 <strong>Coming Soon:</strong> Toggle functionality will be connected to tenant
              preferences in a future update.
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">ℹ️ How Daily Digests Work</h2>
          <div className="space-y-3 text-gray-300 text-sm">
            <div>
              <p className="font-medium text-white mb-1">Digest Content Includes:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400 ml-2">
                <li><strong>Pending Reservations:</strong> Studios awaiting approval/rejection</li>
                <li><strong>Summarized Reservations:</strong> Need invoices created</li>
                <li><strong>Draft Invoices:</strong> Need to be sent to studios</li>
                <li><strong>Exception Requests:</strong> Classification changes awaiting review</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-white mb-1">Scheduling:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400 ml-2">
                <li>Daily: Sent every day at configured time</li>
                <li>Weekly: Sent on specific day of week at configured time</li>
                <li>Monthly: Sent on specific day of month at configured time</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-white mb-1">Tenant Preferences:</p>
              <p className="text-gray-400 ml-2">
                Each Competition Director can enable/disable daily digest emails for their tenant.
                Configure preferences above.
              </p>
            </div>
            <div>
              <p className="font-medium text-white mb-1">Activation Status:</p>
              <p className="text-gray-400 ml-2">
                Vercel cron job is currently <strong className="text-amber-400">DISABLED</strong>.
                See README for activation instructions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
