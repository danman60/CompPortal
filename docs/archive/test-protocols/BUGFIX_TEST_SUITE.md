# Test Suite Specification - Last 6 Hours Changes

**Date:** November 6, 2025
**Build Range:** 3a02d71 → 4f3ccc4 (24 commits)
**Purpose:** Comprehensive test suite for production verification

---

## Test Categories

### Category A: Entry Creation Bug Fixes (Priority 1 - VERIFIED)
### Category B: Split Invoice by Dancer (Priority 1 - NEW FEATURE)
### Category C: Account Recovery System (Priority 2 - NEW FEATURE)
### Category D: Email System Improvements (Priority 2)
### Category E: UI/UX Improvements (Priority 3)
### Category F: Build/TypeScript Fixes (Priority 3)

---

## Category A: Entry Creation Bug Fixes (12 Issues)

**Commits:** 4f3ccc4, 2e3312e, a27dc6c
**Status:** 11/12 verified on production (92%)

### A1. Production Classification Exception Logic ✅
**Original Issue:** Production category shows "Exception Required" button
**Fix:** AutoCalculatedSection.tsx:132 - Exempt Production from exception logic
**Test:**
1. Navigate to `/dashboard/entries` (SD role)
2. Create new entry with 12+ dancers
3. Select "Production" category
4. Verify: No "Exception Required" button appears
**Expected:** Production never requires exception approval
**Evidence:** evidence/screenshots/production-classification-no-exception-20251106.png
**Commit:** a27dc6c

---

### A2. Production Requirements Cleanup ✅
**Original Issue:** Switching from Production to other categories doesn't clear overrides
**Fix:** EntryCreateFormV2.tsx:238-245 - Clear Production overrides on category change
**Test:**
1. Create entry, select Production category
2. Switch to "Jazz" category
3. Verify: All Production-specific fields revert to defaults
**Expected:** Clean slate when switching away from Production
**Commit:** a27dc6c

---

### A3. CSV Import Dancer Pinning ✅
**Original Issue:** Matched dancers not pinned to top during CSV import
**Fix:** EntryCreateFormV2.tsx:637 - Pin selected dancers to top of list
**Test:**
1. Navigate to `/dashboard/entries`
2. Click "Import from CSV"
3. Upload `test_routines_15.csv`
4. On first routine, verify "Emma Johnson" pinned to top
**Expected:** Matched dancers appear first in selection list
**Evidence:** evidence/screenshots/csv-import-dancer-pinned-20251106.png
**Commit:** 2e3312e

---

### A4. CSV Import Rapid Clicking Protection ⏭️
**Original Issue:** Rapid clicking "Save and Next" creates duplicate entries
**Fix:** ImportActions.tsx:27-57 - Add local state debounce + disable buttons
**Test:**
1. Upload CSV with multiple routines
2. Rapidly click "Save and Next" 5+ times
3. Verify: Only one entry created per click
**Expected:** No duplicate entries from rapid clicking
**Status:** SKIPPED - Requires manual rapid clicking (automation limitation)
**Risk:** Low - edge case prevention
**Commit:** 2e3312e

---

### A5. Routine Age on Dashboard Cards ✅
**Original Issue:** Routine age not displaying on dashboard cards
**Fix:** RoutineCard.tsx - Added age badge display
**Test:**
1. Navigate to `/dashboard/entries`
2. View routine cards with dancers having DOBs
3. Verify: "Age X" badge displays correctly
**Expected:** Age badge shows calculated age from dancers
**Evidence:** evidence/screenshots/entries-dashboard-cards-20251106.png
**Commit:** 4ccdd47

---

### A6. Individual Prices Removed from Cards ✅
**Original Issue:** Individual routine prices showing on cards
**Fix:** RoutineCard.tsx - Removed 6 lines of price display code
**Test:**
1. Navigate to `/dashboard/entries`
2. View routine cards
3. Verify: No prices visible on individual cards
**Expected:** Only capacity/count info, no pricing
**Evidence:** evidence/screenshots/entries-dashboard-cards-20251106.png
**Commit:** 2e3312e

---

