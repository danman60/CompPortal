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

interface Entry {
  id: string;
  title?: string;
  entry_participants?: Array<{ dancer_name: string }>;
  [key: string]: any;
}

interface LiveSummaryBarProps {
  created: number;
  estimatedTotal: number;
  confirmedSpaces: number;
  reservation: Reservation | null;
  entries?: Entry[];
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
  entries = [],
  onSubmitSummary,
}: LiveSummaryBarProps) {
  const [showModal, setShowModal] = useState(false);
  const [showDancerWarning, setShowDancerWarning] = useState(false);

  if (!reservation) return null;

  const isIncomplete = created < confirmedSpaces;
  const isClosed = reservation.is_closed;

  // Check for routines without dancers
  const routinesNeedingDancers = entries.filter(
    e => !e.entry_participants || e.entry_participants.length === 0
  );
  const hasMissingDancers = routinesNeedingDancers.length > 0;

  const canSubmit = created > 0 && !isClosed && !hasMissingDancers;

  const handleSubmit = () => {
    if (hasMissingDancers) {
      setShowDancerWarning(true); // Show dancer warning
    } else if (isIncomplete) {
      setShowModal(true); // Show warning modal
    } else {
      setShowModal(true); // Show confirmation modal
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-900/95 via-indigo-900/95 to-blue-900/95 backdrop-blur-md border-t border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4">
          {/* Mobile Layout: button first, then stats (reversed) so button is always visible above bottom nav */}
          <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
            {/* Stats - Compact 3-column grid on mobile, flex on desktop */}
            <div className="grid grid-cols-3 gap-2 md:flex md:items-center md:gap-8">
              <div className="text-white">
                <div className="text-xs md:text-sm text-white/60">Slots</div>
                <div className="text-lg md:text-2xl font-bold">🎫 {confirmedSpaces}</div>
              </div>

              <div className="text-white">
                <div className="text-xs md:text-sm text-white/60">Created</div>
                <div className="text-lg md:text-2xl font-bold">✅ {created}</div>
              </div>

              <div className="text-white">
                <div className="text-xs md:text-sm text-white/60">Remaining</div>
                <div className={`text-lg md:text-2xl font-bold ${isIncomplete ? 'text-red-400' : 'text-green-400'}`}>
                  {confirmedSpaces - created}
                </div>
              </div>

              <div className="text-white hidden sm:block">
                <div className="text-xs md:text-sm text-white/60">Deposit</div>
                <div className="text-lg md:text-2xl font-bold text-blue-300">
                  ${(reservation.deposit_amount
                    ? (typeof reservation.deposit_amount === 'number'
                      ? reservation.deposit_amount
                      : Number(reservation.deposit_amount))
                    : 0).toFixed(2)}
                </div>
              </div>

              <div className="text-white hidden lg:block">
                <div className="text-xs md:text-sm text-white/60">Event</div>
                <div className="text-sm md:text-lg font-medium truncate max-w-[200px]">
                  🎪 {(reservation as any).competitions?.name || 'Unknown'}
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="w-full md:w-auto">
              {isClosed ? (
                <div className="text-white/60 text-xs md:text-sm text-center md:text-right">
                  <div>Summary submitted</div>
                  <div className="text-xs text-white/40 mt-1 hidden md:block">
                    💡 Edit routines/dancers, but create new reservation to add more
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  variant="primary"
                  className="w-full md:w-auto text-sm md:text-lg px-4 md:px-6 py-2 md:py-3"
                >
                  📤 View/Submit Summary
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
          estimatedTotal={estimatedTotal}
          depositAmount={
            reservation.deposit_amount
              ? (typeof reservation.deposit_amount === 'number'
                ? reservation.deposit_amount
                : Number(reservation.deposit_amount))
              : 0
          }
          onConfirm={onSubmitSummary}
          onCancel={() => setShowModal(false)}
        />
      )}

      {/* Dancer Warning Modal */}
      {showDancerWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-orange-900/90 via-red-900/90 to-orange-900/90 backdrop-blur-md rounded-xl border-2 border-orange-400/50 p-8 max-w-2xl w-full shadow-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="text-6xl">⚠️</div>
              <div>
                <h2 className="text-3xl font-bold text-orange-300 mb-2">
                  Cannot Submit Summary
                </h2>
                <p className="text-white text-lg">
                  {routinesNeedingDancers.length} routine(s) need dancers before you can submit
                </p>
              </div>
            </div>

            <div className="bg-black/30 rounded-lg p-4 mb-6 max-h-60 overflow-y-auto">
              <h3 className="text-white font-semibold mb-3">Routines needing dancers:</h3>
              <ul className="space-y-2">
                {routinesNeedingDancers.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-2 text-orange-200">
                    <span className="text-orange-400">•</span>
                    <span>{entry.title || 'Untitled'}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-gray-300 mb-6">
              Please edit each routine to attach at least one dancer before submitting your summary.
            </p>

            <div className="flex gap-4">
              <Button
                onClick={() => setShowDancerWarning(false)}
                variant="primary"
                className="flex-1"
              >
                Got It
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer to prevent content from being hidden under fixed bar */}
      <div className="h-24" />
    </>
  );
}
