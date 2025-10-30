# Phase 1 Test Plan - Production Testing
**Date:** October 28, 2025
**Environment:** Production (empwr.compsync.net)
**Execution Method:** Playwright MCP + Supabase MCP

## Test Credentials
- **SD Login:** danieljohnabrahamson@gmail.com / 123456
- **CD Login:** empwrdance@gmail.com / 1CompSyncLogin!

---

## Test Suite Categories

### 1. Tenant Isolation Tests (CRITICAL)
- [ ] 1.1: SD cannot see other tenant's competitions
- [ ] 1.2: SD cannot see other tenant's dancers
- [ ] 1.3: SD cannot see other tenant's reservations
- [ ] 1.4: CD cannot see other tenant's data in admin views
- [ ] 1.5: Database queries filter by tenant_id correctly

### 2. Dancer Management Tests
- [ ] 2.1: Create dancer manually (valid data)
- [ ] 2.2: Create dancer with duplicate name+DOB (should fail)
- [ ] 2.3: Create dancer with invalid DOB (future date - should fail)
- [ ] 2.4: Edit existing dancer
- [ ] 2.5: Delete dancer (soft delete)
- [ ] 2.6: Import dancers via CSV/Excel
- [ ] 2.7: Import dancers with duplicates (should skip)
- [ ] 2.8: Import dancers with invalid data (should report errors)

### 3. Reservation Submission Tests (SD)
- [ ] 3.1: Submit reservation with valid entry count
- [ ] 3.2: Submit reservation exceeding available capacity (should fail)
- [ ] 3.3: Submit reservation with 0 entries (should fail)
- [ ] 3.4: Submit multiple reservations for same event (should allow)
- [ ] 3.5: Submit duplicate pending reservation (should fail)
- [ ] 3.6: View submitted reservations list
- [ ] 3.7: Check email notification sent to CD

### 4. Reservation Review Tests (CD)
- [ ] 4.1: View pending reservations list
- [ ] 4.2: Approve reservation (full amount)
- [ ] 4.3: Approve reservation (adjusted amount)
- [ ] 4.4: Reject reservation (with reason <20 chars - should fail)
- [ ] 4.5: Reject reservation (with valid reason ≥20 chars)
- [ ] 4.6: Verify capacity deducted on approval
- [ ] 4.7: Verify capacity NOT deducted on rejection
- [ ] 4.8: Check email notification sent to SD on approval
- [ ] 4.9: Check email notification sent to SD on rejection

### 5. Entry Creation Tests (SD)
- [ ] 5.1: Create entry (no dancers exist - should fail)
- [ ] 5.2: Create entry with valid data
- [ ] 5.3: Add dancers to entry (at least 1 required)
- [ ] 5.4: Add dancers to entry (no dancers selected - should fail)
- [ ] 5.5: Create entry exceeding approved quota (should fail)
- [ ] 5.6: Verify auto-calculated age division (based on youngest dancer)
- [ ] 5.7: Verify auto-calculated group size (solo/duo/trio/small/large)
- [ ] 5.8: Create solo entry with title upgrade
- [ ] 5.9: Create duo/group entry with title upgrade (should fail)
- [ ] 5.10: Edit entry in draft status (all fields editable)
- [ ] 5.11: Edit entry in submitted status (limited fields)
- [ ] 5.12: Delete entry (soft delete, returns quota)
- [ ] 5.13: Validate routine name (3-255 chars, alphanumeric)

### 6. Summary Submission Tests (SD)
- [ ] 6.1: Submit summary with no entries (should fail)
- [ ] 6.2: Submit summary with entries
- [ ] 6.3: Verify entries_used + entries_unused = entries_approved
- [ ] 6.4: Verify immediate capacity refund (unused entries)
- [ ] 6.5: Verify reservation status changes to 'summarized'
- [ ] 6.6: Verify entry status changes to 'submitted'
- [ ] 6.7: Verify summary snapshot created (audit trail)
- [ ] 6.8: Submit duplicate summary (should fail)
- [ ] 6.9: Check email notification sent to CD
- [ ] 6.10: Verify SD cannot edit after summary submission

### 7. Invoice Generation Tests (CD)
- [ ] 7.1: Create invoice from summarized reservation
- [ ] 7.2: Verify base cost calculation (entries_used × entry_fee)
- [ ] 7.3: Verify title upgrade cost calculation
- [ ] 7.4: Apply 5% discount
- [ ] 7.5: Apply 10% discount
- [ ] 7.6: Apply 15% discount
- [ ] 7.7: Apply invalid discount (e.g., 20% - should fail)
- [ ] 7.8: Apply credits (valid amounts with labels)
- [ ] 7.9: Apply credits exceeding subtotal (should fail)
- [ ] 7.10: Verify tax calculation (taxable_amount × tax_rate)
- [ ] 7.11: Verify total = taxable_amount + tax
- [ ] 7.12: Create invoice from non-summarized reservation (should fail)
- [ ] 7.13: Create duplicate invoice (should fail)
- [ ] 7.14: Verify reservation status changes to 'invoiced'
- [ ] 7.15: Verify entry status changes to 'invoiced'
- [ ] 7.16: Check email notification sent to SD