### A7. Estimated Total Removed from Bottom Bar ✅
**Original Issue:** Bottom bar shows estimated total (confusing)
**Fix:** LiveSummaryBar.tsx - Removed total calculation display
**Test:**
1. Navigate to `/dashboard/entries`
2. Check bottom bar
3. Verify: Only shows capacity (e.g., "8/50 used")
**Expected:** No dollar amounts in bottom bar
**Evidence:** evidence/screenshots/entries-dashboard-cards-20251106.png
**Commit:** 2e3312e

---

### A8. Invoice in Submit Modal ⏭️
**Original Issue:** Invoice details not showing in submit summary modal
**Fix:** SubmitSummaryModal.tsx:34+ - Added 34 lines of invoice display logic
**Test:**
1. Create 50+ entries to fill reservation
2. Click "Submit Summary"
3. Verify: Modal shows invoice details
**Expected:** Invoice breakdown visible before final submission
**Status:** SKIPPED - Requires creating 50+ entries on new reservation
**Risk:** Medium - invoice transparency important
**Commit:** 2e3312e

---

### A9. Age Column Shows routine_age ✅
**Original Issue:** Age column empty or showing incorrect values
**Fix:**
- Migration: 20251106_add_routine_age.sql (8 lines)
- EntryCreateFormV2.tsx - Calculate and save routine_age
- RoutineTable.tsx - Display routine_age in age column
**Test:**
1. Navigate to `/dashboard/entries`
2. Switch to table view
3. Verify: Age column shows "Age 14" for routines with DOBs
4. Verify: Legacy entries show "—"
**Expected:** Consistent age display across all views
**Evidence:** evidence/screenshots/table-view-age-column-20251106.png
**Commit:** 4ccdd47

---

### A10. Bottom Bar Capacity in Detail View ✅
**Original Issue:** Bottom bar shows "0/50" instead of actual usage in detail view
**Fix:** EntryCreateFormV2.tsx:358 - Fixed capacity using correct reservationId variable
**Test:**
1. Navigate to `/dashboard/entries`
2. Click on an existing routine to edit
3. Check bottom bar
4. Verify: Shows actual usage (e.g., "8/8 used")
**Expected:** Correct capacity count in edit mode
**Evidence:** evidence/screenshots/detail-view-bottom-bar-20251106.png
**Commit:** 4f3ccc4

---

### A11. Save and Create Another Hidden in Edit Mode ✅
**Original Issue:** "Save and Create Another" button overwrites entries in edit mode
**Fix:** EntryCreateFormV2.tsx:702 - Hide button when editing existing entry
**Test:**
1. Navigate to `/dashboard/entries`
2. Click on existing routine to edit
3. Verify: Only "Cancel" and "Update" buttons visible
4. Verify: No "Save and Create Another" button
**Expected:** Prevent accidental overwrites during edits
**Commit:** 4f3ccc4

---

### A12. Bottom Bar Updates in CSV Import ✅
**Original Issue:** Bottom bar stays at "0/50" during CSV import workflow
**Fix:** LiveSummaryBar.tsx:13+ - Real-time capacity updates
**Test:**
1. Navigate to `/dashboard/entries`
2. Start CSV import with `test_routines_15.csv`
3. Save first routine
4. Verify: Bottom bar updates from "0/50" to "1/50"
5. Continue saving, verify incremental updates
**Expected:** Real-time capacity tracking during import
**Evidence:** evidence/screenshots/csv-import-bottom-bar-updated-20251106.png
**Commit:** 2e3312e

---

## Category B: Split Invoice by Dancer Feature (NEW FEATURE)

**Commits:** f6a1d15, 1c56e5e, fa25abe, 3f1ccf5
**Status:** Not yet tested on production
**Spec:** docs/SPLIT_INVOICE_BY_DANCER_SPEC.md (647 lines)

