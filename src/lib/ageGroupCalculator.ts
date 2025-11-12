/**
 * Age Group Calculator for Dance Competitions
 * Uses dancer DOBs and routine classification to determine age division
 */

import { parseISODateToUTC } from './date-utils';

export type AgeGroup = 'Petite' | 'Mini' | 'Junior' | 'Teen' | 'Senior' | 'Adult';

export interface DancerForAgeCalc {
  date_of_birth: string | Date; // ISO date string or Date object
  first_name?: string;
  last_name?: string;
}

/**
 * Calculate age as of competition date (or today if not specified)
 */
export function calculateAge(dob: string | Date, asOfDate?: Date): number {
  const birthDate = typeof dob === 'string' ? parseISODateToUTC(dob)! : dob;
  const referenceDate = asOfDate || new Date();

  // Use UTC methods to avoid timezone mismatch
  // birthDate is UTC, so we need to compare in UTC
  let age = referenceDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = referenceDate.getUTCMonth() - birthDate.getUTCMonth();

  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }

  return age;
}

/**
 * Get age group from age
 */
export function getAgeGroup(age: number): AgeGroup {
  if (age <= 7) return 'Petite';
  if (age <= 9) return 'Mini';
  if (age <= 12) return 'Junior';
  if (age <= 15) return 'Teen';
  if (age <= 19) return 'Senior';
  return 'Adult';
}

/**
 * Infer age group for routine based on dancers
 * Uses MOST RESTRICTIVE rule:
 * - For groups: Use the OLDEST dancer's age group
 * - For solos: Use the dancer's age group
 */
export function inferAgeGroup(
  dancers: DancerForAgeCalc[],
  classification: string,
  competitionDate?: Date
): {
  ageGroup: AgeGroup;
  oldestAge: number;
  youngestAge: number;
  ageRange: string;
} | null {
  if (!dancers || dancers.length === 0) {
    return null;
  }

  // Calculate ages for all dancers
  const ages = dancers
    .map((d) => ({
      dancer: d,
      age: calculateAge(d.date_of_birth, competitionDate),
    }))
    .sort((a, b) => b.age - a.age); // Sort by age descending (oldest first)

  const oldestAge = ages[0].age;
  const youngestAge = ages[ages.length - 1].age;

  // MOST RESTRICTIVE RULE: Use oldest dancer's age group
  const ageGroup = getAgeGroup(oldestAge);

  return {
    ageGroup,
    oldestAge,
    youngestAge,
    ageRange: ages.length === 1 ? `${oldestAge}` : `${youngestAge}-${oldestAge}`,
  };
}

/**
 * Format age group for display with age range
 */
export function formatAgeGroupDisplay(result: ReturnType<typeof inferAgeGroup>): string {
  if (!result) return 'Unknown';

  if (result.oldestAge === result.youngestAge) {
    return `${result.ageGroup} (Age ${result.oldestAge})`;
  }

  return `${result.ageGroup} (Ages ${result.ageRange})`;
}

/**
 * Validate if manual override is reasonable
 */
export function validateAgeGroupOverride(
  inferredGroup: AgeGroup,
  manualGroup: AgeGroup,
  ages: { oldest: number; youngest: number }
): { valid: boolean; warning?: string } {
  // Allow override but warn if it's off
  const allGroups: AgeGroup[] = ['Petite', 'Mini', 'Junior', 'Teen', 'Senior', 'Adult'];
  const inferredIndex = allGroups.indexOf(inferredGroup);
  const manualIndex = allGroups.indexOf(manualGroup);

  const diff = Math.abs(inferredIndex - manualIndex);

  if (diff === 0) {
    return { valid: true };
  }

  if (diff === 1) {
    return { valid: true, warning: `Note: Manual group differs from calculated (${inferredGroup})` };
  }

  return {
    valid: true,
    warning: `WARNING: Manual group significantly differs from calculated (${inferredGroup}). Please verify.`,
  };
}