### 8. Payment Processing Tests (CD)
- [ ] 8.1: Mark invoice as paid (Check payment method)
- [ ] 8.2: Mark invoice as paid (Wire Transfer)
- [ ] 8.3: Mark invoice as paid (E-transfer)
- [ ] 8.4: Mark already paid invoice (should fail)
- [ ] 8.5: Verify reservation status changes to 'closed'
- [ ] 8.6: Verify payment method and reference stored
- [ ] 8.7: Verify payment date recorded
- [ ] 8.8: Check email notification sent to SD

### 9. PDF Generation Tests
- [ ] 9.1: Download reservation confirmation PDF
- [ ] 9.2: Download summary PDF
- [ ] 9.3: Download invoice PDF (SD view - no notes)
- [ ] 9.4: Download invoice PDF (CD view - with notes)
- [ ] 9.5: Verify PDF contains correct data
- [ ] 9.6: Verify PDF formatting (no broken layouts)

### 10. State Transition Tests
- [ ] 10.1: Verify pending → approved transition
- [ ] 10.2: Verify pending → adjusted transition
- [ ] 10.3: Verify pending → rejected transition
- [ ] 10.4: Verify approved → summarized transition
- [ ] 10.5: Verify summarized → invoiced transition
- [ ] 10.6: Verify invoiced → closed transition
- [ ] 10.7: Attempt invalid transitions (should fail)

### 11. Capacity Management Tests
- [ ] 11.1: Verify initial capacity set correctly
- [ ] 11.2: Verify capacity deducted on approval
- [ ] 11.3: Verify capacity NOT deducted on pending
- [ ] 11.4: Verify capacity refunded on summary submission (unused)
- [ ] 11.5: Verify capacity ledger audit trail
- [ ] 11.6: Test race condition (concurrent reservations)
- [ ] 11.7: Verify remaining capacity calculation

### 12. Edge Cases & Error Handling
- [ ] 12.1: Submit reservation with exactly remaining capacity
- [ ] 12.2: Submit reservation with capacity +1 (should fail)
- [ ] 12.3: Create entry with all fields at max length
- [ ] 12.4: Create entry with routine name special chars
- [ ] 12.5: Create dancer with age exactly at min boundary
- [ ] 12.6: Create dancer with age exactly at max boundary
- [ ] 12.7: Create dancer with age outside all divisions (should fail)
- [ ] 12.8: Delete entry and recreate within quota
- [ ] 12.9: Apply max credit (equals subtotal - discount)
- [ ] 12.10: Test with 0% tax rate
- [ ] 12.11: Test with large entry counts (100+)

### 13. UI/UX Visual Tests
- [ ] 13.1: Screenshot dancer list page
- [ ] 13.2: Screenshot entry creation form
- [ ] 13.3: Screenshot reservation list (SD view)
- [ ] 13.4: Screenshot reservation review (CD view)
- [ ] 13.5: Screenshot summary submission modal
- [ ] 13.6: Screenshot invoice creation form
- [ ] 13.7: Screenshot invoice list
- [ ] 13.8: Check for broken layouts
- [ ] 13.9: Check for missing buttons/actions
- [ ] 13.10: Verify responsive design (if applicable)

### 14. Database Validation Tests
- [ ] 14.1: Verify tenant_id present in all records
- [ ] 14.2: Verify FK relationships intact
- [ ] 14.3: Verify soft deletes (deleted_at timestamps)
- [ ] 14.4: Verify state transitions recorded
- [ ] 14.5: Verify capacity ledger entries
- [ ] 14.6: Verify summary_entries junction records
- [ ] 14.7: Check for orphaned records
- [ ] 14.8: Verify database triggers (updated_at)

---

## Test Execution Order

1. **Setup Phase**
   - Login as SD
   - Verify tenant isolation
   - Create test dancers

2. **Reservation Flow**
   - Submit reservation
   - Login as CD
   - Review and approve
   - Verify capacity

3. **Entry Creation**
   - Login as SD
   - Create entries
   - Add dancers
   - Verify auto-calculations

4. **Summary & Invoice**
   - Submit summary
   - Verify capacity refund
   - Login as CD
   - Create invoice
   - Verify calculations

5. **Payment**
   - Mark as paid
   - Verify final state

6. **Cleanup & Validation**
   - Database checks
   - PDF generation
   - Visual snapshots

---

## Success Criteria
- All tenant isolation tests pass
- All happy path tests pass
- At least 80% of edge cases pass
- No broken UI elements
- All PDFs generate correctly
- Database integrity maintained
- No cross-tenant data leaks

## Error Reporting Format
```
ERROR: [Test ID] [Test Name]
Expected: [Expected behavior]
Actual: [Actual behavior]
Screenshot: [filename]
Database State: [relevant query results]
Severity: [Critical/High/Medium/Low]
```
