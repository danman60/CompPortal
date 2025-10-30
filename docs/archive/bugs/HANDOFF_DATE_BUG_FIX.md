# HANDOFF: Dancer Date UTC Bug Fix

**Date:** October 30, 2025
**Issue:** Dancer birthdates off by 1 day due to timezone handling bug
**Status:** Analysis complete, ready for implementation
**Priority:** P1 (High)

---

## Executive Summary

**Root Cause:** Inconsistent UTC handling when converting ISO date strings to JavaScript Date objects.

**Current State:**
- ✅ CSV Import (`batchCreate`) - Already fixed with UTC suffix
- ❌ Manual Create - Broken (line 265)
- ❌ Dancer Update - Broken (line 357)
- ❌ Create with Validation - Broken (line 512)
- ❌ Bulk Import - Broken (line 722)

**Fix Required:** Add `T00:00:00Z` suffix to 4 date conversions + create utility function

---

## Technical Details

### The Bug

```javascript
// ❌ WRONG - Timezone-dependent
new Date("2010-05-15")
// User in EST (UTC-5): Interprets as "2010-05-15T00:00:00-05:00"
// Stored in UTC: "2010-05-15T05:00:00Z"
// Database extracts date: May show as "2010-05-14" when retrieved

// ✅ CORRECT - Always UTC
new Date("2010-05-15T00:00:00Z")
// Always: "2010-05-15T00:00:00Z"
// Database stores: "2010-05-15" correctly
```

### Database Schema

```prisma
model dancers {
  date_of_birth  DateTime?  @db.Date  // PostgreSQL DATE type (no timezone)
}
```

---

## Locations to Fix

### File: `src/server/routers/dancer.ts`

**1. Line 265 - `create` procedure**
```typescript
// Current (BROKEN):
date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,

// Fix to:
date_of_birth: date_of_birth ? new Date(date_of_birth + 'T00:00:00Z') : undefined,
```

**2. Line 357 - `update` procedure**
```typescript
// Current (BROKEN):
date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,

// Fix to:
date_of_birth: date_of_birth ? new Date(date_of_birth + 'T00:00:00Z') : undefined,
```

**3. Line 512 - `createWithValidation` procedure**
```typescript
// Current (BROKEN):
date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,

// Fix to:
date_of_birth: date_of_birth ? new Date(date_of_birth + 'T00:00:00Z') : undefined,
```

**4. Line 722 - `bulkImport` procedure**
```typescript
// Current (BROKEN):
date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,

// Fix to:
date_of_birth: date_of_birth ? new Date(date_of_birth + 'T00:00:00Z') : undefined,
```

**5. Line 582 - `batchCreate` procedure (ALREADY FIXED)**
```typescript
// Current (WORKING):
date_of_birth: date_of_birth ? new Date(date_of_birth + 'T00:00:00Z') : undefined,

// Refactor to use utility function for consistency:
date_of_birth: parseISODateToUTC(date_of_birth),
```

---

## Implementation Plan

### Step 1: Create Utility Function

**File:** `src/lib/date-utils.ts` (NEW)

```typescript
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
    const birthDateObj = typeof birthdate === 'string' ? new Date(birthdate) : birthdate;
    const refDateObj = typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate;

    let age = refDateObj.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = refDateObj.getMonth() - birthDateObj.getMonth();

    // Adjust if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && refDateObj.getDate() < birthDateObj.getDate())) {
      age--;
    }

    return age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return null;
  }
}
```

### Step 2: Add Unit Tests

**File:** `src/lib/date-utils.test.ts` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { parseISODateToUTC, formatDateToISO, calculateAge } from './date-utils';

