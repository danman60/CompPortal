# Next Session Development Plan (12 Hours)

**Created**: October 5, 2025
**Context**: Post-MVP, pre-launch final push
**MVP Due**: October 7, 2025 (2 days)
**Focus**: Production hardening, E2E testing, bug elimination, polish

---

## 🎯 Session Objectives

1. **Production Stability**: Fix critical bugs, verify all core workflows
2. **Comprehensive E2E Testing**: 75+ golden tests across all user journeys
3. **Accessibility**: WCAG 2.1 AA compliance
4. **Performance**: Optimize loading states, error handling
5. **Polish**: UX improvements, design consistency

---

## 📋 Phase 1: Critical Bug Verification (30 min)

### Tasks
- [ ] Verify entries page fix deployed (commit 30ac6c6)
- [ ] Test with Playwright MCP on production
- [ ] Document verification in PRODUCTION_BUGS.md
- [ ] Mark bug as resolved or escalate

**Exit Criteria**: Entries page loads without React error, shows data correctly

---

## 🧪 Phase 2: Studio Director E2E Testing (2.5 hours)

### Golden Test Suite (25+ tests)

**Authentication & Onboarding** (3 tests)
1. Quick login as Studio Director
2. Email/password login flow
3. First-time user dashboard experience

**Dancer Management** (5 tests)
4. View dancers list (card and table views)
5. Add single dancer (full form validation)
6. Batch add multiple dancers
7. Edit dancer details
8. Import dancers from CSV
9. Filter dancers (all/male/female)
10. Search dancers by name

**Reservation Workflow** (5 tests)
11. Create reservation for competition
12. View reservation status (pending/approved/rejected)
13. Capacity counter displays correctly
14. Cannot exceed approved capacity
15. View invoices linked to reservation

**Routine Creation** (8 tests)
16. Create solo routine (all 7 category types)
17. Create duo routine with 2 dancers
18. Create small group (3-9 dancers)
19. Create large group (10+ dancers)
20. Upload music file for routine
21. Edit existing routine
22. Delete/cancel routine
23. View routine counter ("X of Y remaining")
24. Drag-and-drop dancer assignment

**Music Management** (4 tests)
25. View music tracking dashboard
26. Upload missing music
27. Receive music reminder email (verify email log)
28. Export missing music CSV

**Invoices** (3 tests)
29. View studio invoices
30. Download invoice PDF
31. See payment status updates

**Studio Settings** (2 tests)
32. Update studio information
33. Upload studio logo

**Navigation & UX** (3 tests)
34. All dashboard cards clickable
35. Back buttons work correctly
36. Breadcrumb navigation consistent

**Edge Cases** (5 tests)
37. Loading states display correctly
38. Error messages user-friendly
39. Empty states (no dancers, no routines)
40. Network error handling
41. Form validation errors clear

---

## 🧪 Phase 3: Competition Director E2E Testing (2.5 hours)

### Golden Test Suite (25+ tests)

**Authentication & Dashboard** (2 tests)
1. Quick login as Competition Director
2. Dashboard shows all studios (cross-studio visibility)

**Reservation Management** (8 tests)
3. View all pending reservations
4. Approve reservation (capacity updates)
5. Reject reservation with reason
6. Cancel approved reservation
7. Reduce reservation capacity (with routine warnings)
8. Manual reservation creation (admin-only)
9. View reservation history
10. Filter reservations by status/competition

**Competition Management** (7 tests)
11. Create new competition
12. Edit competition details
13. Clone past competition
14. View competition capacity metrics
15. Switch between multiple competitions
16. Set competition dates and fees
17. Configure routine size categories

**Studio Management** (4 tests)
18. View all studios
19. Approve pending studio
20. Reject studio application
21. View studio details and routines

**Invoice Management** (5 tests)
22. View global invoices (all studios)
23. Filter invoices by event/status
24. Mark invoice as paid
25. Download invoice PDF
26. Sort invoices by studio/amount

**Scheduling** (6 tests)
27. View scheduling dashboard
28. Auto-generate schedule
29. Drag-and-drop routine reordering
30. Conflict detection (dancer in 2 routines)
31. Export schedule PDF
32. Export schedule CSV/iCal

**Judge Management** (5 tests)
33. Add judge to competition
34. Assign judges to panels
35. Check-in judges
36. View judge assignments
37. Remove judge from panel

**Music Tracking** (4 tests)
38. View missing music by studio
39. Send individual reminder
40. Bulk send reminders to all studios
41. Export missing music report

**Reports & Analytics** (5 tests)
42. View competition analytics
43. Export results PDF
44. View scoreboard
45. Revenue reports
46. Capacity utilization metrics

