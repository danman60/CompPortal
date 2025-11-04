'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ClassificationRequestDetailModal } from './ClassificationRequestDetailModal';
import toast from 'react-hot-toast';

export function ClassificationRequestsPage() {
  const [view, setView] = useState<'card' | 'table'>('card');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'resolved' | 'all'>('pending');

  const { data, isLoading, refetch } = trpc.classificationRequest.getAll.useQuery({
    status: statusFilter,
  });

  const requests = data?.requests || [];

  const handleRequestClick = (requestId: string) => {
    setSelectedRequestId(requestId);
  };

  const handleCloseModal = () => {
    setSelectedRequestId(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
          <div className="text-white">Loading classification requests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Classification Exception Requests</h1>
        <p className="text-gray-300">Review and respond to classification exception requests from studios</p>
      </div>

      {/* Controls */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 mb-6">
        <div className="flex items-center justify-between">
          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setView('card')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                view === 'card'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Card View
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                view === 'table'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Table View
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
          >
            <option value="pending">Pending Only</option>
            <option value="approved">Approved</option>
            <option value="resolved">Resolved</option>
            <option value="all">All Requests</option>
          </select>
        </div>
      </div>

      {/* Empty State */}
      {requests.length === 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold text-white mb-2">No {statusFilter !== 'all' && statusFilter} requests</h3>
          <p className="text-gray-300">
            {statusFilter === 'pending'
              ? "You're all caught up! No pending classification requests at this time."
              : 'No requests found with the selected filter.'}
          </p>
        </div>
      )}

      {/* Card View */}
      {view === 'card' && requests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {requests.map((request: any) => {
            const studio = request.competition_entries?.reservations?.studios;
            const entry = request.competition_entries;
            const competition = request.competition_entries?.reservations?.competitions;
            const autoCalc = request.classifications_classification_exception_requests_auto_calculated_classification_idToclassifications;
            const requested = request.classifications_classification_exception_requests_requested_classification_idToclassifications;

            return (
              <div
                key={request.id}
                onClick={() => handleRequestClick(request.id)}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 cursor-pointer hover:bg-white/15 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{studio?.name || 'Unknown Studio'}</h3>
                    <p className="text-gray-300 text-sm">{competition?.event_name || 'Unknown Competition'}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    request.status === 'pending'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50'
                      : request.status === 'approved'
                      ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                  }`}>
                    {request.status.toUpperCase()}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div>
                    <span className="text-gray-400 text-sm">Routine:</span>
                    <span className="text-white ml-2 font-semibold">{entry?.title || 'Untitled'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Auto-Calculated:</span>
                    <span className="text-white ml-2">{autoCalc?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Requested:</span>
                    <span className="text-orange-400 ml-2 font-semibold">{requested?.name || 'N/A'}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  Submitted {new Date(request.created_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && requests.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Studio</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Routine</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Auto-Calc</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Requested</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {requests.map((request: any) => {
                const studio = request.competition_entries?.reservations?.studios;
                const entry = request.competition_entries;
                const autoCalc = request.classifications_classification_exception_requests_auto_calculated_classification_idToclassifications;
                const requested = request.classifications_classification_exception_requests_requested_classification_idToclassifications;

                return (
                  <tr
                    key={request.id}
                    onClick={() => handleRequestClick(request.id)}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {studio?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {entry?.title || 'Untitled'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {autoCalc?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-400 font-semibold">
                      {requested?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        request.status === 'pending'
                          ? 'bg-orange-500/20 text-orange-300'
                          : request.status === 'approved'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequestId && (
        <ClassificationRequestDetailModal
          requestId={selectedRequestId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
