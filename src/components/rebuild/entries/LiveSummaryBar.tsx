"use client";

import { useState } from 'react';
import { Button } from '@/components/rebuild/ui/Button';
import { SubmitSummaryModal } from './SubmitSummaryModal';

interface Reservation {
  id: string;
  studio_id: string;
  competition_id: string;
  is_closed: boolean | null;
  competitions?: { name: string };
  [key: string]: any;
}

interface LiveSummaryBarProps {
  created: number;
  estimatedTotal: number;
  confirmedSpaces: number;
  reservation: Reservation | null;
  onSubmitSummary: (payload: { studioId: string; competitionId: string }) => Promise<void>;
}

/**
 * Fixed bottom bar showing entry summary
 * Submit summary button (only if reservation not closed)
 */
export function LiveSummaryBar({
  created,
  estimatedTotal,
  confirmedSpaces,
  reservation,
  onSubmitSummary,
}: LiveSummaryBarProps) {
  const [showModal, setShowModal] = useState(false);

  if (!reservation) return null;

  const isIncomplete = created < confirmedSpaces;
  const isClosed = reservation.is_closed;
  const canSubmit = created > 0 && !isClosed;

  const handleSubmit = () => {
    if (isIncomplete) {
      setShowModal(true); // Show warning modal
    } else {
      setShowModal(true); // Show confirmation modal
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-900/95 via-indigo-900/95 to-blue-900/95 backdrop-blur-md border-t border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="text-white">
                <div className="text-sm text-white/60">Available Slots</div>
                <div className="text-2xl font-bold">🎫 {confirmedSpaces}</div>
              </div>

              <div className="text-white">
                <div className="text-sm text-white/60">Created</div>
                <div className="text-2xl font-bold">✅ {created}</div>
              </div>

              <div className="text-white">
                <div className="text-sm text-white/60">Remaining</div>
                <div className={`text-2xl font-bold ${isIncomplete ? 'text-red-400' : 'text-green-400'}`}>
                  {confirmedSpaces - created}
                </div>
              </div>

              <div className="text-white">
                <div className="text-sm text-white/60">Estimated Total</div>
                <div className="text-2xl font-bold">💰 ${estimatedTotal.toFixed(2)}</div>
              </div>

              {reservation.deposit_amount && (
                <div className="text-white">
                  <div className="text-sm text-white/60">Deposit</div>
                  <div className="text-2xl font-bold text-blue-300">
                    ${(typeof reservation.deposit_amount === 'number'
                      ? reservation.deposit_amount
                      : Number(reservation.deposit_amount)).toFixed(2)}
                  </div>
                </div>
              )}

              <div className="text-white">
                <div className="text-sm text-white/60">Event</div>
                <div className="text-lg font-medium">
                  🎪 {(reservation as any).competitions?.name || 'Unknown'}
                </div>
              </div>
            </div>

            <div>
              {isClosed ? (
                <div className="text-white/60 text-sm">
                  <div>Summary submitted (reservation closed)</div>
                  <div className="text-xs text-white/40 mt-1">
                    💡 You can edit your routines/dancers, but create a new reservation to add more routines
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  variant="primary"
                  className="text-lg px-6 py-3"
                >
                  📤 Submit Summary
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <SubmitSummaryModal
          created={created}
          confirmedSpaces={confirmedSpaces}
          isIncomplete={isIncomplete}
          reservation={reservation}
          onConfirm={onSubmitSummary}
          onCancel={() => setShowModal(false)}
        />
      )}

      {/* Spacer to prevent content from being hidden under fixed bar */}
      <div className="h-24" />
    </>
  );
}
