# MVP Focus Plan - Reservation & Routine Workflow

**Created**: October 5, 2025
**MVP Due**: October 7, 2025 (2 days)
**Focus**: Core workflow verification and stabilization

---

## 🎯 MVP Definition

**Core Workflow**: Studio Directors reserve spaces → Competition Directors approve → Studios create routines

### MVP Must-Work Features
1. **Studio Director**: Create reservation → View status → Create routines (up to approved limit)
2. **Competition Director**: View reservations → Approve/reject → Monitor capacity
3. **Invoicing**: Auto-generated on approval, visible to both parties
4. **Capacity Enforcement**: Hard limits prevent over-booking

---

## ✅ Phase 1: Verify Current Production Status (30 min)

### Critical Bug Fix Verification
- [ ] Entries page deployment status (commit 30ac6c6)
- [ ] Test entries page loads correctly
- [ ] Verify hook ordering fix resolved React error
- [ ] Document in PRODUCTION_BUGS.md

### Quick Smoke Test
- [ ] Login works (SD and CD)
- [ ] Dashboard loads
- [ ] Navigation works

---

## 🧪 Phase 2: Reservation Workflow E2E Testing (1.5 hours)

### Studio Director - Create Reservation
**Test 1: Happy Path**
1. Login as Studio Director
2. Navigate to Reservations
3. Click "Create Reservation"
4. Select competition
5. Enter spaces requested
6. Submit
7. Verify: Reservation appears with "Pending" status

**Test 2: View Reservation Status**
1. View reservations list
2. Verify pending reservation shows
3. Check details accurate (competition, spaces, status)

**Test 3: Invoice Not Generated Yet**
1. Navigate to Invoices
2. Verify no invoice exists for pending reservation

### Competition Director - Approve Reservation
**Test 4: Approve Flow**
1. Login as Competition Director
2. Navigate to Reservations
3. See pending reservation
4. Click "Approve"
5. Verify: Status changes to "Approved"
6. Verify: Competition capacity updated

**Test 5: Auto-Invoice Generation**
1. Check studio's invoice page
2. Verify invoice auto-generated
3. Verify amounts correct (spaces × fee)
4. Verify invoice status "Pending Payment"

**Test 6: Reject Reservation**
1. Create another test reservation
2. CD rejects with reason
3. Verify: Status "Rejected"
4. Verify: No invoice created

### Edge Cases
**Test 7: Capacity Limits**
1. Create reservation exceeding available capacity
2. Verify: Warning or rejection

**Test 8: Multiple Reservations**
1. SD creates multiple reservations
2. CD can approve/reject independently
3. Each generates own invoice

**Exit Criteria**: All 8 tests pass, workflow bulletproof

---

## 🧪 Phase 3: Routine Creation Workflow E2E Testing (2 hours)

### Studio Director - Create Routine (Within Approved Limit)
**Test 1: First Routine Creation**
1. Login as SD (with approved reservation)
2. Navigate to "My Routines"
3. Click "Create Routine"
4. Fill form:
   - Title: "Solo Jazz"
   - Competition: [select approved competition]
   - Category: Jazz
   - Classification: Solo
   - Age Group: Teen
   - Size: Solo
5. Submit
6. Verify: Routine appears in list
7. Verify: Counter shows "1 of X used"

**Test 2: Add Dancers to Routine**
1. Open routine created in Test 1
2. Navigate to dancer assignment
3. Drag dancer from right panel to routine
4. Save
5. Verify: Dancer assigned
6. View routine details shows dancer name

**Test 3: Upload Music**
1. Open routine
2. Navigate to music upload
3. Upload MP3 file
4. Verify: File uploaded, shows in routine details

**Test 4: Multiple Routines**
1. Create second routine (duo)
2. Create third routine (small group)
3. Verify: Counter increments correctly
4. Verify: All routines show in list

**Test 5: Capacity Enforcement**
1. Create routines up to approved limit
2. Verify: Counter shows "X of X used"
3. Verify: "Create Routine" button disabled
4. Verify: Helpful message appears

**Test 6: Edit Routine**
1. Click edit on existing routine
2. Change title, category
3. Save
4. Verify: Changes persisted

**Test 7: Delete Routine**
1. Delete a routine
2. Verify: Counter decrements
3. Verify: "Create Routine" button re-enabled

### Competition Director View
**Test 8: Cross-Studio Visibility**
1. Login as CD
2. View all routines across all studios
3. Verify: Can see routines from multiple studios
4. Verify: Filtering by competition works

**Test 9: Routine Details**
1. CD clicks on routine
2. View details: dancers, music status, category
3. Verify: All information visible

### Edge Cases
**Test 10: No Approved Reservation**
1. SD without approved reservation
2. Try to create routine
3. Verify: Blocked or warned appropriately

**Test 11: Empty States**
1. New SD, no dancers
2. Create routine → assign dancers
3. Verify: Empty state shows helpful message

**Test 12: Music Missing**
1. Routine without music
2. Verify: Shows in music tracking dashboard
3. Verify: Reminder can be sent

**Exit Criteria**: All 12 tests pass, routine workflow solid

