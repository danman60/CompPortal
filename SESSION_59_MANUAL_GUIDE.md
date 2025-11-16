# Session 59 - Manual Testing Guide

**Due to Playwright MCP browser lock, use this guide for manual testing**

**Status:** Ready to execute manually
**Time:** 90 minutes
**Tests:** 11 tests (7 new features to verify)

---

## 🚀 Quick Start (Manual)

### 1. Open Browser & Login (5 min)

```
1. Open Chrome/Edge in Incognito mode
2. Navigate to: https://tester.compsync.net
3. Login:
   - Email: empwrdance@gmail.com
   - Password: 1CompSyncLogin!
4. Navigate to: /dashboard/director-panel/schedule
5. Wait for page to load fully
```

### 2. Verify Deployment

```
- Check footer for commit hash (should show recent commit)
- Verify page loads without errors
- Open DevTools Console (F12) - should be mostly clean
```

### 3. Take Initial Screenshot

```
- Press Windows+Shift+S (or use screenshot tool)
- Capture full page
- Save as: session59-00-initial-state.png
- Save to: .playwright-mcp/evidence/session59/
```

---

## ✅ Test A1: Routine Card Visual Indicators (15 min)

### Steps:

**1. Inspect Unscheduled Routines** (5 min)
- [ ] Scroll through left panel "Unscheduled Routines"
- [ ] Look for routine cards
- [ ] Check for badges in top-left corner of cards
- [ ] **Expected:** Most cards have NO badges initially (no conflicts/notes yet)
- [ ] Screenshot: `session59-01-routine-cards-initial.png`

**2. Check Routine Card Structure** (5 min)
- [ ] Find a routine card
- [ ] Verify it shows:
  - Title (e.g., "Warriors")
  - Studio code (e.g., "A (Starlight Dance)")
  - Duration (e.g., "⏱️ 3 min")
  - Classification badge (e.g., "🔷 Emerald • Small Group")
  - Age group (e.g., "👥 Junior")
- [ ] **Expected:** All information displays correctly
- [ ] Screenshot: `session59-02-routine-card-detail.png`

**3. Verify Badge Rendering Area** (5 min)
- [ ] Check top-left corner of cards (where badges should appear)
- [ ] **Expected:** Empty for most cards (will add badges in later tests)
- [ ] Note: Badges include 🏆 (trophy), ⚠️ (conflict), 📝 (notes), 🎂 (age)

**Pass Criteria:**
- ✅ Routine cards display correctly
- ✅ Badge area visible (top-left corner)
- ✅ All routine information shows
- ✅ No console errors

---

## ✅ Test A2: Trophy Helper Gold Borders (5 min)

### Steps:

**1. Schedule Some Routines** (2 min)
- [ ] Drag 5+ routines from pool to Saturday AM
- [ ] Drag 3+ routines to Saturday PM
- [ ] Wait for updates to complete

**2. Check Trophy Helper Panel** (2 min)
- [ ] Scroll to right panel "Trophy Helper"
- [ ] Look for award recommendations
- [ ] Note which routines are marked as "Last routine"
- [ ] **Expected:** See 2-4 award groups listed

**3. Find Last Routines in Schedule** (1 min)
- [ ] Look for those routines in schedule grid
- [ ] **Expected:** Last routines have:
  - Gold/yellow border (thicker border)
  - Glowing shadow effect
  - 🏆 badge in top-left corner
- [ ] Screenshot: `session59-03-gold-borders.png`

**Pass Criteria:**
- ✅ Trophy helper shows award recommendations
- ✅ Last routines have gold borders
- ✅ 🏆 badge visible on last routines
- ✅ Visual distinction from other routines

---

## ✅ Test A3: Conflict Box Display (10 min)

### Steps:

**1. Identify a Multi-Routine Dancer** (3 min)
- [ ] Click on a routine card to see details (or hover)
- [ ] Look for dancers who appear in multiple routines
- [ ] Find 2 routines with same dancer
- [ ] Note the routine IDs/names

**2. Create a Conflict** (4 min)
- [ ] Schedule both routines close together (< 6 apart)
- [ ] Example: Both in Saturday AM with only 2-3 routines between
- [ ] Wait for page to update
- [ ] **Expected:** Conflict box appears above routines

**3. Verify Conflict Box Display** (3 min)
- [ ] Look for red/orange/yellow box above routines
- [ ] Check box contains:
  - ⚠️ icon
  - "CONFLICT: [Dancer Name]"
  - Message about spacing (e.g., "2 routines between, need 6")
  - Both routine titles/numbers
- [ ] Check routine cards show ⚠️ badge
- [ ] Screenshot: `session59-04-conflict-box.png`

**Pass Criteria:**
- ✅ Conflict box displays above routines
- ✅ Shows dancer name
- ✅ Shows spacing count
- ✅ Shows both routine titles
- ✅ Routine cards have ⚠️ badges
- ✅ Color coding (red/orange/yellow based on severity)

---

## ✅ Test B3: Undo/Redo Functionality (5 min)

### Steps:

**1. Test Keyboard Undo** (2 min)
- [ ] Schedule a routine to a zone
- [ ] Press Ctrl+Z (or ⌘+Z on Mac)
- [ ] **Expected:**
  - Routine returns to pool
  - Toast notification shows "↶ Undo successful"
- [ ] Screenshot: `session59-05-undo.png`

**2. Test Keyboard Redo** (2 min)
- [ ] Press Ctrl+Y (or ⌘+Y on Mac)
- [ ] **Expected:**
  - Routine returns to zone
  - Toast notification shows "↷ Redo successful"
- [ ] Screenshot: `session59-06-redo.png`

