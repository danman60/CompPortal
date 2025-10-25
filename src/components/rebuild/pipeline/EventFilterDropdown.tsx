interface EventFilterDropdownProps {
  competitions: any[];
  reservations: any[];
  eventFilter: string;
  onEventFilterChange: (filter: string) => void;
}

/**
 * Event Filter Dropdown
 * Filters reservations by competition
 */
export function EventFilterDropdown({
  competitions,
  reservations,
  eventFilter,
  onEventFilterChange,
}: EventFilterDropdownProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-300 mb-2">
        Filter by Event
      </label>
      <select
        value={eventFilter}
        onChange={(e) => onEventFilterChange(e.target.value)}
        className="w-full md:w-auto px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value="all" className="bg-slate-900">
          All Events ({reservations.length} reservations)
        </option>
        {competitions
          .filter((comp: any) => comp.name !== 'QA Automation')
          .map((comp: any) => {
            const compReservations = reservations.filter((r: any) => r.competitionId === comp.id);
            return (
              <option key={comp.id} value={comp.id} className="bg-slate-900">
                {comp.name} {comp.year} ({compReservations.length} reservations)
              </option>
            );
          })}
      </select>
    </div>
  );
}
