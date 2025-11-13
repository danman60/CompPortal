'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';

interface RoutineVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredRoutineIds?: string[]; // Optional: only verify filtered routines
}

export function RoutineVerificationModal({
  isOpen,
  onClose,
  filteredRoutineIds,
}: RoutineVerificationModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'errors' | 'warnings' | 'passed'>('all');
  const [fixErrors, setFixErrors] = useState(true);
  const [fixWarningsPreNov12, setFixWarningsPreNov12] = useState(true);
  const [fixWarningsPostNov12, setFixWarningsPostNov12] = useState(false);
  const [notifyStudios, setNotifyStudios] = useState(false);

  // Verification query
  const { data: verificationData, isLoading: verifying, refetch } = trpc.superAdmin.verifyRoutines.useQuery(
    { routineIds: filteredRoutineIds },
    { enabled: isOpen }
  );

  // Apply corrections mutation
  const applyCorrections = trpc.superAdmin.applyRoutineCorrections.useMutation({
    onSuccess: () => {
      alert('Corrections applied successfully!');
      refetch();
    },
    onError: (error) => {
      alert(`Error applying corrections: ${error.message}`);
    },
  });

  if (!isOpen) return null;

  const results = verificationData?.results || [];
  const summary = verificationData?.summary || { total: 0, passed: 0, warnings: 0, errors: 0 };

  // Filter results by active tab
  const filteredResults = useMemo(() => {
    if (activeTab === 'all') return results;
    if (activeTab === 'passed') return results.filter((r: any) => r.severity === 'PASS');
    if (activeTab === 'warnings') return results.filter((r: any) => r.severity === 'WARNING');
    if (activeTab === 'errors') return results.filter((r: any) => r.severity === 'ERROR');
    return results;
  }, [results, activeTab]);

  // Calculate corrections count
  const correctionsCount = useMemo(() => {
    let count = 0;
    results.forEach((r: any) => {
      if (fixErrors && r.severity === 'ERROR') count++;
      if (fixWarningsPreNov12 && r.severity === 'WARNING' && r.createdBeforeNov12) count++;
      if (fixWarningsPostNov12 && r.severity === 'WARNING' && !r.createdBeforeNov12) count++;
    });
    return count;
  }, [results, fixErrors, fixWarningsPreNov12, fixWarningsPostNov12]);

  const handleApplyCorrections = () => {
    const corrections: any[] = [];

    results.forEach((r: any) => {
      const shouldFix =
        (fixErrors && r.severity === 'ERROR') ||
        (fixWarningsPreNov12 && r.severity === 'WARNING' && r.createdBeforeNov12) ||
        (fixWarningsPostNov12 && r.severity === 'WARNING' && !r.createdBeforeNov12);

      if (shouldFix) {
        corrections.push({
          routineId: r.routineId,
          newAge: r.proposedAge,
          newAgeGroupId: r.proposedAgeGroupId,
        });
      }
    });

    if (corrections.length === 0) {
      alert('No corrections to apply');
      return;
    }

    if (!confirm(`Apply ${corrections.length} corrections? This cannot be undone.`)) {
      return;
    }

    applyCorrections.mutate({
      corrections,
      notifyStudios,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold text-white">🔍 Routine Verification Results</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          <p className="text-white/60">
            Analyzed: {summary.total} routines across all tenants
          </p>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
              <p className="text-green-200 text-sm font-semibold">✅ PASSED</p>
              <p className="text-3xl font-bold text-white">{summary.passed}</p>
              <p className="text-sm text-green-200/60">{Math.round((summary.passed / summary.total) * 100)}%</p>
            </div>
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-200 text-sm font-semibold">🚨 ERRORS</p>
              <p className="text-3xl font-bold text-white">{summary.errors}</p>
              <p className="text-sm text-red-200/60">{Math.round((summary.errors / summary.total) * 100)}%</p>
            </div>
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
              <p className="text-yellow-200 text-sm font-semibold">⚠️ WARNINGS</p>
              <p className="text-3xl font-bold text-white">{summary.warnings}</p>
              <p className="text-sm text-yellow-200/60">{Math.round((summary.warnings / summary.total) * 100)}%</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 py-3 border-b border-white/10 bg-white/5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            All ({results.length})
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'errors'
                ? 'bg-red-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Errors ({summary.errors})
          </button>
          <button
            onClick={() => setActiveTab('warnings')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'warnings'
                ? 'bg-yellow-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Warnings ({summary.warnings})
          </button>
          <button
            onClick={() => setActiveTab('passed')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'passed'
                ? 'bg-green-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Passed ({summary.passed})
          </button>
        </div>

        {/* Results Table */}
        <div className="overflow-auto max-h-[40vh] p-6">
          {verifying ? (
            <div className="text-center py-12">
              <p className="text-white/60">Analyzing routines...</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/60">No results in this category</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-900 border-b border-white/10">
                <tr className="text-left">
                  <th className="p-3 text-white/80 font-semibold">ID</th>
                  <th className="p-3 text-white/80 font-semibold">Routine</th>
                  <th className="p-3 text-white/80 font-semibold">Tenant</th>
                  <th className="p-3 text-white/80 font-semibold">Issue</th>
                  <th className="p-3 text-white/80 font-semibold">Current</th>
                  <th className="p-3 text-white/80 font-semibold">Proposed Fix</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result: any) => (
                  <tr key={result.routineId} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3 text-white/60 text-sm font-mono">{result.routineId.slice(0, 8)}</td>
                    <td className="p-3">
                      <p className="text-white font-semibold">{result.routineTitle}</p>
                      <p className="text-white/40 text-sm">{result.studioName}</p>
                    </td>
                    <td className="p-3 text-white/60">{result.tenantName}</td>
                    <td className="p-3">
                      {result.severity === 'ERROR' && <span className="text-red-400 font-semibold">🚨 Age discrepancy: {result.discrepancy > 0 ? '+' : ''}{result.discrepancy}yr</span>}
                      {result.severity === 'WARNING' && <span className="text-yellow-400 font-semibold">⚠️ Age +1yr (may be override)</span>}
                      {result.severity === 'PASS' && <span className="text-green-400">✅ OK</span>}
                    </td>
                    <td className="p-3">
                      <p className="text-white">Age: {result.currentAge}</p>
                      <p className="text-white/40 text-sm">{result.currentAgeGroup}</p>
                    </td>
                    <td className="p-3">
                      {result.severity !== 'PASS' && (
                        <>
                          <p className="text-white">Age: {result.proposedAge}</p>
                          <p className="text-white/40 text-sm">{result.proposedAgeGroup}</p>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Auto-Correction Options */}
        {(summary.errors > 0 || summary.warnings > 0) && (
          <div className="p-6 border-t border-white/10 bg-white/5">
            <h3 className="text-xl font-bold text-white mb-4">🔄 Auto-Correction Options</h3>

            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fixErrors}
                  onChange={(e) => setFixErrors(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-white">
                  Fix all ERRORS automatically ({summary.errors} routines)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fixWarningsPreNov12}
                  onChange={(e) => setFixWarningsPreNov12(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-white">
                  Fix WARNINGS created before Nov 12 (likely bug)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fixWarningsPostNov12}
                  onChange={(e) => setFixWarningsPostNov12(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-white">
                  Fix WARNINGS created after Nov 12
                </span>
                <span className="text-yellow-400 text-sm">⚠️ May override intentional +1 age selections</span>
              </label>
            </div>

            <div className="mb-4">
              <p className="text-white font-semibold">Total corrections: {correctionsCount} routines</p>
            </div>

            {/* Studio Notification Toggle */}
            <div className="mb-4 p-4 bg-white/10 rounded-lg border border-white/20">
              <h4 className="text-white font-semibold mb-2">📧 Studio Notification</h4>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={!notifyStudios}
                  onChange={() => setNotifyStudios(false)}
                  className="w-4 h-4"
                />
                <span className="text-white">Don't notify studios (silent correction)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer mt-2">
                <input
                  type="radio"
                  checked={notifyStudios}
                  onChange={() => setNotifyStudios(true)}
                  className="w-4 h-4"
                />
                <span className="text-white">Notify affected studios after corrections applied</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleApplyCorrections}
                disabled={correctionsCount === 0 || applyCorrections.isPending}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applyCorrections.isPending ? 'Applying...' : `Apply Corrections (${correctionsCount})`}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
