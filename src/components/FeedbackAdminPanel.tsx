'use client';

/**
 * Feedback Admin Panel Component
 *
 * Super Admin interface for reviewing user feedback.
 * Features:
 * - Stats summary (total, by type, avg rating)
 * - Filterable feedback list (status, type)
 * - Quick actions (mark reviewed, change status)
 * - Admin notes editor
 * - Send Digest Now button
 *
 * Created: November 7, 2025
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

type FeedbackStatus = 'new' | 'reviewed' | 'actioned' | 'archived';
type FeedbackType = 'dream_feature' | 'clunky_experience' | 'bug_report' | 'general';

const feedbackTypeLabels: Record<FeedbackType, { icon: string; label: string; color: string }> = {
  dream_feature: { icon: '🌟', label: 'Dream Feature', color: 'bg-yellow-100 text-yellow-800' },
  clunky_experience: { icon: '🐌', label: 'Clunky Experience', color: 'bg-orange-100 text-orange-800' },
  bug_report: { icon: '🐛', label: 'Bug Report', color: 'bg-red-100 text-red-800' },
  general: { icon: '💬', label: 'General', color: 'bg-blue-100 text-blue-800' },
};

const statusColors: Record<FeedbackStatus, string> = {
  new: 'bg-green-100 text-green-800',
  reviewed: 'bg-blue-100 text-blue-800',
  actioned: 'bg-purple-100 text-purple-800',
  archived: 'bg-gray-100 text-gray-800',
};

export default function FeedbackAdminPanel() {
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<FeedbackType | undefined>(undefined);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Queries
  const { data: stats } = trpc.feedback.getStats.useQuery();
  const { data: feedbackData, refetch } = trpc.feedback.getAll.useQuery({
    status: statusFilter,
    feedbackType: typeFilter,
    limit: 50,
    offset: 0,
  });

  // Mutations
  const updateStatusMutation = trpc.feedback.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedFeedback(null);
      setAdminNotes('');
    },
  });

  const handleSendDigest = async () => {
    if (confirm('Send feedback digest email now?')) {
      try {
        const response = await fetch('/api/cron/feedback-digest', {
          method: 'GET',
        });
        const result = await response.json();
        if (result.success) {
          alert(`Digest sent successfully! ${result.count} feedback items included.`);
        } else {
          alert(`Failed to send digest: ${result.error}`);
        }
      } catch (error) {
        alert('Error sending digest. Check console for details.');
        console.error('Digest send error:', error);
      }
    }
  };

  const handleUpdateStatus = (feedbackId: string, status: FeedbackStatus) => {
    updateStatusMutation.mutate({
      feedbackId,
      status,
      adminNotes: adminNotes || undefined,
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Feedback Dashboard</h1>
            <p className="text-gray-600">Review and manage user feedback submissions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSendDigest}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Digest Now
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Feedback</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-1">New</div>
            <div className="text-3xl font-bold text-green-600">{stats.newCount}</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-1">Avg Rating</div>
            <div className="text-3xl font-bold text-yellow-600">
              {stats.averageRating ? `${stats.averageRating} ⭐` : 'N/A'}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-1">By Type</div>
            <div className="space-y-1 mt-2">
              {stats.byType.map((item) => (
                <div key={item.type} className="text-sm text-gray-700">
                  {feedbackTypeLabels[item.type as FeedbackType]?.icon || '📝'} {item.count}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus || undefined)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="actioned">Actioned</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={typeFilter || ''}
              onChange={(e) => setTypeFilter(e.target.value as FeedbackType || undefined)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="dream_feature">🌟 Dream Feature</option>
              <option value="clunky_experience">🐌 Clunky Experience</option>
              <option value="bug_report">🐛 Bug Report</option>
              <option value="general">💬 General</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Feedback Submissions ({feedbackData?.total || 0})
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {feedbackData?.feedback.map((item) => {
            const typeConfig = feedbackTypeLabels[item.feedback_type as FeedbackType];
            const isSelected = selectedFeedback === item.id;

            return (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeConfig?.color || 'bg-gray-100'}`}>
                        {typeConfig?.icon} {typeConfig?.label}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[item.status as FeedbackStatus]}`}>
                        {item.status}
                      </span>
                      {item.star_rating && (
                        <span className="text-sm">
                          {'⭐'.repeat(item.star_rating)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      <strong>{item.user_name || 'Anonymous'}</strong> ({item.user_email}) · {item.tenants.name} · {item.user_role === 'studio_director' ? 'SD' : 'CD'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFeedback(isSelected ? null : item.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    {isSelected ? 'Hide Actions' : 'Quick Actions'}
                  </button>
                </div>

                <div className="text-gray-900 mb-4 leading-relaxed">
                  {item.comment}
                </div>

                {item.page_url && (
                  <div className="text-xs text-gray-500 mb-2">
                    📍 {item.page_url}
                  </div>
                )}

                {/* Quick Actions */}
                {isSelected && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes (optional)</label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add notes about this feedback..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'reviewed')}
                        disabled={updateStatusMutation.isPending}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        Mark Reviewed
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'actioned')}
                        disabled={updateStatusMutation.isPending}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        Mark Actioned
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'archived')}
                        disabled={updateStatusMutation.isPending}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {feedbackData?.feedback.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No feedback found. Try adjusting your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
