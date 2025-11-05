# Next Session - Entry Form Bug Fixes

**Date Created:** 2025-11-05
**Last Commit:** aa592e6 (Production fixes + cross-tenant classification bug)
**Test Environment:** empwr.compsync.net via Admin Testing Tools

---

## Critical Bugs to Fix

### 1. Size Category - Remove Override Dropdown
**Severity:** High - UX Issue
**User Request:** "Size category should be locked to Auto Calc and not user override"

**Current Behavior:**
- Size category has dropdown with "Use detected" + manual override options
- Users can manually override the auto-detected size

**Required Behavior:**
- REMOVE dropdown completely
- ONLY show auto-detected size category (read-only display)
- Users should NEVER be able to manually override size
- Display format: "Detected: Solo (1 dancer)" or similar

**Files to Modify:**
- `src/components/rebuild/entries/AutoCalculatedSection.tsx` (lines 215-255)
- Remove the `<select>` dropdown
- Keep only the detection display box
- Remove `sizeCategoryOverride` parameter from component props

**Testing:**
- Verify dropdown is gone
- Verify auto-detection still works
- Verify Production locking still works (15+ dancers → Production)

---

### 2. Exception Modal - White on White Dropdown
**Severity:** Medium - Accessibility Issue
**User Report:** "White on White Dropdown in Request Exception Modal"

**Issue:** Dropdown text is white on white background (unreadable)

**Files to Check:**
- `src/components/ClassificationRequestExceptionModal.tsx`
- Look for `<select>` element styling
- Add proper contrast: `className="bg-gray-900 text-white"` to `<option>` elements

**Fix:**
```tsx
<select className="...existing classes...">
  <option value="" className="bg-gray-900 text-white">Select...</option>
  <option value="..." className="bg-gray-900 text-white">Option</option>
</select>
```

---

### 3. Exception Modal - Wrong Classification Displayed
**Severity:** Medium - Data Accuracy Issue
**User Report:** "In exception Modal its says System auto calculated Novice, in my test it actual Auto Calculated Competitive, make sure this pulls from correct place"

**Issue:** Modal shows wrong auto-calculated classification

**Investigation Needed:**
- `src/components/ClassificationRequestExceptionModal.tsx`
- Find where `autoCalculatedClassification` is passed in
- Verify it's using the SAME calculation logic as `AutoCalculatedSection.tsx` lines 73-118
- Check if modal is receiving stale/cached data

**Likely Cause:**
- Modal might be using `form.classification_id` instead of `autoCalculatedClassification`
- OR modal opened before classification calculation completes

