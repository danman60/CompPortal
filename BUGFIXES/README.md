# BUGFIXES - Schedule V2 Handoffs

**Created:** December 5, 2025
**Last Updated:** December 5, 2025

This folder contains verified bug analysis and fix instructions for Claude Code to implement.

---

## Bug Status

| Bug | File | Status | Priority |
|-----|------|--------|----------|
| Block drag-to-create | BLOCK_DRAG_FIX.md | ⏳ Ready for fix | P0 Critical |
| Day start time display | DAY_START_TIME_FIX.md | ⏳ Ready for fix | P1 High |
| Filter dropdown position | DROPDOWN_POSITION_FIX.md | ⏳ Ready for fix | P1 High |

---

## How to Use

1. Read the relevant .md file
2. Follow the "COMPLETE FIX" section exactly
3. Run verification steps
4. Update status in this README when fixed

---

## Root Causes Verified

### Block Drag (BLOCK_DRAG_FIX.md)
- **Problem:** Temp blocks created on drag don't appear in schedule
- **Root cause:** ID format mismatch between `tempBlocks` Map key and lookup code
  - `tempBlocks` stores with key `block-temp-X`
  - Lookup does `id.replace('block-', '')` expecting `temp-X`
- **Fix:** Use `temp-X` as Map key, `block-temp-X` in scheduleByDate array

### Day Start Time (DAY_START_TIME_FIX.md)
- **Problem:** Schedule always shows 8:00 AM start regardless of saved time
- **Root cause:** Hardcoded `dayStartMinutes={8 * 60}` in JSX (~line 1590)
- **Fix:** Change to `dayStartMinutes={getDayStartMinutes(selectedDate)}`

### Filter Dropdown (DROPDOWN_POSITION_FIX.md)
- **Problem:** Dropdown menus appear way below the filter button
- **Root cause:** Position calculation adds `window.scrollY` to fixed-positioned element
- **Fix:** Remove scroll offset - use `rect.bottom + 4` and `rect.left` directly

---

## Notes

- All bugs verified by reading actual current code (not session context)
- Line numbers are approximate - search for the patterns shown
- Test on tester.compsync.net after fixing
