'use client';

/**
 * Admin Failures Page
 *
 * View and manage failed operations (emails, API calls, file uploads).
 * Allows admins to retry or mark failures as resolved.
 *
 * Wave 3.2: Silent Failure Detection
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import type { FailureLog } from '@/lib/services/failureTracker';

export default function FailuresAdminPage() {
  const [selectedFailure, setSelectedFailure] = useState<FailureLog | null>(null);

  const { data: failures, refetch: refetchFailures, isLoading } = trpc.failure.getPending.useQuery();
  const { data: counts } = trpc.failure.getCountByStatus.useQuery();

  const retryMutation = trpc.failure.retry.useMutation({
    onSuccess: () => {
      refetchFailures();
      setSelectedFailure(null);
    },
  });

  const resolveMutation = trpc.failure.resolve.useMutation({
    onSuccess: () => {
      refetchFailures();
      setSelectedFailure(null);
    },
  });

  const markPermanentlyFailedMutation = trpc.failure.markPermanentlyFailed.useMutation({
    onSuccess: () => {
      refetchFailures();
      setSelectedFailure(null);
    },
  });

  const handleRetry = async (failureId: string) => {
    try {
      await retryMutation.mutateAsync({ id: failureId });
      alert('Retry initiated. Check email service to verify resolution.');
    } catch (error: any) {
      alert(`Retry failed: ${error.message}`);
    }
  };

  const handleResolve = async (failureId: string) => {
    if (confirm('Mark this failure as resolved?')) {
      await resolveMutation.mutateAsync({ id: failureId });
    }
  };

  const handleMarkPermanentlyFailed = async (failureId: string) => {
    if (confirm('Mark this failure as permanently failed? This cannot be undone.')) {
      await markPermanentlyFailedMutation.mutateAsync({ id: failureId });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
        <div className="text-white text-center">Loading failures...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">⚠️ Failed Operations</h1>
          <p className="text-white/70">
            Monitor and retry failed operations to ensure data integrity.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <div className="text-yellow-400 text-2xl font-bold">{counts?.pending || 0}</div>
            <div className="text-white/70 text-sm">Pending</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <div className="text-orange-400 text-2xl font-bold">{counts?.retrying || 0}</div>
            <div className="text-white/70 text-sm">Retrying</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <div className="text-green-400 text-2xl font-bold">{counts?.resolved || 0}</div>
            <div className="text-white/70 text-sm">Resolved</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
            <div className="text-red-400 text-2xl font-bold">{counts?.failed_permanently || 0}</div>
            <div className="text-white/70 text-sm">Permanently Failed</div>
          </div>
        </div>

        {/* Failures List */}
        {failures && failures.length > 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Pending Failures</h2>
            <div className="space-y-4">
              {failures.map((failure: FailureLog) => (
                <div
                  key={failure.id}
                  className="bg-white/5 rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xl">
                          {failure.operation_type === 'email' ? '📧' : '⚠️'}
                        </span>
                        <span className="font-semibold text-white">
                          {failure.operation_name}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            failure.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-orange-500/20 text-orange-300'
                          }`}
                        >
                          {failure.status}
                        </span>
                      </div>
                      <div className="text-white/70 text-sm mb-2">
                        <span className="font-medium">Error:</span> {failure.error_message}
                      </div>
                      {failure.entity_type && (
                        <div className="text-white/50 text-xs">
                          Entity: {failure.entity_type} ({failure.entity_id?.substring(0, 8)}...)
                        </div>
                      )}
                      <div className="text-white/50 text-xs mt-1">
                        {new Date(failure.created_at).toLocaleString()}
                        {failure.retry_count > 0 && ` • Retries: ${failure.retry_count}`}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRetry(failure.id)}
                        disabled={retryMutation.isPending}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Retry
                      </button>
                      <button
                        onClick={() => handleResolve(failure.id)}
                        disabled={resolveMutation.isPending}
                        className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => setSelectedFailure(failure)}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-sm font-medium transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
            <span className="text-6xl mb-4 block">✅</span>
            <h3 className="text-2xl font-bold text-white mb-2">All Clear!</h3>
            <p className="text-white/70">No pending failures to display.</p>
          </div>
        )}

        {/* Details Modal */}
        {selectedFailure && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl border border-white/20 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">Failure Details</h3>
                <button
                  onClick={() => setSelectedFailure(null)}
                  className="text-white/50 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4 text-white">
                <div>
                  <div className="text-white/50 text-sm">Operation</div>
                  <div className="font-medium">{selectedFailure.operation_name}</div>
                </div>
                <div>
                  <div className="text-white/50 text-sm">Type</div>
                  <div className="font-medium">{selectedFailure.operation_type}</div>
                </div>
                <div>
                  <div className="text-white/50 text-sm">Status</div>
                  <div className="font-medium">{selectedFailure.status}</div>
                </div>
                <div>
                  <div className="text-white/50 text-sm">Error Message</div>
                  <div className="font-medium">{selectedFailure.error_message}</div>
                </div>
                <div>
                  <div className="text-white/50 text-sm">Error Details</div>
                  <pre className="bg-black/30 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedFailure.error_details, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="text-white/50 text-sm">Created At</div>
                  <div className="font-medium">
                    {new Date(selectedFailure.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-white/50 text-sm">Retry Count</div>
                  <div className="font-medium">{selectedFailure.retry_count}</div>
                </div>
              </div>
              <div className="mt-6 flex space-x-2">
                <button
                  onClick={() => handleRetry(selectedFailure.id)}
                  disabled={retryMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Retry Operation
                </button>
                <button
                  onClick={() => handleResolve(selectedFailure.id)}
                  disabled={resolveMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Mark Resolved
                </button>
              </div>
              <div className="mt-2">
                <button
                  onClick={() => handleMarkPermanentlyFailed(selectedFailure.id)}
                  disabled={markPermanentlyFailedMutation.isPending}
                  className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Mark Permanently Failed
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