**Fix:**
- Ensure modal receives `autoCalculatedClassification` prop from parent
- Verify calculation uses same logic (solo = dancer's class, group = 60% majority)

---

### 4. Exception Modal - Race Condition on Submit
**Severity:** CRITICAL - Blocks Feature
**User Report:** "Submit Exception request throws: Invalid uuid for entryId"

**Error:**
```
TRPCClientError: [
  {
    "validation": "uuid",
    "code": "invalid_string",
    "message": "Invalid uuid",
    "path": ["entryId"]
  }
]
```

**Root Cause:** Exception modal opened BEFORE entry is saved (no entry ID exists yet)

**Investigation Steps:**
1. Check database schema for `classification_exceptions` table
2. Check Phase 2 spec for exception request workflow
3. Check when exception modal is triggered (button click location)

**Possible Solutions:**
- **Option A:** Disable "Exception Required" button until entry is saved
- **Option B:** Save entry as "draft" first, then allow exception requests
- **Option C:** Store exception request with temp/draft entry reference

**Files to Check:**
- `src/components/ClassificationRequestExceptionModal.tsx`
- `src/server/api/routers/classification.ts` (exception creation endpoint)
- Database: Check if `classification_exceptions` table exists
- Phase 2 spec: Search for "exception" workflow

**Testing After Fix:**
- Open form, select dancers, click "Exception Required"
- Verify modal opens without error
- Submit exception request
- Verify entry + exception both saved

---

### 5. Add Routine Time Limits to Database
**Severity:** High - Missing Feature
**User Request:** "We need to put the Routine Time Limits in the DB beside the Group Sizes EG (Solo = 3 minute max) etc. These details should exist in phase 2 spec."

**Task:**
1. Search Phase 2 spec for time limit definitions
2. Add `max_duration_seconds` column to `entry_size_categories` table
3. Populate values for all size categories across both tenants

**Expected Values (from common dance competition standards):**
- Solo: 180 seconds (3 minutes)
- Duet/Trio: 180 seconds (3 minutes)
- Small Group: 240 seconds (4 minutes)
- Large Group: 300 seconds (5 minutes)
- Line: 300 seconds (5 minutes)
- Super Line: 360 seconds (6 minutes)
- Production: 420 seconds (7 minutes)

**SQL Migration:**
```sql
-- Add max_duration_seconds column
ALTER TABLE entry_size_categories
ADD COLUMN max_duration_seconds INTEGER;

-- Update EMPWR tenant
UPDATE entry_size_categories SET max_duration_seconds = 180 WHERE name = 'Solo' AND tenant_id = '00000000-0000-0000-0000-000000000001';
-- (repeat for all categories)

-- Update Glow tenant
UPDATE entry_size_categories SET max_duration_seconds = 180 WHERE name = 'Solo' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';
-- (repeat for all categories)
```

**Files to Update:**
- Create new migration file
- Update Prisma schema with new column
- Run `npx prisma generate` after migration

---

### 6. Display Max Time in Extended Time Section
**Severity:** Medium - UX Enhancement
**User Request:** "Lets include the max time beside the test Extended Time Options eg Extended Time Options (Solo, 3 min max)"

**Current Display:**
```
⏱️ Request Extended Time ($5 flat)
```

**Required Display:**
```
⏱️ Request Extended Time (Solo, 3 min max) ($5 flat)
```

**Files to Modify:**
- `src/components/rebuild/entries/ExtendedTimeSection.tsx`
- Add `sizeCategory` prop (with max_duration_seconds)
- Format time: `Math.floor(seconds / 60)` minutes
- Update label to include size category name + max time

**Example Code:**
```tsx
const maxTimeMinutes = Math.floor(sizeCategory.max_duration_seconds / 60);
const label = `⏱️ Request Extended Time (${sizeCategory.name}, ${maxTimeMinutes} min max)`;
```

---

### 7. Classification Validation - Accept Auto-Detected
**Severity:** HIGH - Blocks Save
**User Report:** "Form blocks save with Classification is Required when Classification is on Use Detected and requires manually selection of classification"

**Issue:** Validation treats "Use Detected" (empty string in dropdown) as invalid

**Current Behavior:**
- User selects dancers → classification auto-detected
- Dropdown shows "Use detected (Competitive)"
- Form validation says "Classification is required"
- Save button disabled

**Required Behavior:**
- When classification is auto-detected, validation should PASS
- "Use detected" should be treated as VALID selection
- User should NOT be required to manually select from dropdown

**Files to Check:**
1. **Validation Logic:**
   - `src/hooks/rebuild/useEntryFormV2.ts` (form validation)
   - Look for `classification_id` validation
   - Check if it requires non-empty string

2. **Form Submit Logic:**
   - `src/components/rebuild/entries/EntryCreateFormV2.tsx`
   - Check what value is sent when "Use detected" is selected

**Fix:**
- If `classificationId === ''` AND `autoCalculatedClassification` exists → VALID
- OR: Set `classificationId = autoCalculatedClassification.id` when auto-detected
- Update validation to check: `classificationId || autoCalculatedClassification`

**Testing:**
- Select 1 dancer (solo) → Classification auto-detected
- Leave dropdown on "Use detected"
- Verify save button is ENABLED
- Save entry
- Verify classification_id saved correctly in database

---

## Testing Checklist (After All Fixes)

### Manual Testing via Admin Testing Tools
1. Navigate to: empwr.compsync.net/dashboard/admin/testing
2. Click "TEST ROUTINES DASHBOARD"
3. Click "Create Routine"

### Test Cases:
- [ ] **Solo Entry:**
  - Select 1 dancer
  - Verify size shows "Solo" (no dropdown)
  - Verify classification auto-detected and save enabled
  - Save entry → Success

- [ ] **Group Entry:**
  - Select 8 dancers (different classifications)
  - Verify size shows "Small Group" (no dropdown)
  - Verify 60% majority rule applies
  - Click "Exception Required" → Modal opens
  - Verify correct auto-calculated class shown
  - Submit exception → Success

- [ ] **Production Entry:**
  - Select "Production" dance category
  - Verify size category auto-locks to "Production"
  - OR select 15+ dancers → size auto-detects "Production"
  - Verify dance category auto-locks to "Production"
  - Verify classification locks to "Production"

- [ ] **Extended Time:**
  - Verify label shows: "Extended Time (Solo, 3 min max)"
  - Check pricing: Solo = $5, Group = $2/dancer

---

## Database Queries for Verification

### Check Time Limits Added:
```sql
SELECT name, min_participants, max_participants, max_duration_seconds
FROM entry_size_categories
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ORDER BY min_participants;
```

### Check Cross-Tenant Classifications Fixed:
```sql
SELECT COUNT(*) as cross_tenant_dancers
FROM dancers d
JOIN studios s ON d.studio_id = s.id
JOIN classifications c ON d.classification_id = c.id
WHERE s.tenant_id != c.tenant_id;
-- Should return 0
```

### Check Exception Requests:
```sql
SELECT * FROM classification_exceptions
ORDER BY created_at DESC
LIMIT 5;
```

---

## Session Success Criteria

- [ ] All 7 bugs fixed
- [ ] Build passing (78/78 pages)
- [ ] All manual tests passing
- [ ] Database queries verify correct data
- [ ] Committed with 8-line format
- [ ] Pushed to production
- [ ] User can create entries without errors

---

## Notes for Next Developer

**Context:**
- Previous session fixed cross-tenant classification bug (5 dancers had Glow classifications in EMPWR studio)
- Added "Production" as size category
- Implemented bi-directional Production locking
- Commit: aa592e6

**Key Files:**
- Entry form: `src/components/rebuild/entries/EntryCreateFormV2.tsx`
- Auto-calc section: `src/components/rebuild/entries/AutoCalculatedSection.tsx`
- Exception modal: `src/components/ClassificationRequestExceptionModal.tsx`
- Form hook: `src/hooks/rebuild/useEntryFormV2.ts`

**Testing:**
- Always test on empwr.compsync.net via Admin Testing Tools
- Login: danieljohnabrahamson@gmail.com / 123456
- Test Studio: "Test Studio - Daniel" (100 dancers)

---

**Priority Order:**
1. Classification validation (HIGH - blocks save)
2. Exception modal race condition (CRITICAL - blocks feature)
3. Size category dropdown removal (HIGH - UX)
4. Time limits database + UI (HIGH - missing feature)
5. Exception modal styling + wrong data (MEDIUM)
