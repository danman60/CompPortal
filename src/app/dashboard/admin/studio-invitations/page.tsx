'use client';

/**
 * Studio Invitations Management
 * Super Admin Only - Send account claiming invitations to pre-approved studios
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function StudioInvitationsPage() {
  const [selectedStudios, setSelectedStudios] = useState<Set<string>>(new Set());
  const [sendingInvites, setSendingInvites] = useState(false);

  const { data, refetch, isLoading } = trpc.studioInvitations.getUnclaimedStudios.useQuery();
  const sendInvitationsMutation = trpc.studioInvitations.sendInvitations.useMutation({
    onSuccess: (result) => {
      toast.success(`Sent ${result.sent} invitation(s)`);
      if (result.failed > 0) {
        toast.error(`Failed to send ${result.failed} invitation(s)`);
      }
      setSelectedStudios(new Set());
      refetch();
      setSendingInvites(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setSendingInvites(false);
    },
  });

  const handleToggleStudio = (studioId: string) => {
    const newSelected = new Set(selectedStudios);
    if (newSelected.has(studioId)) {
      newSelected.delete(studioId);
    } else {
      newSelected.add(studioId);
    }
    setSelectedStudios(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedStudios.size === data?.studios.length) {
      setSelectedStudios(new Set());
    } else {
      setSelectedStudios(new Set(data?.studios.map((s) => s.id) || []));
    }
  };

  const handleSendInvitations = async () => {
    if (selectedStudios.size === 0) {
      toast.error('Please select at least one studio');
      return;
    }

    const confirmed = confirm(
      `Send invitations to ${selectedStudios.size} studio(s)?\n\nThis will email them with their claim link.`
    );
    if (!confirmed) return;

    setSendingInvites(true);
    await sendInvitationsMutation.mutateAsync({
      studioIds: Array.from(selectedStudios),
    });
  };

  const handleResendInvitation = async (studioId: string, studioName: string) => {
    const confirmed = confirm(`Re-send invitation to "${studioName}"?`);
    if (!confirmed) return;

    setSendingInvites(true);
    await sendInvitationsMutation.mutateAsync({
      studioIds: [studioId],
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
        <div className="text-white text-center">Loading studios...</div>
      </div>
    );
  }

  const unclaimedStudios = data?.studios || [];
  const invitedStudios = unclaimedStudios.filter((s) => s.invitedAt !== null);
  const notInvitedStudios = unclaimedStudios.filter((s) => s.invitedAt === null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Studio Invitations</h1>
          <p className="text-gray-300">Send account claiming invitations to pre-approved studios</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">{unclaimedStudios.length}</div>
            <div className="text-gray-300 text-sm">Total Unclaimed Studios</div>
          </div>
          <div className="bg-green-500/20 backdrop-blur-md rounded-xl p-6 border border-green-400/30">
            <div className="text-3xl font-bold text-green-300 mb-2">{invitedStudios.length}</div>
            <div className="text-gray-300 text-sm">Invitations Sent</div>
          </div>
          <div className="bg-yellow-500/20 backdrop-blur-md rounded-xl p-6 border border-yellow-400/30">
            <div className="text-3xl font-bold text-yellow-300 mb-2">{notInvitedStudios.length}</div>
            <div className="text-gray-300 text-sm">Pending Invitations</div>
          </div>
        </div>

        {/* Bulk Actions */}
        {unclaimedStudios.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudios.size === unclaimedStudios.length}
                    onChange={handleToggleAll}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <span className="font-medium">
                    {selectedStudios.size === unclaimedStudios.length ? 'Deselect All' : 'Select All'}
                  </span>
                </label>
                {selectedStudios.size > 0 && (
                  <span className="text-gray-300 text-sm">{selectedStudios.size} selected</span>
                )}
              </div>
              <button
                onClick={handleSendInvitations}
                disabled={selectedStudios.size === 0 || sendingInvites}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingInvites ? 'Sending...' : `Send Invitations (${selectedStudios.size})`}
              </button>
            </div>
          </div>
        )}

        {/* Studios List */}
        {unclaimedStudios.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 border border-white/20 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-white mb-2">All Studios Claimed!</h3>
            <p className="text-gray-300">There are no unclaimed studios at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {unclaimedStudios.map((studio) => (
              <div
                key={studio.id}
                className={`bg-white/10 backdrop-blur-md rounded-xl p-6 border transition-all duration-200 ${
                  selectedStudios.has(studio.id)
                    ? 'border-green-400 bg-green-500/10'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedStudios.has(studio.id)}
                    onChange={() => handleToggleStudio(studio.id)}
                    className="w-5 h-5 mt-1 rounded border-gray-300 cursor-pointer"
                  />

                  {/* Studio Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{studio.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-300">
                          <span>Code: <span className="font-mono font-bold text-purple-300">{studio.publicCode}</span></span>
                          <span>•</span>
                          <span>{studio.email}</span>
                          <span>•</span>
                          <span className="text-blue-300">{studio.tenantName}</span>
                        </div>
                      </div>
                      {studio.invitedAt && (
                        <div className="flex flex-col items-end gap-2">
                          <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                            Invited {formatDistanceToNow(new Date(studio.invitedAt), { addSuffix: true })}
                          </span>
                          <button
                            onClick={() => handleResendInvitation(studio.id, studio.name)}
                            disabled={sendingInvites}
                            className="text-xs text-blue-300 hover:text-blue-200 underline disabled:opacity-50"
                          >
                            Re-send
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Events */}
                    {studio.events.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-gray-400 mb-2">Reservations:</div>
                        {studio.events.map((event: any, idx: number) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-white">{event.name}</div>
                                <div className="text-sm text-gray-400">
                                  {event.startDate && new Date(event.startDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                  {event.endDate && event.startDate !== event.endDate && (
                                    <> - {new Date(event.endDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}</>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-white font-semibold">{event.spaces} entries</div>
                                <div className="text-sm text-gray-400">${event.deposit.toFixed(2)} deposit</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Totals */}
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/10">
                      <div className="text-sm">
                        <span className="text-gray-400">Total Spaces:</span>{' '}
                        <span className="text-white font-semibold">{studio.totalSpaces}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-400">Total Deposit:</span>{' '}
                        <span className="text-white font-semibold">${studio.totalDeposit.toFixed(2)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-400">Events:</span>{' '}
                        <span className="text-white font-semibold">{studio.reservationCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
