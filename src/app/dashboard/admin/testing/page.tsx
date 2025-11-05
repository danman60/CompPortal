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

  // Test invitation configuration
  const [testEmail, setTestEmail] = useState('djamusic@gmail.com');
  const [testSpaces, setTestSpaces] = useState(50);
  const [testDeposit, setTestDeposit] = useState(2000);
  const [testCompetitionId, setTestCompetitionId] = useState('');

  const { data: counts, refetch: refetchCounts, isLoading } = trpc.testing.getDataCounts.useQuery();
  const { data: competitions } = trpc.testing.getActiveCompetitions.useQuery();

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

  const prepareTestAccountMutation = trpc.testing.prepareTestAccount.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      return data.studioId;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendTestInvitationMutation = trpc.studioInvitations.sendInvitations.useMutation({
    onSuccess: (data) => {
      if (data.sent > 0) {
        toast.success(`Test invitation sent! IMPORTANT: Open claim link in INCOGNITO MODE to test full signup flow.`);
      } else {
        toast.error('Failed to send test invitation - studio may not exist or already claimed');
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
    if (!testCompetitionId) {
      toast.error('Please select a competition');
      return;
    }

    const selectedComp = competitions?.find(c => c.id === testCompetitionId);
    const confirmMsg = `Prepare and send test invitation to ${testEmail}?\n\nReservation Details:\n• Competition: ${selectedComp?.name}\n• Spaces: ${testSpaces} entries\n• Deposit: $${testDeposit}\n\nThis will:\n1. Delete any existing user account\n2. Reset studio to unclaimed state\n3. Create sample reservation\n4. Send invitation email`;

    if (confirm(confirmMsg)) {
      try {
        // Step 1: Prepare test account with custom data
        const prepareResult = await prepareTestAccountMutation.mutateAsync({
          email: testEmail,
          spaces: testSpaces,
          deposit: testDeposit,
          competitionId: testCompetitionId,
        });

        // Step 2: Send invitation using the studio ID
        await sendTestInvitationMutation.mutateAsync({
          studioIds: [prepareResult.studioId],
        });
      } catch (error) {
        console.error('Test invitation failed:', error);
      }
    }
  };

  const isProcessing = cleanSlateMutation.isPending || populateTestDataMutation.isPending || sendTestInvitationMutation.isPending || prepareTestAccountMutation.isPending;

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

        {/* Test New Routine Form Button */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border-2 border-cyan-500 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-4xl">🎵</span>
              <div>
                <h2 className="text-2xl font-bold text-white">Test New Routine Form</h2>
                <p className="text-white/70 text-sm">Test classification logic, extended time, title upgrade</p>
              </div>
            </div>

            <div className="bg-cyan-500/10 rounded-lg p-4 mb-4">
              <div className="text-cyan-200 text-sm mb-2 font-semibold">What you'll test:</div>
              <ul className="text-cyan-200/80 text-xs space-y-1 list-disc list-inside">
                <li><strong>Classification Auto-Calculation:</strong> Solo locked + "+1 Bump", Groups unlocked</li>
                <li><strong>Exception Request:</strong> "Exception Required" button for +2 levels or going down</li>
                <li><strong>Extended Time Pricing:</strong> $5 flat for solos, $2 per dancer for groups</li>
                <li><strong>Title Upgrade:</strong> Only shows for solos</li>
                <li>Age group and size category detection</li>
              </ul>
            </div>

            <div className="bg-yellow-500/10 rounded-lg p-4 mb-4">
              <div className="text-yellow-200 text-sm mb-2 font-semibold">Prerequisites:</div>
              <ul className="text-yellow-200/80 text-xs space-y-1 list-disc list-inside">
                <li>Button redirects to EMPWR tenant (empwr.compsync.net)</li>
                <li>SA owns "Test Studio - Daniel" with 100 dancers (all have classifications)</li>
                <li>Reservation e0c1eb3f approved for 100 entries</li>
                <li>Session transfers seamlessly - you stay logged in as SA</li>
              </ul>
            </div>

            <button
              onClick={() => {
                window.location.href = 'https://empwr.compsync.net/dashboard/entries';
              }}
              className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold text-lg transition-colors"
            >
              TEST ROUTINES DASHBOARD (→ EMPWR tenant)
            </button>
          </div>
        </div>

        {/* Test Invitation Section */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border-2 border-green-500 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-4xl">✉️</span>
              <div>
                <h2 className="text-2xl font-bold text-white">Test Account Claiming Workflow</h2>
                <p className="text-white/70 text-sm">Configure test reservation data</p>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setTestEmail('djamusic@gmail.com');
                  setTestSpaces(50);
                  setTestDeposit(2000);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Daniel Preset
              </button>
              <button
                onClick={() => {
                  setTestEmail('emily.einsmann@gmail.com');
                  setTestSpaces(75);
                  setTestDeposit(3000);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Emily Preset
              </button>
            </div>

            {/* Configuration Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-white/70 text-sm block mb-2">Test Email</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-green-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-white/70 text-sm block mb-2">Competition <span className="text-red-400">*</span></label>
                <select
                  value={testCompetitionId}
                  onChange={(e) => setTestCompetitionId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-500"
                  style={{ color: 'white' }}
                >
                  <option value="" style={{ backgroundColor: '#1e293b', color: 'white' }}>Select competition</option>
                  {competitions?.map((comp) => (
                    <option key={comp.id} value={comp.id} style={{ backgroundColor: '#1e293b', color: 'white' }}>
                      {comp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white/70 text-sm block mb-2">Entry Spaces</label>
                <input
                  type="number"
                  value={testSpaces}
                  onChange={(e) => setTestSpaces(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-green-500"
                  placeholder="50"
                  min="0"
                />
              </div>
              <div>
                <label className="text-white/70 text-sm block mb-2">Deposit Amount ($)</label>
                <input
                  type="number"
                  value={testDeposit}
                  onChange={(e) => setTestDeposit(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-green-500"
                  placeholder="2000"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="bg-green-500/10 rounded-lg p-4 mb-4">
              <div className="text-green-200 text-sm mb-2 font-semibold">This button will:</div>
              <ul className="text-green-200/80 text-xs space-y-1 list-disc list-inside">
                <li>Delete any existing user account for {testEmail}</li>
                <li>Reset test studio to unclaimed state (owner_id = NULL)</li>
                <li>Create sample reservation: {testSpaces} entries, ${testDeposit} deposit</li>
                <li>Send invitation email using SAME process as real studios</li>
              </ul>
            </div>

            <div className="bg-yellow-500/10 rounded-lg p-4 mb-4">
              <div className="text-yellow-200 text-sm mb-2 font-semibold">After clicking:</div>
              <ul className="text-yellow-200/80 text-xs space-y-1 list-disc list-inside">
                <li>Check {testEmail} inbox for invitation email</li>
                <li>Email will show: {testSpaces} entries • ${testDeposit} deposit</li>
                <li><strong>IMPORTANT: Open claim link in INCOGNITO MODE</strong> (to test signup flow)</li>
                <li>Complete signup with email/password</li>
                <li>After signup, you'll auto-claim the studio and see onboarding</li>
                <li>Dashboard should show the reservation with correct data</li>
              </ul>
            </div>

            <button
              onClick={handleSendTestInvitation}
              disabled={isProcessing}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {prepareTestAccountMutation.isPending ? 'Preparing...' : sendTestInvitationMutation.isPending ? 'Sending...' : 'PREPARE & SEND TEST INVITATION'}
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