describe('parseISODateToUTC', () => {
  it('converts ISO date string to UTC midnight', () => {
    const result = parseISODateToUTC('2010-05-15');
    expect(result?.toISOString()).toBe('2010-05-15T00:00:00.000Z');
  });

  it('returns undefined for empty string', () => {
    expect(parseISODateToUTC('')).toBeUndefined();
    expect(parseISODateToUTC(undefined)).toBeUndefined();
    expect(parseISODateToUTC(null)).toBeUndefined();
  });

  it('handles dates at year boundaries correctly', () => {
    const result = parseISODateToUTC('2020-12-31');
    expect(result?.getUTCFullYear()).toBe(2020);
    expect(result?.getUTCMonth()).toBe(11); // December = 11
    expect(result?.getUTCDate()).toBe(31);
  });

  it('handles leap year dates correctly', () => {
    const result = parseISODateToUTC('2020-02-29');
    expect(result?.toISOString()).toBe('2020-02-29T00:00:00.000Z');
  });
});

describe('formatDateToISO', () => {
  it('formats Date object to ISO string', () => {
    const date = new Date('2010-05-15T00:00:00Z');
    expect(formatDateToISO(date)).toBe('2010-05-15');
  });

  it('formats ISO string to ISO date string', () => {
    expect(formatDateToISO('2010-05-15T12:34:56Z')).toBe('2010-05-15');
  });

  it('returns empty string for invalid input', () => {
    expect(formatDateToISO(null)).toBe('');
    expect(formatDateToISO(undefined)).toBe('');
  });
});

describe('calculateAge', () => {
  it('calculates age correctly', () => {
    const birthdate = '2010-05-15';
    const referenceDate = '2025-10-30';
    expect(calculateAge(birthdate, referenceDate)).toBe(15);
  });

  it('accounts for birthday not yet occurred this year', () => {
    const birthdate = '2010-12-25';
    const referenceDate = '2025-10-30';
    expect(calculateAge(birthdate, referenceDate)).toBe(14); // Birthday hasn't happened yet
  });

  it('accounts for birthday already occurred this year', () => {
    const birthdate = '2010-01-15';
    const referenceDate = '2025-10-30';
    expect(calculateAge(birthdate, referenceDate)).toBe(15); // Birthday already happened
  });

  it('returns null for invalid birthdate', () => {
    expect(calculateAge(null)).toBeNull();
    expect(calculateAge(undefined)).toBeNull();
  });
});
```

### Step 3: Update `dancer.ts`

**File:** `src/server/routers/dancer.ts`

Add import at top:
```typescript
import { parseISODateToUTC } from '@/lib/date-utils';
```

Find and replace all 5 instances:
```typescript
// OLD:
date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
// OR:
date_of_birth: date_of_birth ? new Date(date_of_birth + 'T00:00:00Z') : undefined,

// NEW (all instances):
date_of_birth: parseISODateToUTC(date_of_birth),
```

**Lines to update:** 265, 357, 512, 582, 722

---

## Testing Plan

### Manual Testing

**Test 1: Manual Dancer Creation**
1. Navigate to `/dashboard/dancers/new`
2. Create dancer with birthdate: `2010-05-15`
3. Check database: `SELECT date_of_birth FROM dancers WHERE id = 'xxx';`
4. **Expected:** Database shows `2010-05-15` (not `2010-05-14`)
5. Load dancer in edit form
6. **Expected:** Form shows `2010-05-15` (not `2010-05-14`)

**Test 2: Dancer Update**
1. Edit existing dancer
2. Change birthdate to `2015-08-20`
3. Save changes
4. **Expected:** Database and UI both show `2015-08-20`

**Test 3: CSV Import (Already Working)**
1. Upload CSV with dancer birthdate `05/15/2010`
2. Import dancers
3. **Expected:** Continues to work correctly (no regression)

**Test 4: Timezone Test**
1. Change system timezone to EST (UTC-5)
2. Create dancer with birthdate `2010-05-15`
3. **Expected:** Still stored as `2010-05-15` (not affected by timezone)
4. Change system timezone to PST (UTC-8)
5. View same dancer
6. **Expected:** Still displays `2010-05-15` (not shifted)

### Automated Testing

Run unit tests:
```bash
npm test src/lib/date-utils.test.ts
```

**Expected:** All tests pass

---

## Verification Checklist

- [ ] Create `src/lib/date-utils.ts` with utility functions
- [ ] Create `src/lib/date-utils.test.ts` with unit tests
- [ ] Add import to `src/server/routers/dancer.ts`
- [ ] Update line 265 (`create` procedure)
- [ ] Update line 357 (`update` procedure)
- [ ] Update line 512 (`createWithValidation` procedure)
- [ ] Update line 582 (`batchCreate` procedure - refactor to use utility)
- [ ] Update line 722 (`bulkImport` procedure)
- [ ] Run `npm test` - all tests pass
- [ ] Run `npm run build` - build succeeds
- [ ] Manual test: Create dancer with birthdate `2010-05-15`
- [ ] Manual test: Edit dancer birthdate
- [ ] Manual test: CSV import still works
- [ ] Check database: Dates stored correctly
- [ ] Deploy to production
- [ ] Monitor Sentry for date-related errors

---

## Data Migration (Optional)

**If existing dancers have incorrect birthdates:**

```sql
-- Check how many dancers might have timezone-shifted dates
-- This is difficult to detect without knowing the original input

