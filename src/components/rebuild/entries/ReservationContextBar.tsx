interface Reservation {
  id: string;
  spaces_confirmed: number | null;
  [key: string]: any;
}

interface Competition {
  id: string;
  name?: string | null;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  [key: string]: any;
}

interface ReservationContextBarProps {
  reservation: Reservation;
  competition: Competition;
  confirmedSpaces: number;
  entriesCount: number;
  remainingSpaces: number;
}

/**
 * Fixed bottom context bar
 * Shows reservation capacity and competition info
 *
 * Features:
 * - Always visible during entry creation
 * - Capacity display (X/Y used, Z remaining)
 * - Competition name and dates
 * - Warning state if at/over capacity
 */
export function ReservationContextBar({
  reservation,
  competition,
  confirmedSpaces,
  entriesCount,
  remainingSpaces,
}: ReservationContextBarProps) {
  const isAtCapacity = remainingSpaces <= 0;
  const isNearCapacity = remainingSpaces > 0 && remainingSpaces <= 3;

  // Format dates
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'TBD';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const startDate = formatDate(competition.start_date);
  const endDate = formatDate(competition.end_date);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-slate-900 via-gray-900 to-black border-t border-white/20 z-50">
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Reservation Capacity */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-white/60 mb-1">Reservation</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">📊</span>
                <div>
                  <div className="text-lg font-bold text-white">
                    {entriesCount}/{confirmedSpaces} used
                  </div>
                  <div className={`text-sm font-semibold ${
                    isAtCapacity ? 'text-red-400' : isNearCapacity ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {remainingSpaces} remaining
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Badge */}
            {isAtCapacity && (
              <div className="px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full text-red-300 text-xs font-bold">
                ⚠️ AT CAPACITY
              </div>
            )}
            {isNearCapacity && (
              <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-yellow-300 text-xs font-bold">
                ⚠️ NEAR CAPACITY
              </div>
            )}
          </div>

          {/* Competition Info */}
          <div className="text-right">
            <div className="text-xs text-white/60 mb-1">Competition</div>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-2xl font-bold">🎪</span>
              <div>
                <div className="text-lg font-bold text-white">{competition.name || 'Competition'}</div>
                <div className="text-sm text-white/80">
                  {startDate === endDate ? startDate : `${startDate} - ${endDate}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