**Navigation** (3 tests)
47. All director-specific pages accessible
48. Role-based access enforced
49. No studio-specific data leaks

**Edge Cases** (3 tests)
50. Capacity warnings at 80%, 90%, 100%
51. Conflicting reservations prevented
52. Bulk operations error handling

---

## 🧪 Phase 4: Judge E2E Testing (1.5 hours)

### Golden Test Suite (25+ tests)

**Authentication** (2 tests)
1. Quick login as Judge
2. Judge-specific dashboard

**Scoring Interface** (12 tests)
3. View assigned routines
4. Navigate between routines (swipe/buttons)
5. Enter technical score (0-10, 0.1 increments)
6. Enter artistic score (0-10, 0.1 increments)
7. Score validation (max 10.0)
8. Save scores (auto-save)
9. Edit existing scores
10. Submit final scores
11. Lock scores after submission
12. View routine details (dancers, category)
13. Touch-optimized scoring (tablet mode)
14. Offline score caching

**Special Awards** (5 tests)
15. Award special recognition
16. Multiple awards per routine
17. Award categories list
18. Award confirmation
19. View awards history

**Score Review** (4 tests)
20. View all scored routines
21. Filter by competition/session
22. Sort by score/routine number
23. Compare scores across judges

**Navigation** (3 tests)
24. Routine-to-routine navigation smooth
25. Return to dashboard
26. Logout preserves draft scores

**Edge Cases** (4 tests)
27. Invalid score entry prevented
28. Network disconnect handling
29. Score sync after offline
30. Multiple judges same routine

---

## 🐛 Phase 5: Bug Squashing Session (1.5 hours)

### Process
For each bug found in testing:
1. Document in PRODUCTION_BUGS.md (symptom, cause, priority)
2. Create focused fix
3. Verify fix with Playwright MCP
4. Commit with clear message
5. Re-test affected workflow

**Bug Categories to Watch**:
- Form validation edge cases
- Loading state issues
- Error message clarity
- Navigation bugs
- Data sync issues
- Permission/RBAC leaks
- Mobile responsiveness
- Accessibility violations

**Target**: Fix all P0/P1 bugs found during testing

---

## ♿ Phase 6: Accessibility Audit (1.5 hours)

### WCAG 2.1 AA Compliance

**Keyboard Navigation** (30 min)
- [ ] All interactive elements keyboard accessible
- [ ] Tab order logical
- [ ] Focus indicators visible
- [ ] Escape closes modals
- [ ] Enter submits forms
- [ ] Arrow keys navigate lists

**Screen Reader Support** (30 min)
- [ ] All images have alt text
- [ ] Form labels properly associated
- [ ] ARIA labels on icon buttons
- [ ] Error messages announced
- [ ] Loading states announced
- [ ] Headings hierarchical (h1→h2→h3)

**Color & Contrast** (20 min)
- [ ] Text contrast ratio ≥ 4.5:1 (normal text)
- [ ] Text contrast ratio ≥ 3:1 (large text)
- [ ] Color not sole indicator (errors, success)
- [ ] Focus indicators high contrast

**Forms** (10 min)
- [ ] Labels always visible (no placeholder-only)
- [ ] Error messages specific and helpful
- [ ] Required fields marked
- [ ] Validation on blur and submit

**Fixes**: Apply immediately, verify with Playwright

---

## 🎨 Phase 7: Design & UX Polish (1 hour)

### Visual Consistency
- [ ] Consistent spacing (padding/margins)
- [ ] Button sizes consistent
- [ ] Card shadows consistent
- [ ] Typography scale consistent
- [ ] Color palette applied uniformly

### Loading States
- [ ] Skeleton loaders on all data-heavy pages
- [ ] Button loading spinners
- [ ] Optimistic UI updates
- [ ] Error boundaries on page level

### Empty States
- [ ] Helpful messages (not just "No data")
- [ ] Call-to-action buttons
- [ ] Icons/illustrations
- [ ] Examples or guidance

### Micro-interactions
- [ ] Hover states on interactive elements
- [ ] Transition animations smooth
- [ ] Success confirmations (toasts)
- [ ] Deletion confirmations

---

## ⚡ Phase 8: Performance Optimization (45 min)

### Metrics Targets
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Lighthouse Performance > 90
- [ ] No layout shift (CLS < 0.1)

### Optimizations
- [ ] Image optimization (next/image)
- [ ] Code splitting verified
- [ ] Lazy load modals/heavy components
- [ ] Minimize bundle size
- [ ] Database query optimization (check slow queries)