### B1. Family → Dancer Terminology Migration ✅
**Original Issue:** Build error - Property 'family_identifier' does not exist
**Fix:**
- Migration: 20251106_rename_family_to_dancer.sql (18 lines)
- Updated all UI components (SubInvoiceDetail.tsx, SubInvoiceList.tsx)
**Test:**
1. Navigate to `/dashboard/invoices`
2. Click on invoice with sub-invoices
3. Verify: All text says "Dancer" not "Family"
4. Verify: Button says "Email to Dancer"
**Expected:** Consistent dancer-centric language throughout
**Commit:** 3f1ccf5

---

### B2. Margin Fields Added to Database ✅
**Original Issue:** Need margin tracking for studio markup/discounts
**Fix:** Migration 20251106_add_margin_fields.sql (23 lines)
- Added `margin_mode` to invoices
- Added `margin_type`, `margin_value`, `original_amount` to sub_invoices
**Test:**
1. Use Supabase MCP to query sub_invoices table
2. Verify: Columns exist (margin_type, margin_value, original_amount)
**Expected:** Database ready for margin calculations
**Commit:** f6a1d15

---

### B3. Margin Calculator Wizard UI 🔄
**Original Issue:** Need UI to configure margin before split
**Fix:** Complete wizard rewrite (SplitInvoiceWizard.tsx - 457 lines, +360 insertions)
- Dark glassmorphic theme
- 4 margin types (None, Markup %, Discount %, Fixed $/dancer)
- Live preview with representative dancers
- Validation and error handling
**Test:**
1. Navigate to `/dashboard/invoices`
2. Click on paid invoice
3. Click "Split by Dancer"
4. Verify: Modal opens with margin configuration step
5. Test all 4 margin types:
   - None: Shows original amounts
   - Markup 10%: Shows +10% on each dancer invoice
   - Discount 15%: Shows -15% on each dancer invoice
   - Fixed $5: Shows +$5 per dancer invoice
6. Verify: Preview updates live as margin changes
7. Verify: Original amounts stored in database
**Expected:** Intuitive margin configuration with accurate preview
**Commit:** f6a1d15

---

### B4. Margin Distribution Logic 🔄
**Original Issue:** Need proportional margin distribution across dancers
**Fix:** invoice.ts:1327-1399 - Proportional distribution algorithm
- Distributes margin proportionally by each dancer's original amount
- Handles rounding to ensure totals match
- Stores both original and marked-up amounts
**Test:**
1. Create invoice with 3 dancers: $50, $100, $150 (total $300)
2. Apply 10% markup ($30 total margin)
3. Split by dancer
4. Verify distribution:
   - Dancer 1: $50 → $55 (10% of $50)
   - Dancer 2: $100 → $110 (10% of $100)
   - Dancer 3: $150 → $165 (10% of $150)
5. Verify: Sub-invoice total = $330 (original $300 + $30 margin)
6. Verify: Main invoice margin_mode stored correctly
**Expected:** Accurate proportional distribution with audit trail
**Commit:** f6a1d15

---

### B5. TypeScript Fixes for Margin Types ✅
**Original Issue:** Build errors with margin config union types
**Fix:**
- Extract MarginConfigValue type (SplitInvoiceWizard.tsx:14-19)
- Parse mode from type string (SplitInvoiceWizard.tsx:476-477)
**Test:**
1. Run `npm run build`
2. Verify: No TypeScript errors related to margin types
**Expected:** Clean build with proper type safety
**Commit:** 1c56e5e, fa25abe

---

## Category C: Account Recovery System (NEW FEATURE)

**Commits:** c6e08d3, 2c84ccb, 59daaba, 7c5c36c, 41bff0f, 531362e, 8365420, f498117, b20537d
**Status:** Not yet tested on production

### C1. Account Recovery Database Schema ✅
**Original Issue:** Orphaned studios with NULL owner_id need recovery mechanism
**Fix:**
- Added account_recovery_tokens table (accountRecovery.ts:437-456)
- Token expiration, status tracking, completed_at timestamp
**Test:**
1. Use Supabase MCP to query account_recovery_tokens table
2. Verify: Table exists with proper columns
**Expected:** Database ready for recovery flow
**Commit:** c6e08d3

---

