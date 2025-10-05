# CompPortal User Testing Notes

**Date**: October 2025
**Source**: User testing session feedback
**Status**: Priority for next development session

---

## 🩰 Studio Director Journey — User Testing Feedback

### Routine & Dancer Management

**High Priority:**
1. **Unified Add Flow** - Merge "Add Dancer" and "Batch Add" into one action; allow single-row adds in same table view
2. **Routine Counter** - "Create Routine" should show number of available routines (e.g., "3 of 30 remaining")
3. **White-on-white Dropdowns** - Fix contrast issues in Create Routine modal
4. **Lock Studio Selection** - Studio field should be hard-coded to current studio (non-editable)
5. **Quick Start Flow** - Keep existing quick start flow for routine creation
6. **Remove Drag Reordering** - Remove participant reordering inside Create Routine modal
7. **Replace Music Section** - Replace with "Props" field (simple yes/no or description)

**Medium Priority:**
8. **Drag-and-Drop Linking** - Implement drag-and-drop: routines listed on left, dancers on right; drag dancer → routine
9. **Dashboard Label** - Change to "My Routines" (not "My Entries")
10. **Hard-coded Studio** - Once studio settings locked, all studio references should be non-editable

### Reservation Flow

**High Priority:**
1. **Fix Dropdown Contrast** - Resolve remaining white-on-white dropdowns
2. **Remove Agent Information** - Studio should never edit "agent information" (pulled from studio profile)
3. **Hide Capacity Metrics** - Hide all capacity metrics from Studio view; only show reservation status (Pending/Approved)
4. **Status Summary Only** - After submitting reservation, display status + summary only (no capacity data)
5. **Helper Text** - Display helper text above "Create Routine": "Routines available: 12 of 20 approved"
6. **Auto-generate Invoice** - Submitting reservation auto-generates invoice; payment handled manually later

### General UI

**Medium Priority:**
1. **Table Views Acceptable** - Current table views for dancers are good
2. **Terminology Consistency** - Replace all "entries" → "routines" throughout app

---

## 🏆 Competition Director Journey — User Testing Feedback

### Dashboard & Reservations

**High Priority:**
1. **Reservations Emphasis** - Primary dashboard should emphasize Reservations at top (not dancers)
2. **Events List OK** - "Events" list and "All Studios" pages function as expected
3. **Card Grid Layout** - Show all competitions side by side in 4×4 card format
4. **Card Details** - Each card: competition name, total capacity, remaining tokens, pending reservations
5. **Approval Actions** - Ability to approve/reject/cancel reservations from cards
6. **Auto-adjust Capacity** - Capacity auto-adjusts when reservation confirmed or released
7. **Manual Reservation Creation** - Add admin-only manual reservation creation to fill slots
8. **Remove Create Button** - Remove "Create Reservation" button from top-right (directors don't create, only approve)

**Medium Priority:**
9. **Column Sorting** - Enable column sorting (click header to sort alphabetically/numerically/by group)
10. **Draggable Dashboard Buttons** - Allow click-and-drag dashboard button reordering with saved layout per user

### Each Event Card Should Display:
- Capacity total
- Reserved count
- Remaining slots
- Pending reservations list
- Confirmed studios list

### Testing & Reports

**High Priority:**
1. **PDF Design Polish** - PDF generation works but needs design polish (alignment, fonts)
2. **Real Seeded Data** - Test with real seeded data (GlowDance Orlando, etc.) to validate reservation logic

### Optional Enhancements (Future)
- Visual capacity meters or progress bars per event
- "Cancel Reservation" instantly releases tokens
- Personalized dashboard layout (drag/drop widgets, saved view preferences)

---

## Summary

**Total Issues Identified**: 28
**High Priority**: 18
**Medium Priority**: 10

**Next Session Focus:**
1. Fix all high-priority items first
2. Test with real seeded data
3. Verify drag-and-drop functionality
4. Polish PDF generation
5. Implement capacity auto-adjustment logic

---

## Cross-Reference

**Overlap with Previous Testing**: Many items overlap with [FIXES_AND_ENHANCEMENTS.md](./FIXES_AND_ENHANCEMENTS.md)

**Consolidated Tracker**: See [BUGS_AND_FEATURES.md](./BUGS_AND_FEATURES.md) for unified priority list with duplicate indicators

**Critical Items (Both Sessions)**:
1. White-on-white dropdowns
2. Lock Studio selection
3. Hide capacity metrics from Studio view
4. Entries → Routines terminology
5. Hide agent information editing

**New Items (This Session Only)**:
1. Merge Add Dancer flows
2. Props field instead of Music
3. 4×4 card grid layout for CD dashboard
4. Helper text for routine counters
5. Auto-generate invoices