**3. Test Toolbar Buttons** (1 min)
- [ ] Look for undo/redo buttons in top toolbar
- [ ] Check if they enable/disable correctly
- [ ] **Expected:**
  - Undo button enabled after actions
  - Redo button enabled after undo
  - Buttons show disabled state when no history

**Pass Criteria:**
- ✅ Ctrl+Z undoes action
- ✅ Ctrl+Y redoes action
- ✅ Toast notifications appear
- ✅ Toolbar buttons work
- ✅ Buttons enable/disable correctly

---

## ✅ Test C1: Filter Panel Collapse (5 min)

### Steps:

**1. Locate Collapse Button** (1 min)
- [ ] Find filter panel (top of left sidebar)
- [ ] Look for collapse button (should show ◀ or ▼ icon)
- [ ] **Expected:** Button visible in panel header

**2. Test Collapse** (2 min)
- [ ] Click collapse button
- [ ] **Expected:**
  - Panel collapses to thin bar
  - Filters hidden
  - Button changes to expand icon (▶ or ▶)
- [ ] Screenshot: `session59-07-filter-collapsed.png`

**3. Test Expand** (2 min)
- [ ] Click expand button
- [ ] **Expected:**
  - Panel expands back to full width
  - Filters visible again
  - Previous filter selections preserved
- [ ] Screenshot: `session59-08-filter-expanded.png`

**Pass Criteria:**
- ✅ Collapse button visible
- ✅ Panel collapses on click
- ✅ Panel expands on click
- ✅ Filter state preserved
- ✅ Visual feedback (icon changes)

---

## ✅ Test C2: Trophy Helper Collapse (5 min)

### Steps:

**1. Locate Collapse Button** (1 min)
- [ ] Find trophy helper panel (right sidebar)
- [ ] Look for collapse button in panel header (▼ icon)
- [ ] **Expected:** Button visible next to "Trophy Helper" title

**2. Test Collapse** (2 min)
- [ ] Click collapse button
- [ ] **Expected:**
  - Panel content hides
  - Only header visible
  - Button changes to ▶ icon
- [ ] Screenshot: `session59-09-trophy-collapsed.png`

**3. Test Expand** (2 min)
- [ ] Click expand button (▶)
- [ ] **Expected:**
  - Panel content shows again
  - Trophy recommendations visible
- [ ] Screenshot: `session59-10-trophy-expanded.png`

**Pass Criteria:**
- ✅ Collapse button visible
- ✅ Content hides on collapse
- ✅ Content shows on expand
- ✅ Icon changes (▼ ↔ ▶)

---

## 📸 Screenshot Checklist

Save all screenshots to: `.playwright-mcp/evidence/session59/`

Required screenshots:
- [ ] session59-00-initial-state.png
- [ ] session59-01-routine-cards-initial.png
- [ ] session59-02-routine-card-detail.png
- [ ] session59-03-gold-borders.png
- [ ] session59-04-conflict-box.png
- [ ] session59-05-undo.png
- [ ] session59-06-redo.png
- [ ] session59-07-filter-collapsed.png
- [ ] session59-08-filter-expanded.png
- [ ] session59-09-trophy-collapsed.png
- [ ] session59-10-trophy-expanded.png

**Total:** 11 screenshots

---

## 🔍 What to Check in Console

Press F12 to open DevTools → Console tab

**Look for:**
- ❌ Red errors (critical)
- ⚠️ Yellow warnings (may be okay)
- ℹ️ Blue info (usually okay)

**Report if you see:**
- TypeScript errors
- Network errors (failed requests)
- React errors
- Database errors

---

## ✅ After Testing

### 1. Update E2E_QUICK_TRACKER.md

```markdown
### Session 59 (90 min) - P0 Critical

**Status:** ✅ COMPLETE (or ⚠️ PARTIAL if issues)

- [x] A1: Routine Card Indicators (15 min)
- [x] A2: Trophy Gold Borders (5 min)
- [x] A3: Conflict Box Display (10 min)
- [x] B3: Undo/Redo (5 min)
- [x] C1: Filter Panel Collapse (5 min)
- [x] C2: Trophy Panel Collapse (5 min)
```

### 2. Document Issues

If any tests failed, create notes:
- What failed?
- What was expected vs actual?
- Screenshot of failure
- Console errors

### 3. Commit Evidence

```bash
cd CompPortal-tester
git add .playwright-mcp/evidence/session59/
git add E2E_QUICK_TRACKER.md
git commit -m "test: Session 59 E2E testing complete (manual)

- Tested 7 new features
- Captured 11 screenshots
- Results: [X passed, Y failed]"
git push origin tester
```

---

## 🎯 Success Criteria

**Session 59 is successful if:**
- ✅ All 7 tests executed
- ✅ 11 screenshots captured
- ✅ All visual indicators work
- ✅ Undo/redo functional
- ✅ Panel collapse/expand works
- ✅ No critical console errors

**If ANY test fails:**
- Document in KNOWN_ISSUES.md
- Take screenshot of failure
- Note console errors
- Continue with other tests

---

## 💡 Tips

**Drag and Drop:**
- Click and hold on routine card
- Drag to zone
- Release to drop
- Wait for update

**Taking Screenshots:**
- Windows: Windows+Shift+S
- Mac: Cmd+Shift+4
- Use browser extension if preferred

**Console Errors:**
- Red = Critical (report these)
- Yellow = Warnings (note but continue)
- Blue = Info (usually okay)

**If Page Breaks:**
- Refresh (Ctrl+R)
- Hard refresh (Ctrl+Shift+R)
- Re-login if session expired

---

**Ready to start manual testing! Follow steps in order and document everything.**
