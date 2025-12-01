# Conflict Badge Work - In Progress

**Status:** Paused for investigation
**Date:** 2025-12-01
**Branch:** tester
**Last Commit:** 1894be0

---

## ✅ Completed Work

### Badge Size Improvements
- Changed badge size from `w-6 h-2` (24px×8px) to `w-8 h-6` (32px×24px)
- Changed emoji size from `text-[8px]` to `text-sm` (14px)
- Increased icon column width from 28px to 36px
- **Files:** `ScheduleTable.tsx:404`

### Conflict Popup Details
- Added full conflict information to hover popup (not just Fix/Dismiss)
- Popup now shows:
  - Conflict dancer name (bold, 14px)
  - Number of routines between performances (12px)
  - Costume change note (12px)
  - Conflicting routine number and title (12px)
  - All dancers in this routine (12px)
  - Count of additional conflicts if applicable (12px)
- Popup width: 280-400px
- Text sizes: 12-14px (readable)
- **Files:** `ScheduleTable.tsx:414-487`

---

## 🐛 Known Issues to Fix

### Issue #1: Auto-Fix Entry Number Discrepancy
**Problem:** When clicking "Fix" on routine #454, toast says "moved from #365" (different numbers)

**Root Cause:** UI shows draft entry numbers, but auto-fix mutation uses database entry numbers. When schedule has unsaved changes, draft and database numbers diverge.

**Investigation Needed:**
1. Check `onAutoFixConflict` handler - does it use draft or database entry numbers?
2. Verify if auto-fix mutation updates draft state after moving routine
3. Ensure draft renumbering happens after auto-fix completes

**Potential Solutions:**
- Option A: Auto-fix should refetch and sync draft after moving
- Option B: Auto-fix should calculate new position based on draft numbers
- Option C: Warn user to save changes before using auto-fix

**Files to Check:**
- `ScheduleTable.tsx`: `onAutoFixConflict` prop
- `page.tsx`: Auto-fix handler implementation
- `scheduling.ts`: Backend auto-fix mutation

### Issue #2: Badge Height Mismatch with Director Notes
**Problem:** Conflict badge appears shorter than Director notes badge despite same CSS

**Current Code:**
```tsx
// Director Notes Badge (line 387)
<button className="inline-flex items-center justify-center w-8 h-6 rounded text-sm ...">
  <span className="text-sm">📋</span>
</button>

// Conflict Badge (line 404)
<div className="relative group inline-flex items-center">  {/* Extra wrapper */}
  <div className="inline-flex items-center justify-center w-8 h-6 rounded text-sm ...">
    <span className="text-sm">⚠️</span>
  </div>
</div>
```

**Root Cause Hypothesis:** Extra wrapper `<div>` with `inline-flex items-center` might affect vertical alignment

**Potential Solutions:**
- Option A: Remove wrapper div and apply hover handlers directly to badge div
- Option B: Ensure wrapper div has same height/alignment as badge
- Option C: Use `h-full` on inner badge div to match wrapper height

**Files to Check:**
- `ScheduleTable.tsx:396-412`

---

## 📋 Next Steps (When Resuming)

1. **Investigate auto-fix discrepancy:**
   - Find auto-fix handler in `page.tsx`
   - Check if it refetches/syncs draft after mutation
   - Add draft sync if missing

2. **Fix badge height mismatch:**
   - Compare rendered heights in browser DevTools
   - Adjust wrapper div styling or remove if unnecessary
   - Ensure visual parity with Director notes badge

3. **Test both fixes:**
   - Verify auto-fix shows correct entry numbers in toast
   - Verify conflict badge height matches other badges
   - Test on tester.compsync.net with real conflict data

---

## 🔍 Code Locations Reference

### Badge Rendering
- **File:** `src/components/scheduling/ScheduleTable.tsx`
- **Trophy Helper Badge:** Lines 364-378 (`w-8 h-6`)
- **Director Notes Badge:** Lines 380-394 (`w-8 h-6`)
- **Conflict Badge:** Lines 396-412 (`w-8 h-6` with wrapper)
- **Conflict Popup:** Lines 414-487 (detail text + buttons)
- **Icon Column Width:** Lines 362, 831 (36px)

### Auto-Fix Logic
- **Frontend Handler:** `src/app/dashboard/director-panel/schedule/page.tsx` (search for `onAutoFixConflict`)
- **Backend Mutation:** `src/server/routers/scheduling.ts` (search for auto-fix mutation)
- **Draft Sync Logic:** `page.tsx` (renumberAllDays, handleScheduleChange)

---

## 💡 Key Learnings

1. **Badge size must be consistent:** All badges (trophy, note, conflict) now use same `w-8 h-6` size
2. **Popup readability critical:** 12-14px text is minimum for readability, native tooltips too small
3. **Draft vs Database sync:** Auto-fix and other mutations must sync draft state to avoid number discrepancies
4. **Wrapper divs affect layout:** Extra wrappers can cause subtle alignment issues even with same CSS

---

**Resume Date:** TBD (after auto-fix investigation)
**Assigned To:** Claude (next session)
