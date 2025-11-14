# Scheduling Test Plan - Week 1 Verification

**Target:** tester.compsync.net
**Branch:** tester
**Date:** 2025-11-14
**Tester:** Automated (Playwright MCP)

---

## Test Environment

- **Tenant:** Test Environment (00000000-0000-0000-0000-000000000003)
- **Competition:** Test Competition Spring 2026 (1b786221-8f8e-413f-b532-06fa20a2ff63)
- **Expected Data:** 60 routines across 5 studios
- **Login:** danieljohnabrahamson@gmail.com / 123456 (SA)

---

## Test Categories

### 1. Page Load & Navigation
- [ ] 1.1: Login as Super Admin
- [ ] 1.2: Navigate to /dashboard/director-panel/schedule
- [ ] 1.3: Page loads without errors
- [ ] 1.4: Verify build hash matches deployed version
- [ ] 1.5: Check console for errors

### 2. Data Loading
- [ ] 2.1: Routines load successfully
- [ ] 2.2: Correct routine count displays (60 expected)
- [ ] 2.3: Studio codes display (A, B, C, D, E)
- [ ] 2.4: All routine metadata visible (title, classification, category, age, size, duration)
- [ ] 2.5: No duplicate routines

### 3. Filters
- [ ] 3.1: Classification filter populates with options
- [ ] 3.2: Filter by "Crystal" classification
- [ ] 3.3: Verify filtered count updates
- [ ] 3.4: Clear classification filter
- [ ] 3.5: Category/Genre filter works
- [ ] 3.6: Search by routine name works
- [ ] 3.7: Multiple filters work together

### 4. Drag-and-Drop UI
- [ ] 4.1: Routine cards are draggable
- [ ] 4.2: Drop zones are visible (4 zones: Sat/Sun AM/PM)
- [ ] 4.3: Drag overlay appears during drag
- [ ] 4.4: Drop zone highlights on hover
- [ ] 4.5: Card visual feedback (green border when in zone)

### 5. Scheduling Operations
- [ ] 5.1: Drag routine to Saturday Morning
- [ ] 5.2: Verify unscheduled count decreases (60 → 59)
- [ ] 5.3: Verify scheduled count increases (0 → 1)
- [ ] 5.4: Verify total count remains same (60)
- [ ] 5.5: Routine appears in target zone
- [ ] 5.6: Drag another routine to Saturday Afternoon
- [ ] 5.7: Drag routine to Sunday Morning
- [ ] 5.8: Drag routine to Sunday Afternoon

### 6. Database Persistence
- [ ] 6.1: Refresh page after scheduling
- [ ] 6.2: Scheduled routines persist in zones
- [ ] 6.3: Counts remain accurate after refresh
- [ ] 6.4: Verify performance_date in database
- [ ] 6.5: Verify performance_time in database

### 7. Studio Code Anonymity
- [ ] 7.1: Studio codes display (not full names)
- [ ] 7.2: Multiple studios represented
- [ ] 7.3: Codes are consistent (A, B, C, D, E)

### 8. Statistics Panel
- [ ] 8.1: Unscheduled count accurate
- [ ] 8.2: Scheduled count accurate
- [ ] 8.3: Total count accurate
- [ ] 8.4: Updates in real-time on drag

### 9. Conflicts Panel
- [ ] 9.1: Conflicts panel visible
- [ ] 9.2: Shows "No conflicts" initially
- [ ] 9.3: (Future) Detects dancer conflicts
- [ ] 9.4: (Future) Detects costume change issues

### 10. Actions Panel
- [ ] 10.1: Save Schedule button visible
- [ ] 10.2: Export Schedule button visible
- [ ] 10.3: (Future) PDF export works
- [ ] 10.4: (Future) iCal export works

---

## Expected Results

**Pass Criteria:**
- All 60 routines load
- Drag-and-drop works smoothly
- Database persistence confirmed
- Filters function correctly
- Statistics update accurately
- No console errors

**Fail Criteria:**
- Missing routines
- Drag-and-drop not working
- Data not persisting
- Console errors
- Statistics incorrect

---

## Bug Report Template

```markdown
### Bug: [Title]
**Severity:** [Critical/High/Medium/Low]
**Test Case:** [Test ID]
**Steps to Reproduce:**
1.
2.
3.

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Screenshot:** [Path to screenshot]
**Console Errors:** [Any errors from browser console]
```
