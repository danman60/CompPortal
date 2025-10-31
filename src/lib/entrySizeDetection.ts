/**
 * Entry Size Detection Utilities
 * Phase 2 Spec: PHASE2_BUSINESS_LOGIC_SPECIFICATIONS.md lines 229-292
 *
 * Automatically detects entry size category based on dancer count
 * Entry size is LOCKED and cannot be manually changed
 */

export interface EntrySizeCategory {
  id: string;
  name: string;
  min_size: number;
  max_size: number;
  tenant_id: string;
  max_time_minutes?: number;
  max_time_seconds?: number;
}

/**
 * Detect entry size name based on dancer count
 * Phase 2 spec lines 235-244
 *
 * Standard categories (EMPWR + Glow):
 * - Solo: 1 dancer
 * - Duet: 2 dancers (Glow has separate Duet/Trio)
 * - Trio: 3 dancers (Glow has separate Duet/Trio)
 * - Duet/Trio: 2-3 dancers (EMPWR combined)
 * - Small Group: 4-9 dancers
 * - Large Group: 10-14 dancers
 * - Line: 15-19 dancers
 * - Superline/Super Line: 20+ dancers
 * - Production: Special category (10+ dancers, manually selectable)
 */
export function detectEntrySizeName(dancerCount: number, tenantHasSeparateDuetTrio: boolean = false): string {
  if (dancerCount === 1) return 'Solo';

  if (dancerCount === 2) {
    return tenantHasSeparateDuetTrio ? 'Duet' : 'Duet/Trio';
  }

  if (dancerCount === 3) {
    return tenantHasSeparateDuetTrio ? 'Trio' : 'Duet/Trio';
  }

  if (dancerCount >= 4 && dancerCount <= 9) return 'Small Group';
  if (dancerCount >= 10 && dancerCount <= 14) return 'Large Group';
  if (dancerCount >= 15 && dancerCount <= 19) return 'Line';
  if (dancerCount >= 20) return 'Superline';

  throw new Error('Invalid dancer count');
}

/**
 * Find matching entry size category from database categories
 * Handles tenant-specific variations (e.g., "Super Line" vs "Superline")
 */
export function findEntrySizeCategory(
  dancerCount: number,
  categories: EntrySizeCategory[]
): EntrySizeCategory | null {
  // For each expected category name, try to find match
  const expectedName = detectEntrySizeName(dancerCount, false);

  // Try exact match first
  let category = categories.find(c => c.name === expectedName);
  if (category) return category;

  // Try case-insensitive match
  category = categories.find(c => c.name.toLowerCase() === expectedName.toLowerCase());
  if (category) return category;

  // Handle variations
  if (expectedName === 'Superline') {
    category = categories.find(c => c.name === 'Super Line' || c.name === 'Superline');
    if (category) return category;
  }

  if (expectedName === 'Duet/Trio') {
    // Check if tenant has separate Duet/Trio
    const duet = categories.find(c => c.name === 'Duet');
    const trio = categories.find(c => c.name === 'Trio');

    if (duet && trio) {
      // Tenant has separate - return appropriate one
      return dancerCount === 2 ? duet : trio;
    }

    // Try combined
    category = categories.find(c => c.name === 'Duet/Trio');
    if (category) return category;
  }

  // Fallback: Find by dancer count range
  category = categories.find(c =>
    dancerCount >= c.min_size && dancerCount <= c.max_size
  );

  return category || null;
}

/**
 * Validate if Production category can be used
 * Phase 2 spec lines 324-373
 *
 * Production requires:
 * - Minimum 10 dancers
 * - Manual selection (not auto-detected)
 */
export function canUseProduction(dancerCount: number): boolean {
  return dancerCount >= 10;
}

/**
 * Get time limit for entry size
 * Phase 2 spec lines 376-418
 *
 * Returns time limit in total seconds for display and validation
 */
export function getTimeLimit(category: EntrySizeCategory): number {
  const minutes = category.max_time_minutes || 0;
  const seconds = category.max_time_seconds || 0;
  return minutes * 60 + seconds;
}

/**
 * Format time limit for display
 * Examples: "3:00", "3:30", "15:00"
 */
export function formatTimeLimit(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format time limit from category
 */
export function formatTimeLimitFromCategory(category: EntrySizeCategory): string {
  const totalSeconds = getTimeLimit(category);
  return formatTimeLimit(totalSeconds);
}

/**
 * Validate routine length against category time limit
 */
export function validateRoutineLength(
  routineMinutes: number,
  routineSeconds: number,
  category: EntrySizeCategory,
  extendedTimeRequested: boolean
): { valid: boolean; error?: string; maxSeconds: number } {
  const routineTotal = routineMinutes * 60 + routineSeconds;
  const maxSeconds = getTimeLimit(category);

  // If extended time requested, allow up to 10 minutes
  const effectiveMax = extendedTimeRequested ? 10 * 60 : maxSeconds;

  if (routineTotal > effectiveMax) {
    const maxFormatted = formatTimeLimit(effectiveMax);
    return {
      valid: false,
      error: `Routine length exceeds maximum of ${maxFormatted}${extendedTimeRequested ? ' (with extended time)' : ''}`,
      maxSeconds: effectiveMax
    };
  }

  return { valid: true, maxSeconds: effectiveMax };
}

/**
 * Check if dancer count changed enough to require entry size re-detection
 */
export function shouldUpdateEntrySize(
  previousCount: number,
  newCount: number,
  categories: EntrySizeCategory[]
): boolean {
  if (previousCount === newCount) return false;

  const previousCategory = findEntrySizeCategory(previousCount, categories);
  const newCategory = findEntrySizeCategory(newCount, categories);

  // Different categories = update required
  return previousCategory?.id !== newCategory?.id;
}
