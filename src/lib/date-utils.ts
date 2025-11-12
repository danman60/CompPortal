/**
 * Date Utilities
 *
 * Utility functions for handling dates consistently across the application,
 * especially for preventing timezone-related bugs when storing dates.
 */

/**
 * Convert ISO date string to UTC Date object
 *
 * Prevents timezone shift bugs when storing date-only values (like birthdates)
 * in the database. Without UTC specification, JavaScript Date constructor
 * interprets the date as local midnight, which can shift the date when
 * converted to UTC for storage.
 *
 * @example
 * // ❌ WRONG - Can shift date by 1 day depending on timezone
 * new Date("2010-05-15")
 * // In EST (UTC-5): "2010-05-15T00:00:00-05:00" → stored as "2010-05-14" in UTC
 *
 * // ✅ CORRECT - Always stores the exact date
 * parseISODateToUTC("2010-05-15")
 * // "2010-05-15T00:00:00Z" → stored as "2010-05-15" regardless of timezone
 *
 * @param isoDateString - Date in ISO format (YYYY-MM-DD)
 * @returns Date object at UTC midnight, or undefined if input is empty
 */
export function parseISODateToUTC(isoDateString: string | undefined | null): Date | undefined {
  if (!isoDateString || isoDateString.trim() === '') {
    return undefined;
  }

  // Ensure UTC midnight to prevent timezone shifts
  // Appending 'T00:00:00Z' forces interpretation as UTC
  return new Date(isoDateString + 'T00:00:00Z');
}

/**
 * Format a Date object to ISO date string (YYYY-MM-DD)
 *
 * Useful for displaying dates in forms or converting database dates
 * back to ISO format for editing.
 *
 * @param date - Date object or ISO string
 * @returns ISO date string (YYYY-MM-DD), or empty string if invalid
 */
export function formatDateToISO(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date to ISO:', error);
    return '';
  }
}

/**
 * Calculate age based on birthdate and reference date
 *
 * @param birthdate - Date of birth
 * @param referenceDate - Date to calculate age from (defaults to today)
 * @returns Age in years, or null if birthdate is invalid
 */
export function calculateAge(
  birthdate: Date | string | null | undefined,
  referenceDate: Date | string = new Date()
): number | null {
  if (!birthdate) return null;

  try {
    const birthDateObj = typeof birthdate === 'string' ? parseISODateToUTC(birthdate)! : birthdate;
    const refDateObj = typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate;

    // Use UTC methods to avoid timezone mismatch
    let age = refDateObj.getUTCFullYear() - birthDateObj.getUTCFullYear();
    const monthDiff = refDateObj.getUTCMonth() - birthDateObj.getUTCMonth();

    // Adjust if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && refDateObj.getUTCDate() < birthDateObj.getUTCDate())) {
      age--;
    }

    return age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return null;
  }
}
