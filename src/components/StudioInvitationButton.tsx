'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Studio Invitation Button
 * Super Admin only - sends account claiming invitations to pre-approved studios
 */
export default function StudioInvitationButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudios, setSelectedStudios] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const utils = trpc.useUtils();

  // Get unclaimed studios
  const { data: unclaimedData, isLoading } = trpc.studioInvitations.getUnclaimedStudios.useQuery();

  // Send invitations mutation
  const sendMutation = trpc.studioInvitations.sendInvitations.useMutation({
    onSuccess: (data) => {
      alert(
        `✅ Invitations sent!\n\nSent: ${data.sent}\nFailed: ${data.failed}\n\n${
          data.details.failed.length > 0
            ? `Failed studios:\n${data.details.failed.map((f) => `- ${f.studio}: ${f.error}`).join('\n')}`
            : ''
        }`
      );
      setIsModalOpen(false);
      setSelectedStudios(new Set());
      setIsSending(false);
      utils.studioInvitations.getUnclaimedStudios.invalidate();
    },
    onError: (error) => {
      alert(`❌ Failed to send invitations: ${error.message}`);
      setIsSending(false);
    },
  });

  const handleSend = () => {
    if (selectedStudios.size === 0) {
      alert('Please select at least one studio');
      return;
    }

    const confirmMessage = `Are you sure you want to send account claiming invitations to ${selectedStudios.size} studio(s)?\n\nThis will email them with their unique claim URL.`;

    if (confirm(confirmMessage)) {
      setIsSending(true);
      sendMutation.mutate({ studioIds: Array.from(selectedStudios) });
    }
  };

  const toggleStudio = (studioId: string) => {
    const newSelected = new Set(selectedStudios);
    if (newSelected.has(studioId)) {
      newSelected.delete(studioId);
    } else {
      newSelected.add(studioId);
    }
    setSelectedStudios(newSelected);
  };

  const selectAll = () => {
    if (!unclaimedData?.studios) return;
    const allIds = unclaimedData.studios.map((s) => s.id);
    setSelectedStudios(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedStudios(new Set());
  };

  const unclaimedCount = unclaimedData?.count || 0;

  return (
    <>
      {/* Main Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
      >
        <span>📧</span>
        <span>Send Studio Invitations</span>
        {unclaimedCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
            {unclaimedCount}
          </span>
        )}
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden border border-white/10">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Send Studio Invitations</h2>
                <p className="text-white/80 text-sm mt-1">
                  Select studios to receive account claiming emails
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors text-2xl"
                disabled={isSending}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                </div>
              ) : unclaimedData?.studios && unclaimedData.studios.length > 0 ? (
                <>
                  {/* Controls */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                    <div className="text-gray-300 text-sm">
                      {selectedStudios.size} of {unclaimedData.studios.length} selected
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAll}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        onClick={deselectAll}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-colors"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Studio List */}
                  <div className="space-y-2">
                    {unclaimedData.studios.map((studio) => (
                      <label
                        key={studio.id}
                        className={`block p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedStudios.has(studio.id)
                            ? 'bg-purple-500/10 border-purple-400/50'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedStudios.has(studio.id)}
                            onChange={() => toggleStudio(studio.id)}
                            className="mt-1 w-4 h-4 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-white">{studio.name}</span>
                              <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-400/30 rounded text-purple-300 text-xs font-semibold">
                                {studio.publicCode}
                              </span>
                            </div>
                            <div className="text-sm text-gray-400 space-y-1">
                              <div>📧 {studio.email}</div>
                              <div>
                                🏢 {studio.tenantName} ({studio.tenantSubdomain}.compsync.net)
                              </div>
                              <div>
                                📋 {studio.reservationCount} reservation{studio.reservationCount !== 1 ? 's' : ''}
                                {studio.competitions.length > 0 && (
                                  <span className="ml-2 text-gray-500">
                                    • {studio.competitions.join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">✅ No unclaimed studios found</p>
                  <p className="text-gray-500 text-sm mt-2">
                    All studios have already claimed their accounts
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {unclaimedData?.studios && unclaimedData.studios.length > 0 && (
              <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg font-semibold text-sm transition-colors"
                  disabled={isSending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending || selectedStudios.size === 0}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>📧</span>
                      <span>Send {selectedStudios.size > 0 && `(${selectedStudios.size})`}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