---

## 🐛 Phase 4: Fix Critical Bugs Found (1-2 hours)

For each bug found:
1. Add to PRODUCTION_BUGS.md with clear description
2. Assign priority (P0 = blocking MVP)
3. Fix P0 bugs immediately
4. Re-test workflow after fix
5. Commit with detailed message

**Focus**: Only P0 bugs that block reservation/routine workflows

---

## 🎨 Phase 5: UX Polish for Core Workflows (1 hour)

### Reservation Flow
- [ ] Loading states during submission
- [ ] Success confirmation clear
- [ ] Error messages helpful
- [ ] Pending status prominent

### Routine Creation
- [ ] Counter always visible
- [ ] Capacity warnings color-coded
- [ ] Empty states friendly
- [ ] Music upload progress visible

### Navigation
- [ ] Back buttons work correctly
- [ ] Breadcrumbs clear
- [ ] Dashboard cards prominent

---

## 📊 Phase 6: Create E2E Test Documentation (30 min)

Create `MVP_TEST_RESULTS.md`:
```markdown
# MVP E2E Test Results

**Date**: October 5, 2025
**Focus**: Reservation & Routine Workflows

## Test Summary
- **Total Tests**: 20
- **Passed**: X
- **Failed**: X
- **Bugs Found**: X
- **Bugs Fixed**: X

## Reservation Workflow (8 tests)
- [x] SD creates reservation
- [x] SD views pending status
- [x] CD approves reservation
- [x] Invoice auto-generated
- [x] CD rejects reservation
- [x] Capacity limits enforced
- [x] Multiple reservations work
- [x] Status updates accurate

## Routine Workflow (12 tests)
- [x] Create first routine
- [x] Assign dancers
- [x] Upload music
- [x] Create multiple routines
- [x] Capacity counter accurate
- [x] Capacity enforcement works
- [x] Edit routine
- [x] Delete routine
- [x] CD cross-studio view
- [x] CD routine details
- [x] No reservation blocks creation
- [x] Empty states helpful

## Bugs Found & Fixed
1. [Bug description] - Fixed in commit [hash]
2. [Bug description] - Fixed in commit [hash]

## MVP Readiness
- [x] Reservation workflow: READY
- [x] Routine workflow: READY
- [x] Invoice generation: READY
- [x] Capacity enforcement: READY

**Status**: ✅ MVP READY FOR LAUNCH
```

---

## ✅ Phase 7: Production Verification (30 min)

### Final Smoke Test on Production
Execute complete user journey:

**Full Flow Test**:
1. SD creates reservation (Glow Dance Orlando 2025, 20 spaces)
2. CD approves reservation
3. Verify invoice created ($2000 if $100/routine)
4. SD creates 5 different routines:
   - Solo
   - Duo
   - Trio
   - Small group
   - Large group
5. SD assigns dancers to each
6. SD uploads music for each
7. Verify counter shows "5 of 20 used"
8. Verify all routines visible to CD
9. Verify music tracking shows uploaded files
10. Take screenshots at each step

**Exit Criteria**: Complete flow works start-to-finish without errors

---

## 📦 Session Wrap-Up (15 min)

### Final Checklist
- [ ] All code committed and pushed
- [ ] MVP_TEST_RESULTS.md created
- [ ] PRODUCTION_BUGS.md updated (resolved or outstanding)
- [ ] PROJECT_STATUS.md updated with MVP status
- [ ] Screenshots saved as evidence
- [ ] Production verified working

### Update PROJECT_STATUS.md
```markdown
## MVP Status: ✅ READY FOR LAUNCH

**Verification Date**: October 5, 2025
**Core Workflows Tested**: 20/20 tests passed

### Verified Working
- ✅ Studio reservation creation
- ✅ Competition Director approval workflow
- ✅ Auto-invoice generation
- ✅ Routine creation with capacity enforcement
- ✅ Dancer assignment
- ✅ Music upload
- ✅ Cross-studio visibility
- ✅ Empty state handling
- ✅ Error handling

### Production Evidence
- Screenshot: reservation-creation.png
- Screenshot: cd-approval.png
- Screenshot: invoice-generated.png
- Screenshot: routine-creation.png
- Screenshot: capacity-counter.png

**Next**: Final polish and Oct 7 launch
```

---

## 🎯 Success Criteria

**MVP is READY when**:
- ✅ 20 core workflow tests pass
- ✅ No P0 bugs in reservation/routine workflows
- ✅ Full end-to-end user journey verified in production
- ✅ Screenshots document working features
- ✅ Documentation updated

**Time Budget**: 6-8 hours (not 12)
**Focus**: Depth over breadth - perfect the core, ignore the rest

---

## 📝 Resume Instructions

**If session interrupted**:
1. Read MVP_TEST_RESULTS.md (test progress)
2. Check PRODUCTION_BUGS.md (outstanding issues)
3. Continue from next unchecked [ ] task
4. Focus: Fix blockers, verify MVP workflows

**Key principle**: MVP means Minimum Viable - reservation and routine workflows must be bulletproof, everything else is nice-to-have.