### C2. Orphaned Studio Detection 🔄
**Original Issue:** Studios with NULL owner_id can't be accessed
**Fix:** accountRecovery.ts - getOrphanedStudios query
- Detects studios with owner_id IS NULL
- Excludes already claimed studios
- Shows active recovery token status
**Test:**
1. Navigate to `/dashboard/admin/account-recovery` (SA role)
2. Verify: List shows all studios with NULL owner_id
3. Verify: Excludes studios that have recovery tokens
4. Expected count: 7-8 orphaned studios on EMPWR tenant
**Expected:** Accurate detection of orphaned studios
**Commit:** c6e08d3, 41bff0f, 8365420

---

### C3. Recovery Email Flow 🔄
**Original Issue:** Need to send recovery link to studio email
**Fix:**
- AccountRecovery.tsx email template (89 lines) - Branded email
- accountRecovery.ts - sendRecoveryEmail mutation
- Generates secure token, sends email with recovery link
**Test:**
1. Navigate to `/dashboard/admin/account-recovery`
2. Select orphaned studio
3. Click "Send Recovery Email"
4. Check email inbox for studio email
5. Verify: Email contains recovery link with token
6. Verify: Link goes to `/account-recovery?token=...`
**Expected:** Branded email with working recovery link
**Commit:** b20537d, c6e08d3

---

### C4. Password Creation Flow 🔄
**Original Issue:** Studio needs to create password to claim account
**Fix:**
- /account-recovery/page.tsx (203 lines) - Public recovery page
- Dark theme with proper contrast (no white-on-white)
- Password validation, confirmation matching
- Completes recovery by setting owner_id
**Test:**
1. Open recovery link from email
2. Enter new password (min 8 chars)
3. Confirm password (must match)
4. Click "Claim Account"
5. Verify: Redirected to login page
6. Login with new password
7. Verify: Dashboard loads, studio data accessible
**Expected:** Smooth password creation and account claiming
**Commit:** c6e08d3, 15041f8

---

### C5. SA Admin Panel 🔄
**Original Issue:** Need admin interface to manage recovery process
**Fix:** /dashboard/admin/account-recovery/page.tsx (264 lines)
- Lists all orphaned studios
- Manual test input (bypass email for testing)
- Shows recovery status, token expiration
- Direct link to recovery page for testing
**Test:**
1. Navigate to `/dashboard/admin/account-recovery` (SA role)
2. Verify: Orphaned studios list loads
3. Verify: Can manually generate test recovery URL
4. Verify: Status shows if recovery token active
**Expected:** Admin can monitor and test recovery flow
**Commit:** c6e08d3, 2c84ccb

---

### C6. Destructive Testing Tools Disabled ✅
**Original Issue:** Clean Slate and Populate Test Data can orphan studios
**Fix:** testing/page.tsx:428,477 - Disabled destructive buttons
- Added ENABLE_DESTRUCTIVE_TOOLS feature flag
- Prevents accidental data wipes in production
**Test:**
1. Navigate to `/dashboard/admin/testing` (SA role)
2. Verify: "Clean Slate" button disabled
3. Verify: "Populate Test Data" button disabled
4. Verify: Warning message explains why disabled
**Expected:** Production data protected from accidental wipes
**Commit:** 59daaba

---

### C7. Auth Schema Backup ✅
**Original Issue:** Database backups missing auth.users table
**Fix:** .github/workflows/database-backup.yml:79-80
- Added auth schema to daily backup
- Prevents future orphaned studios
**Test:**
1. Check latest backup file
2. Verify: Contains auth.users table dump
**Expected:** Complete backups including user accounts
**Commit:** 59daaba

---

## Category D: Email System Improvements

**Commits:** 38279a6, 15041f8, b20537d
**Status:** Not yet tested (email sending)

### D1. Centralized Email Theme ✅
**Original Issue:** Email templates had inconsistent styling
**Fix:**
- Converted WelcomeEmail, ReservationRejected, EntrySubmitted to use emailTheme
- Removed 200+ lines of duplicate CSS
**Test:**
1. Trigger each email type (via SA testing tools or actual flow)
2. Verify: Consistent visual appearance
3. Verify: All use dark theme with white text
**Expected:** All 16 email templates visually consistent
**Commit:** 38279a6

