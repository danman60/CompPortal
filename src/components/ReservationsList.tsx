'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';

export default function ReservationsList() {
  const { data, isLoading } = trpc.reservation.getAll.useQuery();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
            <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-white/20 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const reservations = data?.reservations || [];
  const competitions = data?.competitions || [];

  // Filter reservations
  const filteredReservations = reservations.filter((reservation) => {
    const matchesStatus = filter === 'all' || reservation.status === filter;
    const matchesCompetition = selectedCompetition === 'all' || reservation.competition_id === selectedCompetition;
    return matchesStatus && matchesCompetition;
  });

  // Calculate capacity percentage
  const getCapacityPercentage = (requested: number, confirmed: number) => {
    if (requested === 0) return 0;
    return Math.round((confirmed / requested) * 100);
  };

  // Get capacity color based on percentage
  const getCapacityColor = (percentage: number) => {
    if (percentage === 100) return 'text-green-400';
    if (percentage >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Competition Filter */}
        <div className="flex-1">
          <select
            value={selectedCompetition}
            onChange={(e) => setSelectedCompetition(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Competitions</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name} ({comp.year}) - {comp.available_reservation_tokens || 0}/{comp.total_reservation_tokens || 600} tokens
              </option>
            ))}
          </select>

          {/* Token Summary for Selected Competition */}
          {selectedCompetition !== 'all' && (() => {
            const selectedComp = competitions.find(c => c.id === selectedCompetition);
            if (!selectedComp) return null;

            const tokensUsed = (selectedComp.total_reservation_tokens || 600) - (selectedComp.available_reservation_tokens || 600);
            const tokensPercentage = Math.round((tokensUsed / (selectedComp.total_reservation_tokens || 600)) * 100);

            return (
              <div className="mt-2 p-3 bg-black/20 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Reservation Tokens</span>
                  {selectedComp.tokens_override_enabled && (
                    <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">Override Enabled</span>
                  )}
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Used:</span>
                  <span className="text-white font-semibold">{tokensUsed}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Available:</span>
                  <span className="text-green-400 font-semibold">{selectedComp.available_reservation_tokens || 0}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      tokensPercentage >= 90
                        ? 'bg-red-500'
                        : tokensPercentage >= 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${tokensPercentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All ({reservations.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Pending ({reservations.filter((r) => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'approved'
                ? 'bg-green-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Approved ({reservations.filter((r) => r.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === 'rejected'
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Rejected ({reservations.filter((r) => r.status === 'rejected').length})
          </button>
        </div>
      </div>

      {/* Reservations Grid */}
      {filteredReservations.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-white mb-2">No reservations found</h3>
          <p className="text-gray-400">
            {filter === 'all'
              ? 'No reservations have been made yet.'
              : `No ${filter} reservations found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => {
            const capacityPercentage = getCapacityPercentage(
              reservation.spaces_requested,
              reservation.spaces_confirmed || 0
            );

            return (
              <div
                key={reservation.id}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left: Studio & Competition Info */}
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          {reservation.studios?.name || 'Unknown Studio'}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {reservation.competitions?.name || 'Unknown Competition'}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          reservation.status === 'approved'
                            ? 'bg-green-500/20 text-green-400 border border-green-400/30'
                            : reservation.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'
                            : reservation.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                        }`}
                      >
                        {reservation.status?.toUpperCase()}
                      </span>
                    </div>

                    {/* Agent Info */}
                    {reservation.agent_first_name && (
                      <div className="space-y-2 pt-4 border-t border-white/10">
                        <div className="text-sm text-gray-400">
                          <strong className="text-white">Agent:</strong>{' '}
                          {reservation.agent_first_name} {reservation.agent_last_name}
                        </div>
                        {reservation.agent_email && (
                          <div className="text-sm text-gray-400">
                            📧 {reservation.agent_email}
                          </div>
                        )}
                        {reservation.agent_phone && (
                          <div className="text-sm text-gray-400">
                            📞 {reservation.agent_phone}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Middle: Capacity Tracking */}
                  <div className="flex flex-col justify-center">
                    <div className="text-center mb-4">
                      <div className="text-sm text-gray-400 mb-2">Capacity</div>
                      <div className={`text-4xl font-bold ${getCapacityColor(capacityPercentage)}`}>
                        {capacityPercentage}%
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Requested:</span>
                        <span className="text-white font-semibold">{reservation.spaces_requested}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Confirmed:</span>
                        <span className="text-green-400 font-semibold">
                          {reservation.spaces_confirmed || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Remaining:</span>
                        <span className="text-yellow-400 font-semibold">
                          {reservation.spaces_requested - (reservation.spaces_confirmed || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            capacityPercentage === 100
                              ? 'bg-green-500'
                              : capacityPercentage >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${capacityPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Dates & Payment */}
                  <div className="space-y-3">
                    {reservation.requested_at && (
                      <div className="text-sm">
                        <span className="text-gray-400">Requested:</span>
                        <div className="text-white">
                          {new Date(reservation.requested_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    )}

                    {reservation.approved_at && (
                      <div className="text-sm">
                        <span className="text-gray-400">Approved:</span>
                        <div className="text-green-400">
                          {new Date(reservation.approved_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    )}

                    {reservation.payment_status && (
                      <div className="pt-3 border-t border-white/10">
                        <div className="text-sm text-gray-400 mb-1">Payment Status</div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            reservation.payment_status === 'paid'
                              ? 'bg-green-500/20 text-green-400'
                              : reservation.payment_status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {reservation.payment_status.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {(reservation.deposit_amount || reservation.total_amount) && (
                      <div className="pt-3 border-t border-white/10 space-y-1">
                        {reservation.deposit_amount && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Deposit:</span>
                            <span className="text-white">
                              ${reservation.deposit_amount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {reservation.total_amount && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Total:</span>
                            <span className="text-white font-semibold">
                              ${reservation.total_amount.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Consents */}
                    {(reservation.age_of_consent || reservation.waiver_consent || reservation.media_consent) && (
                      <div className="pt-3 border-t border-white/10">
                        <div className="text-sm text-gray-400 mb-2">Consents</div>
                        <div className="space-y-1 text-xs">
                          {reservation.age_of_consent && (
                            <div className="text-green-400">✓ Age of Consent</div>
                          )}
                          {reservation.waiver_consent && (
                            <div className="text-green-400">✓ Waiver Signed</div>
                          )}
                          {reservation.media_consent && (
                            <div className="text-green-400">✓ Media Release</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {(reservation.public_notes || reservation.internal_notes) && (
                  <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                    {reservation.public_notes && (
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Public Notes</div>
                        <div className="text-sm text-gray-300 bg-black/20 p-3 rounded-lg">
                          {reservation.public_notes}
                        </div>
                      </div>
                    )}
                    {reservation.internal_notes && (
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Internal Notes</div>
                        <div className="text-sm text-gray-300 bg-black/20 p-3 rounded-lg">
                          {reservation.internal_notes}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Results Count */}
      <div className="mt-6 text-center text-gray-400 text-sm">
        Showing {filteredReservations.length} of {reservations.length} reservations
      </div>
    </div>
  );
}
