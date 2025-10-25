import { Card } from '@/components/rebuild/ui/Card';

interface Reservation {
  id: string;
  competitions?: { name: string };
  status: string | null;
  is_closed: boolean | null;
}

interface EntriesFiltersProps {
  reservations: Reservation[];
  selectedReservation: Reservation | null;
  onReservationChange: (id: string) => void;
  viewMode: 'card' | 'table';
  onViewModeChange: (mode: 'card' | 'table') => void;
}

/**
 * Filters for Entries page
 * Reservation selector + view mode toggle
 */
export function EntriesFilters({
  reservations,
  selectedReservation,
  onReservationChange,
  viewMode,
  onViewModeChange,
}: EntriesFiltersProps) {
  if (reservations.length === 0) {
    return (
      <Card className="mb-6">
        <div className="text-white/60 text-center py-4">
          No approved reservations. Please request a reservation first.
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between gap-4">
        {/* Reservation selector */}
        <div className="flex items-center gap-3 flex-1">
          <label className="text-sm font-medium text-white/80">Reservation:</label>
          <select
            value={selectedReservation?.id || ''}
            onChange={(e) => onReservationChange(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 flex-1 max-w-md"
          >
            {reservations.map((r) => (
              <option key={r.id} value={r.id} className="bg-gray-900">
                {r.competitions?.name || 'Unknown Event'}
                {r.is_closed ? ' (closed)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewModeChange('card')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'card'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-white/60 hover:text-white'
            }`}
          >
            🎴 Cards
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'table'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-white/60 hover:text-white'
            }`}
          >
            📊 Table
          </button>
        </div>
      </div>
    </Card>
  );
}
