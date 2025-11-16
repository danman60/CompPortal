'use client';

/**
 * Studio Requests Panel
 *
 * Displays studio scheduling requests for Competition Director:
 * - Shows all pending/completed/ignored requests
 * - Filter by status and studio
 * - Displays routine details with request notes
 * - Priority indicators (low/normal/high)
 * - Mark as completed/ignored actions
 * - Request count badge
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface StudioRequest {
  id: string;
  routineId: string;
  routineTitle: string;
  studioId: string;
  studioName: string;
  studioCode: string;
  note: string;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'completed' | 'ignored';
  createdAt: Date;
  updatedAt: Date;
}

interface StudioRequestsPanelProps {
  competitionId: string;
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
  onRoutineClick?: (routineId: string) => void;
}

export function StudioRequestsPanel({
  competitionId,
  tenantId,
  isOpen,
  onClose,
  onRoutineClick,
}: StudioRequestsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'ignored'>('pending');
  const [studioFilter, setStudioFilter] = useState<string | null>(null);

  const utils = trpc.useContext();

  // Fetch requests
  const { data: requestsData, isLoading } = trpc.scheduling.getStudioRequests.useQuery({
    competitionId,
    tenantId,
    filters: {
      status: statusFilter === 'all' ? undefined : statusFilter,
      studioId: studioFilter || undefined,
    },
  });

  const requests = requestsData || [];

  // Update request status
  const updateStatus = trpc.scheduling.updateRequestStatus.useMutation({
    onSuccess: () => {
      utils.scheduling.getStudioRequests.invalidate();
    },
  });

  const handleMarkCompleted = (requestId: string) => {
    updateStatus.mutate({
      noteId: requestId,
      status: 'completed',
    });
  };

  const handleMarkIgnored = (requestId: string) => {
    updateStatus.mutate({
      noteId: requestId,
      status: 'ignored',
    });
  };

  // Get priority styling
  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 border-red-500/50 text-red-300';
      case 'normal':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
      case 'low':
        return 'bg-gray-500/20 border-gray-500/50 text-gray-300';
      default:
        return 'bg-gray-500/20 border-gray-500/50 text-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'normal':
        return '🔵';
      case 'low':
        return '⚪';
      default:
        return '⚪';
    }
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'Pending' };
      case 'completed':
        return { bg: 'bg-green-500/20', text: 'text-green-300', label: 'Completed ✓' };
      case 'ignored':
        return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Ignored' };
      default:
        return { bg: 'bg-gray-500/20', text: 'text-gray-300', label: status };
    }
  };

  // Group requests by studio
  const uniqueStudios = Array.from(new Set(requests.map(r => r.studioId))).map(id => {
    const req = requests.find(r => r.studioId === id);
    return { id, name: req?.studioName || '', code: req?.studioCode || '' };
  });

  // Count by status
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;
  const ignoredCount = requests.filter(r => r.status === 'ignored').length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-gradient-to-br from-gray-900 to-gray-800 border-l border-white/20 z-50 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md border-b border-white/20 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Studio Requests</h2>
                <p className="text-xs text-gray-400">{requests.length} total requests</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status Filters */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Done ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter('ignored')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'ignored'
                  ? 'bg-gray-500/30 text-gray-300 border border-gray-500/50'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Ignored ({ignoredCount})
            </button>
          </div>

          {/* Studio Filter */}
          {uniqueStudios.length > 1 && (
            <select
              value={studioFilter || ''}
              onChange={(e) => setStudioFilter(e.target.value || null)}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            >
              <option value="">All Studios</option>
              {uniqueStudios.map(studio => (
                <option key={studio.id} value={studio.id}>
                  {studio.code} - {studio.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Request List */}
        <div className="overflow-y-auto h-full pb-20 p-4">
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-3" />
              <p className="text-purple-300 text-sm">Loading requests...</p>
            </div>
          )}

          {!isLoading && requests.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-gray-400">No requests found</p>
              <p className="text-sm text-gray-500 mt-1">
                {statusFilter === 'pending'
                  ? 'Studios haven\'t submitted any scheduling requests yet'
                  : `No ${statusFilter} requests`
                }
              </p>
            </div>
          )}

          {!isLoading && requests.length > 0 && (
            <div className="space-y-3">
              {requests.map((request: StudioRequest) => {
                const statusBadge = getStatusBadge(request.status);

                return (
                  <div
                    key={request.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-purple-500/30 transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => onRoutineClick?.(request.routineId)}
                          className="text-white font-medium hover:text-purple-300 transition-colors text-left"
                        >
                          {request.routineTitle}
                        </button>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                            {request.studioCode}
                          </span>
                          <span className="text-xs text-gray-400">{request.studioName}</span>
                        </div>
                      </div>

                      {/* Priority Badge */}
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getPriorityClasses(request.priority)}`}>
                        <span>{getPriorityIcon(request.priority)}</span>
                        <span className="capitalize">{request.priority}</span>
                      </div>
                    </div>

                    {/* Request Note */}
                    <div className="bg-white/5 rounded-lg p-3 mb-3">
                      <div className="text-xs text-purple-300 mb-1">Request:</div>
                      <div className="text-sm text-white">{request.note}</div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      {/* Status Badge */}
                      <div className={`px-2 py-1 rounded text-xs ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.label}
                      </div>

                      {/* Actions */}
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMarkCompleted(request.id)}
                            disabled={updateStatus.isPending}
                            className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            ✓ Done
                          </button>
                          <button
                            onClick={() => handleMarkIgnored(request.id)}
                            disabled={updateStatus.isPending}
                            className="px-3 py-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            Ignore
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-gray-500 mt-2">
                      Submitted {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Request Badge - Shows count of pending requests
 */
interface RequestBadgeProps {
  pendingCount: number;
  onClick: () => void;
  className?: string;
}

export function RequestBadge({ pendingCount, onClick, className = '' }: RequestBadgeProps) {
  if (pendingCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 rounded-full text-xs font-medium hover:bg-yellow-500/30 transition-all flex items-center gap-2 ${className}`}
    >
      <span>📋</span>
      <span>{pendingCount} pending request{pendingCount !== 1 ? 's' : ''}</span>
    </button>
  );
}
