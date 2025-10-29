'use client';

import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

interface SuggestionsPanelProps {
  scheduleId: string;
  suggestions: any[];
  onClose: () => void;
  onRefresh: () => void;
}

/**
 * Panel for CDs to review SD schedule suggestions
 */
export function SuggestionsPanel({ scheduleId, suggestions, onClose, onRefresh }: SuggestionsPanelProps) {
  const reviewSuggestion = trpc.scheduleBuilder.reviewSuggestion.useMutation({
    onSuccess: () => {
      toast.success('Suggestion reviewed');
      onRefresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleReview = (suggestionId: string, status: 'approved' | 'rejected', reviewedBy: string) => {
    reviewSuggestion.mutate({ suggestionId, status, reviewedBy });
  };

  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending');
  const reviewedSuggestions = suggestions.filter((s) => s.status !== 'pending');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-xl border border-white/20 max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-white/20">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              💬 Studio Suggestions
            </h2>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/70 transition-colors text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {/* Pending Suggestions */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-3">
              Pending Review ({pendingSuggestions.length})
            </h3>
            {pendingSuggestions.length === 0 ? (
              <p className="text-white/60 text-sm">No pending suggestions.</p>
            ) : (
              <div className="space-y-3">
                {pendingSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-white/10 backdrop-blur-md rounded-lg border border-yellow-400/30 p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-bold">
                          {suggestion.studios?.name || 'Unknown Studio'}
                        </h4>
                        <p className="text-white/60 text-sm capitalize">
                          {suggestion.suggestion_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-yellow-600/20 text-yellow-300 text-xs font-semibold rounded-full">
                        Pending
                      </span>
                    </div>

                    {suggestion.notes && (
                      <p className="text-white/70 text-sm mb-3 italic">"{suggestion.notes}"</p>
                    )}

                    <div className="bg-black/20 rounded p-2 mb-3">
                      <pre className="text-xs text-white/60 overflow-x-auto">
                        {JSON.stringify(suggestion.details, null, 2)}
                      </pre>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(suggestion.id, 'approved', 'CURRENT_USER_ID')}
                        disabled={reviewSuggestion.isPending}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 text-sm"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleReview(suggestion.id, 'rejected', 'CURRENT_USER_ID')}
                        disabled={reviewSuggestion.isPending}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 text-sm"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviewed Suggestions */}
          {reviewedSuggestions.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-3">
                Reviewed ({reviewedSuggestions.length})
              </h3>
              <div className="space-y-3">
                {reviewedSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={`bg-white/5 backdrop-blur-md rounded-lg border p-4 ${
                      suggestion.status === 'approved'
                        ? 'border-green-400/20'
                        : 'border-red-400/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-white/70 font-semibold">
                          {suggestion.studios?.name || 'Unknown Studio'}
                        </h4>
                        <p className="text-white/50 text-sm capitalize">
                          {suggestion.suggestion_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          suggestion.status === 'approved'
                            ? 'bg-green-600/20 text-green-300'
                            : 'bg-red-600/20 text-red-300'
                        }`}
                      >
                        {suggestion.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
