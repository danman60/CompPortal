/**
 * Custom hook for calculating space usage and reservation limits
 * Extracted from EntriesList.tsx (lines 236-254)
 */
export function useSpaceUsage(
  entries: any[],
  selectedCompetition: string,
  reservationData: any
) {
  const hasSelectedCompetition = !!selectedCompetition;
  const selectedReservation = hasSelectedCompetition ? reservationData?.reservations?.[0] : null;
  const hasNoReservation = hasSelectedCompetition && !selectedReservation;

  // Calculate total confirmed spaces and used spaces
  const confirmedSpaces = hasSelectedCompetition
    ? selectedReservation?.spaces_confirmed || 0
    : 0;

  const usedSpaces = hasSelectedCompetition
    ? entries.filter(e => e.competition_id === selectedCompetition && e.status !== 'cancelled').length
    : entries.filter(e => e.status !== 'cancelled').length;

  const isAtLimit = hasSelectedCompetition && selectedReservation && usedSpaces >= confirmedSpaces;
  const isIncomplete = hasSelectedCompetition && selectedReservation && usedSpaces < confirmedSpaces;

  return {
    hasSelectedCompetition,
    selectedReservation,
    hasNoReservation,
    confirmedSpaces,
    usedSpaces,
    isAtLimit,
    isIncomplete,
  };
}
