'use client';

/**
 * Admin Testing Tools Page
 *
 * Super Admin Only - Testing Tools for Development/Staging
 *
 * Features:
 * - CLEAN SLATE: Wipe all user data (preserves system configuration)
 * - POPULATE TEST DATA: Generate realistic test studios/dancers/entries
 * - Data counts dashboard
 *
 * Wave 4.0: Testing Infrastructure
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

export default function TestingToolsPage() {
  const [isCleanSlateModalOpen, setIsCleanSlateModalOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [wipeOptions, setWipeOptions] = useState({
    studios: true,
    dancers: true,
    entries: true,
    reservations: true,
    invoices: true,
    judges: true,
    sessions: true,
    scores: true,
  });

  const { data: counts, refetch: refetchCounts, isLoading } = trpc.testing.getDataCounts.useQuery();

  const cleanSlateMutation = trpc.testing.cleanSlate.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchCounts();
      setIsCleanSlateModalOpen(false);
      setConfirmationText('');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const populateTestDataMutation = trpc.testing.populateTestData.useMutation({
    onSuccess: () => {
      toast.success('Test data populated successfully');
      refetchCounts();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendTestInvitationMutation = trpc.studioInvitations.sendInvitations.useMutation({
    onSuccess: (data) => {
      if (data.sent > 0) {
        toast.success(`Test invitation sent to daniel@streamstage.live`);
      } else {
        toast.error('Failed to send test invitation');
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCleanSlate = async () => {
    if (confirmationText !== 'DELETE ALL DATA') {
      toast.error('Please type "DELETE ALL DATA" to confirm');
      return;
    }

    await cleanSlateMutation.mutateAsync({
      confirmation: confirmationText,
      wipeOptions,
    });
  };

  const handlePopulateTestData = async () => {
    if (confirm('Create ~20 test studios with dancers, entries, and reservations?')) {
      await populateTestDataMutation.mutateAsync();
    }
  };

  const handleSendTestInvitation = async () => {
    if (confirm('Send test invitation to daniel@streamstage.live?')) {
      // Find the test studio ID
      await sendTestInvitationMutation.mutateAsync({
        studioIds: ['a64db808-ff4e-4799-9f27-8550db3fff9e'], // Test Studio - Daniel
      });
    }
  };

  const isProcessing = cleanSlateMutation.isPending || populateTestDataMutation.isPending || sendTestInvitationMutation.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
        <div className="text-white text-center">Loading testing tools...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/dashboard"
            className="inline-flex items-center text-white/70 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </a>
          <h1 className="text-4xl font-bold text-white mb-2">🧪 Testing Tools</h1>
          <p className="text-white/70">
            Super Admin tools for cleaning and populating test data (Development/Staging only)
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 mb-8">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <div className="text-red-300 font-bold text-lg">Super Admin Only</div>
              <div className="text-red-200 text-sm">
                These tools will delete or create large amounts of data. Use with caution.
              </div>
            </div>
          </div>
        </div>

        {/* Current Data Counts */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">📊 Current Database State</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
              <div className="text-blue-400 text-3xl font-bold">{counts?.studios || 0}</div>
              <div className="text-white/70 text-sm">Studios</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
              <div className="text-green-400 text-3xl font-bold">{counts?.dancers || 0}</div>
              <div className="text-white/70 text-sm">Dancers</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
              <div className="text-purple-400 text-3xl font-bold">{counts?.entries || 0}</div>
              <div className="text-white/70 text-sm">Entries</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
              <div className="text-yellow-400 text-3xl font-bold">{counts?.reservations || 0}</div>
              <div className="text-white/70 text-sm">Reservations</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
              <div className="text-orange-400 text-3xl font-bold">{counts?.invoices || 0}</div>
              <div className="text-white/70 text-sm">Invoices</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
              <div className="text-cyan-400 text-3xl font-bold">{counts?.competitions || 0}</div>
              <div className="text-white/70 text-sm">Competitions</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
              <div className="text-pink-400 text-3xl font-bold">{counts?.sessions || 0}</div>
              <div className="text-white/70 text-sm">Sessions</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
              <div className="text-red-400 text-3xl font-bold">{counts?.judges || 0}</div>
              <div className="text-white/70 text-sm">Judges</div>
            </div>
          </div>
        </div>

        {/* Test Invitation Section */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border-2 border-green-500 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-4xl">✉️</span>
              <div>
                <h2 className="text-2xl font-bold text-white">TEST INVITATION</h2>
                <p className="text-white/70 text-sm">Send test email to daniel@streamstage.live</p>
              </div>
            </div>

            <div className="bg-green-500/10 rounded-lg p-4 mb-4">
              <div className="text-green-200 text-sm mb-2 font-semibold">Test studio details:</div>
              <ul className="text-green-200/80 text-xs space-y-1 list-disc list-inside">
                <li>Studio: Test Studio - Daniel</li>
                <li>Email: daniel@streamstage.live</li>
                <li>Claim Code: TEST1</li>
                <li>Tenant: EMPWR</li>
                <li>Status: Unclaimed (owner_id = NULL)</li>
              </ul>
            </div>

            <button
              onClick={handleSendTestInvitation}
              disabled={isProcessing}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendTestInvitationMutation.isPending ? 'Sending...' : 'SEND TEST INVITATION'}
            </button>
          </div>
        </div>

        {/* Two Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* CLEAN SLATE Section */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border-2 border-red-500 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-4xl">🗑️</span>
              <div>
                <h2 className="text-2xl font-bold text-white">CLEAN SLATE</h2>
                <p className="text-white/70 text-sm">Wipe all test data</p>
              </div>
            </div>

            <div className="bg-red-500/10 rounded-lg p-4 mb-4">
              <div className="text-red-200 text-sm mb-2 font-semibold">What gets deleted:</div>
              <ul className="text-red-200/80 text-xs space-y-1 list-disc list-inside">
                <li>All studios and studio director accounts</li>
                <li>All dancers and entry participants</li>
                <li>All competition entries</li>
                <li>All reservations</li>
                <li>All invoices and invoice items</li>
                <li>All judges and sessions</li>
                <li>All scores and time blocks</li>
              </ul>
            </div>

            <div className="bg-green-500/10 rounded-lg p-4 mb-4">
              <div className="text-green-200 text-sm mb-2 font-semibold">What gets preserved:</div>
              <ul className="text-green-200/80 text-xs space-y-1 list-disc list-inside">
                <li>CD and SA user accounts</li>
                <li>Tenant settings</li>
                <li>Age groups and size categories</li>
                <li>Competition categories and settings</li>
                <li>EMPWR competition dates</li>
              </ul>
            </div>

            <button
              onClick={() => setIsCleanSlateModalOpen(true)}
              disabled={isProcessing}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cleanSlateMutation.isPending ? 'Cleaning...' : 'CLEAN SLATE'}
            </button>
          </div>

          {/* POPULATE TEST DATA Section */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border-2 border-blue-500 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-4xl">🎭</span>
              <div>
                <h2 className="text-2xl font-bold text-white">POPULATE TEST DATA</h2>
                <p className="text-white/70 text-sm">Generate realistic test data</p>
              </div>
            </div>

            <div className="bg-blue-500/10 rounded-lg p-4 mb-4">
              <div className="text-blue-200 text-sm mb-2 font-semibold">What gets created:</div>
              <ul className="text-blue-200/80 text-xs space-y-1 list-disc list-inside">
                <li><strong>20 studios</strong> with realistic names (faker)</li>
                <li><strong>~200 dancers</strong> (8-12 per studio, ages 5-18)</li>
                <li><strong>~100 entries</strong> in various states (draft, submitted, scheduled)</li>
                <li><strong>~25 reservations</strong> (approved, rejected, pending)</li>
                <li><strong>~10 invoices</strong> (some paid, some pending)</li>
                <li>Predictable emails: testsd1@test.com, testsd2@test.com, etc.</li>
              </ul>
            </div>

            <div className="bg-purple-500/10 rounded-lg p-4 mb-4">
              <div className="text-purple-200 text-sm mb-2 font-semibold">Test scenarios included:</div>
              <ul className="text-purple-200/80 text-xs space-y-1 list-disc list-inside">
                <li>3 new studios (no reservations)</li>
                <li>5 studios with approved reservations only</li>
                <li>8 studios with entries in various states</li>
                <li>3 studios fully complete with paid invoices</li>
                <li>1 edge case (rejected reservation)</li>
              </ul>
            </div>

            <button
              onClick={handlePopulateTestData}
              disabled={isProcessing}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {populateTestDataMutation.isPending ? 'Populating...' : 'POPULATE TEST DATA'}
            </button>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-white"></div>
              <div className="text-white">
                <div className="font-bold">Processing...</div>
                <div className="text-sm text-white/70">
                  {cleanSlateMutation.isPending && 'Cleaning database...'}
                  {populateTestDataMutation.isPending && 'Creating test data...'}
                </div>
              </div>
            </div>
            <div className="mt-4 bg-white/5 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full animate-pulse w-full"></div>
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h3 className="text-xl font-bold text-white mb-3">📖 Usage Instructions</h3>
          <div className="text-white/80 text-sm space-y-2">
            <p>
              <strong>Before live testing session:</strong> Run CLEAN SLATE to remove previous test data, then POPULATE TEST DATA to create fresh realistic data.
            </p>
            <p>
              <strong>Test credentials:</strong> testsd1@test.com through testsd20@test.com (password: standard test password)
            </p>
            <p>
              <strong>After testing:</strong> Run CLEAN SLATE again to prepare for next session.
            </p>
            <p className="text-red-300">
              <strong>Warning:</strong> These tools are disabled in production. They only work in development/staging environments.
            </p>
          </div>
        </div>
      </div>

      {/* Clean Slate Confirmation Modal */}
      {isCleanSlateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl border-2 border-red-500 p-6 max-w-md w-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-4xl">⚠️</span>
                <h3 className="text-2xl font-bold text-white">Confirm CLEAN SLATE</h3>
              </div>
              <button
                onClick={() => {
                  setIsCleanSlateModalOpen(false);
                  setConfirmationText('');
                }}
                className="text-white/50 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <p className="text-white/80 mb-4">
                This will <strong className="text-red-400">permanently delete</strong> all selected data types.
                This action cannot be undone.
              </p>

              {/* Wipe Options Checkboxes */}
              <div className="bg-white/5 rounded-lg p-4 mb-4 space-y-2">
                <div className="text-white/70 text-sm font-semibold mb-2">Select data to wipe:</div>
                {Object.entries(wipeOptions).map(([key, value]) => (
                  <label key={key} className="flex items-center space-x-2 text-white/80 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setWipeOptions({ ...wipeOptions, [key]: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="capitalize">{key}</span>
                  </label>
                ))}
              </div>

              <div className="text-white/70 text-sm mb-2">
                Type <strong className="text-red-400">DELETE ALL DATA</strong> to confirm:
              </div>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="DELETE ALL DATA"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-red-500"
                autoFocus
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setIsCleanSlateModalOpen(false);
                  setConfirmationText('');
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCleanSlate}
                disabled={confirmationText !== 'DELETE ALL DATA'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
