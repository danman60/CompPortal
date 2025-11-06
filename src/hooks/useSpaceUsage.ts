/**
 * Custom hook for calculating space usage and reservation limits
 * Updated to work directly with reservation object instead of competition ID
 */
export function useSpaceUsage(
  entries: any[],
  selectedReservation: any | null
) {
  const hasSelectedReservation = !!selectedReservation;

  // Calculate total confirmed spaces and used spaces
  const confirmedSpaces = selectedReservation?.spaces_confirmed || 0;

  const usedSpaces = hasSelectedReservation
    ? entries.filter(e => e.reservation_id === selectedReservation.id && e.status !== 'withdrawn').length
    : entries.filter(e => e.status !== 'withdrawn').length;

  const isAtLimit = hasSelectedReservation && usedSpaces >= confirmedSpaces;
  const isIncomplete = hasSelectedReservation && usedSpaces < confirmedSpaces;
  const isClosed = selectedReservation?.is_closed || false;

  return {
    hasSelectedReservation,
    selectedReservation,
    confirmedSpaces,
    usedSpaces,
    isAtLimit,
    isIncomplete,
    isClosed,
  };
}