---

## 🚀 Phase 9: Production Smoke Test (30 min)

### Critical Path Verification
Execute full user journeys on production:

**Studio Director Path** (10 min)
1. Login → Dashboard → Dancers → Add Dancer
2. Reservations → Create Reservation → View Invoice
3. Routines → Create Routine → Assign Dancers → Upload Music

**Competition Director Path** (10 min)
1. Login → Dashboard → Reservations → Approve Reservation
2. Studios → Approve Studio
3. Scheduling → Generate Schedule → Export PDF
4. Music Tracking → Bulk Send Reminders

**Judge Path** (10 min)
1. Login → Scoring → Score 3 Routines → Submit
2. Special Awards → Award Recognition
3. Score Review → View All Scores

**Exit Criteria**: All paths complete without errors

---

## 📊 Phase 10: Test Results Documentation (30 min)

### Create Test Report
Document in `E2E_TEST_RESULTS.md`:
- Total tests executed (target: 75+)
- Pass/fail breakdown
- Bugs found and fixed
- Accessibility violations resolved
- Performance metrics
- Outstanding issues (if any)

### Update Status Docs
- Update PROJECT_STATUS.md with test results
- Update BUGS_AND_FEATURES.md with any new findings
- Update PRODUCTION_BUGS.md with resolutions

---

## 🎁 Phase 11: Bonus Features (if time permits)

**Only if all testing complete and bugs fixed:**

### Quick Wins (30 min each)
- [ ] Dashboard widget drag-and-drop reordering
- [ ] Personalized dashboard layouts (save preferences)
- [ ] Multi-user studio accounts (user management)
- [ ] Two-factor authentication
- [ ] Advanced search/filtering

### Start "At Competition Mode" (if 2+ hours remaining)
- [ ] Design competition control panel layout
- [ ] Real-time routine state management
- [ ] WebSocket infrastructure planning
- [ ] Judge tablet sync architecture

---

## 📦 Phase 12: Session Wrap-Up (30 min)

### Deliverables Checklist
- [ ] All code committed and pushed
- [ ] All tests documented
- [ ] All bugs fixed or documented
- [ ] PRODUCTION_BUGS.md updated
- [ ] E2E_TEST_RESULTS.md created
- [ ] PROJECT_STATUS.md updated
- [ ] Clean git status
- [ ] Production deployment verified

### Session Summary
Create `SESSION_SUMMARY_E2E.md`:
- Tests executed: X/75+
- Bugs found: X
- Bugs fixed: X
- Accessibility issues resolved: X
- Performance improvements: X
- New features added: X
- Production stability: [Rating]
- MVP readiness: [%]

---

## 🎯 Success Criteria

**Minimum Requirements**:
- ✅ 75+ E2E tests executed
- ✅ All P0 bugs fixed
- ✅ No critical errors in production
- ✅ All user journeys verified working

**Stretch Goals**:
- ✅ 100+ tests executed
- ✅ WCAG 2.1 AA compliant
- ✅ Lighthouse Performance > 90
- ✅ Zero known bugs in core workflows

---

## ⚠️ Risk Mitigation

**If deployment still queued after 1 hour**:
- Roll back to last working deployment
- Test on that version
- Document deployment queue issue
- Continue with testing on stable version

**If critical bugs found**:
- Prioritize P0 bugs immediately
- Document P1/P2 for post-launch
- Focus on core workflows (SD routine creation, CD reservation approval)

**If time running short**:
- Prioritize Studio Director tests (primary users)
- Minimum 25 tests per journey (75 total)
- Document incomplete tests for next session

---

## 📝 Context for Next Session

**This plan is preserved for auto-compact survival.**

Resume Instructions:
1. Read this file (NEXT_SESSION_PLAN.md)
2. Read E2E_TEST_RESULTS.md (if created)
3. Read PRODUCTION_BUGS.md (latest status)
4. Continue from last completed phase
5. Update progress markers [ ] → [x]

**Key Files to Preserve**:
- NEXT_SESSION_PLAN.md (this file)
- E2E_TEST_RESULTS.md (test documentation)
- PRODUCTION_BUGS.md (bug tracker)
- SESSION_SUMMARY_E2E.md (session summary)

**Quick Start Next Session**:
```bash
# Check production status
git status
git log -3

# Read test progress
cat E2E_TEST_RESULTS.md

# Resume from last phase
grep "\[ \]" NEXT_SESSION_PLAN.md | head -5
```

---

**Total Estimated Time**: 12 hours
**Priority**: Production readiness for Oct 7 MVP launch
**Focus**: Quality > quantity, stability > features
