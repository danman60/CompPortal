# Known Issues - CompPortal

## Critical Issues

### 1. Routine Creation - Auto-Save Corruption (ACTIVE)
**Status:** Auto-save DISABLED as workaround
**First Reported:** 2025-01-10
**Severity:** High - Blocks routine creation

**Problem:**
- Auto-save feature in EntryForm causes studio_id corruption
- localStorage saves truncated UUIDs (35 chars instead of 36)
- When loaded, corrupted UUIDs cause Prisma validation errors
- Error: `Invalid prisma.competition_entries.create() invocation`

**Root Cause:**
- Unknown - UUID validation added (lines 59-76) detects corrupted data
- Suspect: useAutoSave hook may be truncating UUID during save/load cycle
- Possibly related to JSON serialization or localStorage size limits

**Temporary Fix Applied:**
- Auto-save disabled in EntryForm.tsx (line 49: `enabled: false`)
- AutoSaveIndicator hidden (line 784)
- UUID validation still active to prevent bad submissions

**Permanent Fix Needed:**
1. Debug useAutoSave hook for UUID truncation
2. Add integration tests for localStorage save/load
3. Consider alternative storage (IndexedDB) for large form data
4. Add schema validation before saving to localStorage

**Files Modified:**
- `src/components/EntryForm.tsx` - Auto-save disabled with comments

**Workaround for Users:**
- Manual form entry required (no draft saving)
- Form must be completed in one session
- Smart defaults still work (competition/category preferences)

---

## Minor Issues

### 2. Animation Description Inaccuracy
**Status:** Cosmetic
**Severity:** Low

**Problem:**
- Loading animation uses ballet shoes emoji (🩰), not ballet dancer
- Code comments refer to it as "ballet dancer"

**Fix:** Update comments to say "ballet shoes" for accuracy

---

*Last Updated: 2025-01-10*