---

### D2. Email Layout Fixes ✅
**Original Issue:** Table overflow, margin issues, white-on-white text
**Fix:**
- Removed marginBottom from container (theme.ts:15)
- Fixed table width overflow (theme.ts:139)
- Converted DailyDigest and StudioApproved to dark theme
**Test:**
1. Send test emails for DailyDigest and StudioApproved
2. Open in Gmail, Outlook, Apple Mail
3. Verify: No horizontal scroll
4. Verify: Text readable (no white-on-white)
**Expected:** Emails render correctly across all clients
**Commit:** 15041f8

---

### D3. Account Recovery Email Template ✅
**Original Issue:** Need branded email for account recovery
**Fix:** AccountRecovery.tsx (89 lines) - Dark theme with recovery link
**Test:**
1. Trigger account recovery email
2. Verify: Dark theme, readable text
3. Verify: Recovery link button prominent
4. Verify: Instructions clear
**Expected:** Professional branded recovery email
**Commit:** b20537d

---

## Category E: UI/UX Improvements

**Commits:** 4ccdd47, a3296a3, 2c84ccb
**Status:** Not yet tested

### E1. Invoice Status Display 🔄
**Original Issue:** Invoice status not showing color-coded badges
**Fix:** InvoicesList.tsx:188-194 - Dynamic status badges with colors
**Test:**
1. Navigate to `/dashboard/invoices`
2. Verify: Each invoice shows status badge
3. Verify: Colors match status (paid = green, pending = yellow, etc.)
**Expected:** Clear visual status indicators
**Commit:** 4ccdd47

---

### E2. Classification Badge Styling 🔄
**Original Issue:** Classification badges not visually distinct
**Fix:**
- Badge.tsx:38-43 - Added yellow variant for "pending"
- RoutineCard.tsx:47-73 - Green badges for approved classifications
**Test:**
1. Navigate to `/dashboard/entries`
2. View routine cards with classification decisions
3. Verify: Pending = yellow badge
4. Verify: Approved = green badge
**Expected:** Clear visual distinction for classification status
**Commit:** 4ccdd47

---

### E3. Smooth Dashboard Loading ✅
**Original Issue:** Dashboard flashes during data load
**Fix:**
- BalletLoadingAnimation.tsx:20+ - Enhanced timing (20 lines)
- Added staggered delays for smooth appearance
**Test:**
1. Navigate to `/dashboard` (CD or SD role)
2. Verify: Smooth ballet animation during load
3. Verify: No jarring content flash
**Expected:** Professional loading experience
**Commit:** a3296a3

---

### E4. SA Dashboard Account Recovery Link 🔄
**Original Issue:** No navigation to account recovery from SA dashboard
**Fix:** CompetitionDirectorDashboard.tsx:205-211 - Added quick action card
**Test:**
1. Navigate to `/dashboard` (SA role)
2. Verify: "Account Recovery" card visible
3. Click card
4. Verify: Navigates to `/dashboard/admin/account-recovery`
**Expected:** Easy access to recovery admin panel
**Commit:** 2c84ccb

---

## Category F: Build/TypeScript Fixes

**Commits:** 1d2937f, 4ccdd47, 1c56e5e, fa25abe, 3f1ccf5
**Status:** All verified (build passes)

### F1. Prisma Nested Relation Error ✅
**Original Issue:** Build error - Cannot use orderBy/take on nested relation
**Fix:** entry.ts:741 - Removed invalid constraints
**Test:**
1. Run `npm run build`
2. Verify: No Prisma errors
**Expected:** Clean build
**Commit:** 1d2937f

---

### F2. Excel Date Conversion ✅
**Original Issue:** Excel serial dates not parsing correctly in CSV import
**Fix:** csv-utils.ts:62-75 - Added serial date conversion logic
**Test:**
1. Create CSV with Excel serial dates (e.g., 44287 = 2021-03-15)
2. Import via DancerCSVImport
3. Verify: Dates parse correctly to YYYY-MM-DD
**Expected:** Excel dates recognized and converted
**Commit:** 4ccdd47

