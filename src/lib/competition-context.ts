/**
 * Utility functions for multi-competition management
 */

/**
 * Get the currently selected competition ID from localStorage
 * @returns The selected competition ID or null if none selected
 */
export function getSelectedCompetitionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('selectedCompetitionId');
}

/**
 * Set the selected competition ID in localStorage
 * @param competitionId The competition ID to select
 */
export function setSelectedCompetitionId(competitionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('selectedCompetitionId', competitionId);
}

/**
 * Clear the selected competition ID from localStorage
 */
export function clearSelectedCompetitionId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('selectedCompetitionId');
}

/**
 * Hook to get and set the selected competition ID
 * Usage in components:
 *
 * import { useState, useEffect } from 'react';
 * import { getSelectedCompetitionId } from '@/lib/competition-context';
 *
 * const [selectedCompId, setSelectedCompId] = useState<string>('');
 *
 * useEffect(() => {
 *   const saved = getSelectedCompetitionId();
 *   if (saved) setSelectedCompId(saved);
 * }, []);
 */
