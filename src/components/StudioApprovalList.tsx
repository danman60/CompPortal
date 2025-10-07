'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import BulkStudioImportModal from './BulkStudioImportModal';

export default function StudioApprovalList() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.studio.getAll.useQuery();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalData, setRejectModalData] = useState<{ id: string; name: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  // Approval mutation
  const approveMutation = trpc.studio.approve.useMutation({
    onSuccess: () => {
      utils.studio.getAll.invalidate();
      setProcessingId(null);
    },
    onError: (error) => {
      alert(`Approval failed: ${error.message}`);
      setProcessingId(null);
    },
  });

  // Rejection mutation
  const rejectMutation = trpc.studio.reject.useMutation({
    onSuccess: () => {
      utils.studio.getAll.invalidate();
      setProcessingId(null);
      setRejectModalData(null);
      setRejectionReason('');
    },
    onError: (error) => {
      alert(`Rejection failed: ${error.message}`);
      setProcessingId(null);
    },
  });

  const handleApprove = (studioId: string) => {
    if (confirm('Are you sure you want to approve this studio?')) {
      setProcessingId(studioId);
      approveMutation.mutate({ id: studioId });
    }
  };

  const handleRejectClick = (studioId: string, studioName: string) => {
    setRejectModalData({ id: studioId, name: studioName });
  };

  const handleRejectConfirm = () => {
    if (!rejectModalData) return;

    setProcessingId(rejectModalData.id);
    rejectMutation.mutate({
      id: rejectModalData.id,
      reason: rejectionReason || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
        <div className="animate-spin text-6xl mb-4">⚙️</div>
        <p className="text-white">Loading studios...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-semibold text-white mb-2">No Data</h3>
        <p className="text-gray-400">Unable to load studios.</p>
      </div>
    );
  }

  const filteredStudios = data.studios.filter((studio) => {
    if (filter === 'all') return true;
    return studio.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Import Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowImportModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center gap-2"
        >
          <span>📁</span>
          <span>Import Studios from CSV</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === status
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && ` (${data.studios.filter((s) => s.status === status).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Studios List */}
      {filteredStudios.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Studios Found</h3>
          <p className="text-gray-400">
            {filter === 'pending'
              ? 'No studios pending approval.'
              : `No ${filter} studios.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredStudios.map((studio) => (
            <div
              key={studio.id}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:border-purple-400/50 transition-all"
            >
              <div className="flex items-start justify-between">
                {/* Studio Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">{studio.name}</h3>
                    {studio.code && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs font-mono rounded">
                        {studio.code}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-400">
                    {studio.email && (
                      <div>
                        📧 <a href={`mailto:${studio.email}`} className="text-blue-400 hover:underline">
                          {studio.email}
                        </a>
                      </div>
                    )}
                    {studio.phone && (
                      <div>
                        📞 <span className="text-gray-300">{studio.phone}</span>
                      </div>
                    )}
                    {(studio.city || studio.province || studio.country) && (
                      <div>
                        📍{' '}
                        <span className="text-gray-300">
                          {[studio.city, studio.province, studio.country]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                    {studio.created_at && (
                      <div>
                        🗓️ Registered{' '}
                        <span className="text-gray-300">
                          {new Date(studio.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="mt-3">
                    {studio.status === 'pending' && (
                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-sm font-medium rounded-full">
                        ⏳ Pending Approval
                      </span>
                    )}
                    {studio.status === 'approved' && (
                      <span className="px-3 py-1 bg-green-500/20 text-green-300 text-sm font-medium rounded-full">
                        ✅ Approved
                      </span>
                    )}
                    {studio.status === 'rejected' && (
                      <span className="px-3 py-1 bg-red-500/20 text-red-300 text-sm font-medium rounded-full">
                        ❌ Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {studio.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(studio.id)}
                      disabled={processingId === studio.id}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingId === studio.id ? '⏳' : '✅'} Approve
                    </button>
                    <button
                      onClick={() => handleRejectClick(studio.id, studio.name)}
                      disabled={processingId === studio.id}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingId === studio.id ? '⏳' : '❌'} Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-gray-900 border border-white/20 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Reject Studio: {rejectModalData.name}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for Rejection (Optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModalData(null);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-all"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <BulkStudioImportModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  );
}