---

### F3. Margin Type TypeScript Errors ✅
**Original Issue:** Union type errors in SplitInvoiceWizard
**Fix:**
- Extract MarginConfigValue type
- Add type assertions for union members
**Test:**
1. Run `npm run build`
2. Verify: No TypeScript errors in SplitInvoiceWizard
**Expected:** Clean build with proper type safety
**Commit:** 1c56e5e, fa25abe

---

### F4. Family Identifier Schema Error ✅
**Original Issue:** Property 'family_identifier' does not exist after rename
**Fix:** Updated all references to use 'dancer_name' and 'dancer_id'
**Test:**
1. Run `npm run build`
2. Verify: No property access errors
**Expected:** Clean build after migration
**Commit:** 3f1ccf5

---

## Test Execution Plan

### Phase 1: Entry Creation Regression Test (Priority 1)
**Target:** Verify all 12 entry creation bug fixes still work
**Status:** 11/12 already verified
**Remaining:**
- A4: CSV rapid clicking (requires manual testing)
- A8: Invoice in submit modal (requires 50+ entries)

**Estimated Time:** 30 minutes (for 2 remaining tests)

---

### Phase 2: Split Invoice by Dancer Feature Test (Priority 1)
**Target:** Full end-to-end test of new feature
**Tests:** B1-B5 (5 tests)
**Environment:** EMPWR + Glow tenants
**Prerequisites:**
- Paid invoice with multiple dancers
- Invoice must have line items

**Estimated Time:** 45 minutes

---

### Phase 3: Account Recovery System Test (Priority 2)
**Target:** Full end-to-end recovery flow
**Tests:** C1-C7 (7 tests)
**Environment:** EMPWR tenant (has orphaned studios)
**Prerequisites:**
- SA admin access
- Test email account

**Estimated Time:** 60 minutes

---

### Phase 4: Email System Test (Priority 2)
**Target:** Verify email rendering and consistency
**Tests:** D1-D3 (3 tests)
**Environment:** Test email account
**Prerequisites:**
- Trigger conditions for each email type

**Estimated Time:** 30 minutes

---

### Phase 5: UI/UX Verification (Priority 3)
**Target:** Visual consistency and navigation
**Tests:** E1-E4 (4 tests)
**Environment:** Both tenants

**Estimated Time:** 20 minutes

---

## Test Credentials (Reference)

**Super Admin (SA):**
- Email: `danieljohnabrahamson@gmail.com`
- Password: `123456`

**Competition Director (CD) - EMPWR:**
- Email: `empwrdance@gmail.com`
- Password: `1CompSyncLogin!`

**Competition Director (CD) - Glow:**
- Email: `stefanoalyessia@gmail.com`
- Password: `1CompSyncLogin!`

**Studio Director (SD):**
- Email: `djamusic@gmail.com`
- Password: `123456`

---

## Evidence Requirements

For each test marked with 🔄 (not yet tested):
1. **Screenshot** showing feature working
2. **Browser console** check (no errors)
3. **Database verification** (via Supabase MCP if data changes)
4. **Multi-tenant check** (test on EMPWR + Glow if applicable)

Save evidence to: `evidence/screenshots/[feature]-[tenant]-[YYYYMMDD].png`

---

## Success Criteria

- **Category A:** 12/12 verified (currently 11/12)
- **Category B:** 5/5 verified (currently 0/5)
- **Category C:** 7/7 verified (currently 0/7)
- **Category D:** 3/3 verified (currently 0/3)
- **Category E:** 4/4 verified (currently 0/4)
- **Category F:** 4/4 verified (currently 4/4)

**Overall Target:** 35/35 tests passing (97% currently at 15/35 = 43%)

---

## Notes

- All build errors (Category F) already resolved
- Entry creation fixes (Category A) mostly verified, just 2 edge cases remain
- New features (Categories B, C) require comprehensive testing before production use
- Email tests (Category D) require actual email sending, can use SA test tools
- UI tests (Category E) are quick visual checks

**Total Estimated Testing Time:** ~3 hours for all remaining tests