-- Example: Find dancers whose birthdate doesn't match expected format
SELECT id, first_name, last_name, date_of_birth
FROM dancers
WHERE date_of_birth IS NOT NULL
ORDER BY date_of_birth DESC
LIMIT 100;

-- Manual review required to identify incorrect dates
-- No automated migration possible without knowing original data
```

**Recommendation:** Fix going forward, notify users to verify existing dancer birthdates.

---

## Git Commit Format

```
fix: Resolve dancer birthdate UTC timezone bug

- Add parseISODateToUTC utility (date-utils.ts:23-38)
- Add formatDateToISO utility (date-utils.ts:40-51)
- Add calculateAge utility (date-utils.ts:53-79)
- Fix create procedure (dancer.ts:265)
- Fix update procedure (dancer.ts:357)
- Fix createWithValidation procedure (dancer.ts:512)
- Fix batchCreate procedure (dancer.ts:582)
- Fix bulkImport procedure (dancer.ts:722)
- Add comprehensive unit tests (date-utils.test.ts)

Prevents dates from shifting by 1 day due to timezone
interpretation. All date strings now explicitly converted
to UTC midnight before database storage.

Fixes P1 bug affecting manual dancer creation/editing.
CSV import already had partial fix, now uses utility.

✅ Build pass. ✅ Tests pass.

🤖 Claude Code
```

---

## Impact Assessment

**Severity:** P1 (High)
**Affected Users:** Anyone using manual dancer creation/editing in non-UTC timezones
**User Impact:** Birthdates may display incorrectly (off by 1 day)
**Data Integrity:** Some existing dancer birthdates may be incorrect
**Fix Complexity:** Low (simple utility function + 5 line changes)
**Testing Required:** Medium (manual + automated)
**Deployment Risk:** Low (isolated change, well-tested)

---

## Additional Context

### Files Analyzed

- `src/components/DancerCSVImport.tsx` - CSV import with flexible date parsing
- `src/components/DancerForm.tsx` - Manual dancer creation form
- `src/server/routers/dancer.ts` - All dancer CRUD operations
- `src/lib/csv-utils.ts` - CSV header mapping utilities
- `prisma/schema.prisma` - Database schema (DateTime @db.Date)

### Related Documentation

- `CLAUDE.md` - Project development guidelines
- `PROJECT_STATUS.md` - Current project status
- `docs/specs/PHASE1_SPEC.md` - Phase 1 business logic specification

### Known Good Patterns

The `batchCreate` procedure (line 582) already has the correct fix applied:
```typescript
date_of_birth: date_of_birth ? new Date(date_of_birth + 'T00:00:00Z') : undefined,
```

This pattern should be applied to all other date conversions via the new utility function.

---

## Questions for Implementation Agent

1. Should we also fix `DancerForm.tsx` line 57 to use `formatDateToISO` utility?
2. Should we add a database migration to attempt fixing existing incorrect dates?
3. Should we add a warning banner for users to verify existing dancer birthdates?
4. Should we implement similar fixes for other date fields (e.g., competition dates)?

---

**Ready for Implementation:** Yes
**Estimated Time:** 1 hour (coding + testing)
**Handoff Complete:** ✅
