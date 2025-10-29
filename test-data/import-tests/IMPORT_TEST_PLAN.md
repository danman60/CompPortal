# Import Testing Plan - CSV/Excel Edge Cases

**Created:** October 28, 2025
**Purpose:** Comprehensive testing of dancer import functionality
**Test Files Location:** `test-data/import-tests/dancers/`

---

## Overview

This test plan covers all edge cases for CSV/Excel import functionality, including:
- Perfect matches
- Column name variations
- Data format variations
- Invalid/edge case data
- Duplicates and empty fields
- Special characters
- Extra columns
- Mixed case headers
- Missing required columns

---

## Dancer Import Tests

### Test File 01: Perfect Match (✅ Should Pass)

**File:** `01-perfect-match.csv`
**Description:** All fields correctly formatted with standard column names
**Expected Result:** All 5 dancers imported successfully

**Fields Included:**
- Required: ✅ first_name, last_name
- Optional: ✅ date_of_birth, gender, email, phone, parent_name, parent_email, parent_phone, skill_level

**Expected Dancers:**
1. Emma Johnson (Female, 05/15/2010, Intermediate)
2. Michael Smith (Male, 03/22/2008, Advanced)
3. Sophia Williams (Female, 2012-11-03, Beginner)
4. James Brown (Male, 07/08/2011, Intermediate)
5. Olivia Davis (Female, 12/25/2009, Advanced)

**Testing Steps:**
1. Navigate to `/dashboard/dancers/import`
2. Upload `01-perfect-match.csv`
3. Verify preview shows 5 dancers
4. Confirm import
5. Verify all 5 dancers appear in dancers list
6. Check all fields populated correctly

---

### Test File 02: Column Name Variations (✅ Should Pass)

**File:** `02-column-variations.csv`
**Description:** Tests flexible header matching (e.g., "First Name" → "first_name")
**Expected Result:** All 5 dancers imported successfully with header normalization

**Column Variations Tested:**
- `First Name` → `first_name` ✅
- `Last Name` → `last_name` ✅
- `DOB` → `date_of_birth` ✅
- `Gender` → `gender` ✅
- `Phone Number` → `phone` ✅
- `Skill Level` → `skill_level` ✅

**Expected Dancers:**
1. Ava Martinez (Female, 06/12/2010, Intermediate)
2. Ethan Garcia (Male, 04/18/2009, Advanced)
3. Isabella Rodriguez (Female, 2011-09-22, Beginner)
4. Noah Wilson (Male, 08/30/2012, Intermediate)
5. Mia Anderson (Female, 10/14/2008, Advanced)

**Testing Steps:**
1. Upload `02-column-variations.csv`
2. Verify import recognizes column name variations
3. Confirm all 5 dancers imported
4. Verify data mapped correctly to database fields

---

### Test File 03: Minimal Required Only (✅ Should Pass)

**File:** `03-minimal-required-only.csv`
**Description:** Only required fields (first_name, last_name)
**Expected Result:** All 5 dancers imported with null optional fields

**Fields Included:**
- Required: ✅ first_name, last_name
- Optional: ❌ All omitted

**Expected Dancers:**
1. Charlotte Taylor (no DOB, no gender, no contact info)
2. Liam Thomas
3. Amelia Moore
4. Lucas Jackson
5. Harper White

**Testing Steps:**
1. Upload `03-minimal-required-only.csv`
2. Verify import accepts minimal data
3. Confirm all 5 dancers created
4. Verify optional fields are null/empty in database

---

### Test File 04: Mixed Date Formats (⚠️ Should Handle Gracefully)

**File:** `04-mixed-date-formats.csv`
**Description:** Tests various date format parsing
**Expected Result:** Valid dates parsed correctly, invalid dates skipped or rejected

**Date Formats Tested:**
- `05/15/2010` → MM/DD/YYYY (US format) ✅
- `15/03/2009` → DD/MM/YYYY (EU format) ⚠️
- `2011-11-22` → YYYY-MM-DD (ISO) ✅
- `7/8/2012` → M/D/YYYY (short) ✅
- `2010-01-30` → YYYY-MM-DD ✅
- `12-25-2008` → MM-DD-YYYY ⚠️
- `1/5/2011` → M/D/YYYY ✅
- `2009/06/18` → YYYY/MM/DD ⚠️
- `23/09/2010` → DD/MM/YYYY ⚠️
- `2012.03.14` → YYYY.MM.DD ⚠️

**Expected Dancers:**
10 dancers with varying date parse success rates

**Testing Steps:**
1. Upload `04-mixed-date-formats.csv`
2. Check import preview for date parse warnings
3. Verify which date formats were successfully parsed
4. Confirm dancers imported with valid dates
5. Check error handling for ambiguous dates (e.g., 03/04/2010 - is it Mar 4 or Apr 3?)

---

### Test File 05: Special Characters (✅ Should Pass)

**File:** `05-special-characters.csv`
**Description:** Tests Unicode characters, accents, hyphens, apostrophes
**Expected Result:** All 8 dancers imported with special characters preserved

**Special Characters Tested:**
- Accents: José, Chloé, François, María, André, Zoë, Søren, Amélie
- Hyphens: Saint-Pierre, Rodríguez-López, van der Berg
- Apostrophes: O'Brien, D'Angelo
- Unicode: ø, æ, é, ñ, ö

**Expected Dancers:**
1. José González
2. Chloé O'Brien
3. François Saint-Pierre
4. María Rodríguez-López
5. André D'Angelo
6. Zoë van der Berg
7. Søren Ødegård
8. Amélie Beaumont

**Testing Steps:**
1. Upload `05-special-characters.csv`
2. Verify special characters display correctly in preview
3. Confirm all 8 dancers imported
4. Check database stores UTF-8 characters correctly
5. Verify names display properly in UI

---

### Test File 06: Duplicates and Empties (⚠️ Should Handle Gracefully)

**File:** `06-duplicates-and-empties.csv`
**Description:** Tests duplicate detection and empty field handling
**Expected Result:** Duplicates flagged, empties handled appropriately

**Edge Cases:**
- Row 1 & 2: Exact duplicate (Scarlett Campbell)
- Row 3: Empty date_of_birth (Logan Nelson)
- Row 4: Empty gender (Aria Mitchell)
- Row 5: Empty email (Sebastian Perez)
- Row 6: Empty skill_level (Aria Mitchell)
- Row 7 & 8: Same name, different email (Lily Carter)
- Row 9: Multiple empty fields (Mason Roberts)

**Expected Behavior:**
- Exact duplicates: Skip or flag with warning
- Same name, different data: Allow or prompt for confirmation
- Empty optional fields: Accept and store as null
- Empty required fields: Reject with error

**Testing Steps:**
1. Upload `06-duplicates-and-empties.csv`
2. Check for duplicate detection warnings
3. Verify import skips exact duplicates
4. Confirm dancers with empty optional fields are accepted
5. Verify dancers with empty required fields are rejected

---

### Test File 07: Invalid Data (❌ Should Reject)

**File:** `07-invalid-data.csv`
**Description:** Tests validation of invalid data formats
**Expected Result:** Import rejects rows with invalid data or shows warnings

**Invalid Data Cases:**
- `13/45/2010` → Invalid date (month 13, day 45)
- `02/30/2009` → Invalid date (Feb 30th doesn't exist)
- `2025-01-01` → Future date (questionable but may be allowed)
- `1990-05-15` → Dancer would be 35 years old (questionable)
- `not-an-email` → Invalid email format
- `not-a-phone` → Invalid phone format
- `Unknown` → Invalid gender value
- `Expert` → Invalid skill_level value
- `invalid-date` → Completely invalid date string

**Expected Dancers:**
Potentially 0-3 dancers if validation is strict

**Testing Steps:**
1. Upload `07-invalid-data.csv`
2. Verify validation errors displayed for each invalid field
3. Check that invalid rows are flagged in preview
4. Confirm import either rejects file or skips invalid rows
5. Verify error messages are clear and actionable

---

### Test File 08: Extra Columns (✅ Should Pass)

**File:** `08-extra-columns.csv`
**Description:** Tests handling of extra columns not in schema
**Expected Result:** Extra columns ignored, valid columns imported

**Extra Columns:**
- `favorite_color` (not in schema)
- `shoe_size` (not in schema)
- `allergies` (not in schema)
- `extra_field` (not in schema)

**Expected Dancers:**
1. Elizabeth Cox (extra fields ignored)
2. Christopher Richardson
3. Natalie Cooper
4. Ryan Bailey

**Testing Steps:**
1. Upload `08-extra-columns.csv`
2. Verify import ignores extra columns without errors
3. Confirm all 4 dancers imported
4. Check extra columns not stored in database

---

### Test File 09: Mixed Case Headers (✅ Should Pass)

**File:** `09-mixed-case-headers.csv`
**Description:** Tests case-insensitive header matching
**Expected Result:** All headers recognized regardless of case

**Header Variations:**
- `FIRST_NAME` → first_name ✅
- `last_Name` → last_name ✅
- `Date_Of_Birth` → date_of_birth ✅
- `GENDER` → gender ✅
- `EmAiL` → email ✅
- `SKILL_level` → skill_level ✅

**Mixed Case Data:**
- `male` vs `Male` vs `MALE` (should all be valid)
- `intermediate` vs `Intermediate` vs `INTERMEDIATE`

**Expected Dancers:**
1. Hannah Reed
2. Nathan Cook
3. Sophia Bell
4. William Murphy

**Testing Steps:**
1. Upload `09-mixed-case-headers.csv`
2. Verify case-insensitive header matching works
3. Check case-insensitive data value matching (e.g., "male" = "Male")
4. Confirm all 4 dancers imported with normalized values

---

### Test File 10: Missing Required Columns (❌ Should Reject)

**File:** `10-missing-required-columns.csv`
**Description:** Tests import when required column (last_name) is missing
**Expected Result:** Import rejected with clear error message

**Missing Column:**
- `last_name` (REQUIRED) ❌

**Expected Behavior:**
- Import should fail immediately
- Error message: "Missing required column: last_name"
- No dancers should be imported

**Testing Steps:**
1. Upload `10-missing-required-columns.csv`
2. Verify immediate error on file validation
3. Confirm error message mentions missing required column
4. Check no partial import occurred

---

## Routine Import (Not Yet Implemented)

**Status:** 🚧 Feature does not exist yet

### Proposed Routine Import Fields

**Required:**
- `routine_title` - Name of routine
- `category` - Dance category (Ballet, Jazz, Lyrical, etc.)
- `classification` - Competition level (Recreational, Competitive, Elite, etc.)
- `dancers` - List of dancer names or IDs (comma-separated)

**Optional:**
- `choreographer` - Choreographer name
- `age_group` - Auto-detected if not provided
- `size_category` - Auto-detected if not provided
- `special_requirements` - Props, accessibility needs, etc.
- `music_title` - Song name
- `music_artist` - Artist name
- `music_duration` - Length in seconds

### Sample Routine Import CSV

```csv
routine_title,category,classification,dancers,choreographer,special_requirements
Dreamscape,Jazz,Competitive,"Emma Johnson, Michael Smith, Sophia Williams",Jane Doe,Black backdrop required
Gravity,Contemporary,Elite,"James Brown, Olivia Davis",John Smith,Requires aerial silks
Summer Vibes,Hip Hop,Recreational,"Ava Martinez, Ethan Garcia, Isabella Rodriguez, Noah Wilson",Maria Garcia,None
Swan Lake (Act 2),Ballet,Competitive,"Mia Anderson, Charlotte Taylor",Emily White,Requires pointe shoes
```

### Challenges for Routine Import

1. **Dancer Matching:**
   - How to match dancer names to database IDs?
   - Handle misspellings or variations?
   - Support multiple formats (names vs IDs)?

2. **Data Validation:**
   - Verify all listed dancers exist in database
   - Check dancers belong to same studio
   - Validate category/classification against competition settings

3. **Reservation Association:**
   - Which reservation should the routine be created under?
   - How to handle multi-competition scenarios?

**Recommendation:** Implement routine import in Phase 2 after dancer import is proven stable.

---

## Testing Checklist

### Before Testing
- [ ] Verify import button visible at `/dashboard/dancers/import`
- [ ] Download and review template CSV
- [ ] Check file upload accepts CSV, XLS, XLSX
- [ ] Verify current dancer count for comparison

### During Testing
- [ ] Test all 10 CSV files in order
- [ ] Document actual vs expected results for each
- [ ] Capture screenshots of:
  - [ ] Upload interface
  - [ ] Preview screen
  - [ ] Success confirmations
  - [ ] Error messages
  - [ ] Final dancer list
- [ ] Note performance with large files
- [ ] Test browser back button behavior
- [ ] Test canceling import mid-process

### After Testing
- [ ] Verify database integrity
- [ ] Check for duplicate entries
- [ ] Confirm tenant isolation maintained
- [ ] Review import logs/audit trail
- [ ] Test export CSV matches imported data

---

## Expected Import System Behavior

### File Upload
- ✅ Accepts CSV, XLS, XLSX
- ✅ File size limit: TBD (recommend 10MB max)
- ✅ Shows upload progress for large files
- ✅ Validates file format before processing

### Preview Screen
- ✅ Shows first 5-10 rows of parsed data
- ✅ Displays column mapping (CSV header → DB field)
- ✅ Flags validation errors/warnings
- ✅ Shows counts: Total rows, Valid rows, Invalid rows
- ✅ Allows user to cancel before import

### Import Process
- ✅ Batch inserts for performance
- ✅ Transaction-based (all-or-nothing or skip-invalid-rows)
- ✅ Progress indicator for large files
- ✅ Duplicate detection (name + DOB match)
- ✅ tenant_id automatically added from user session

### Success/Error Handling
- ✅ Success: "X dancers imported successfully"
- ✅ Partial success: "X dancers imported, Y skipped (details below)"
- ✅ Error: Clear message with row numbers and reasons
- ✅ Downloadable error report CSV

### Post-Import
- ✅ Redirect to dancers list or show imported dancers
- ✅ Highlight newly imported dancers
- ✅ Provide "Undo" option (within 5 minutes?)

---

## Performance Benchmarks

| File Size | Rows | Expected Import Time |
|-----------|------|----------------------|
| Small | 1-50 | <5 seconds |
| Medium | 51-500 | <30 seconds |
| Large | 501-2000 | <2 minutes |
| Very Large | 2001+ | May require background job |

---

## Security Considerations

1. **File Type Validation:**
   - Verify file extension matches content type
   - Reject executable files disguised as CSV

2. **Data Sanitization:**
   - Strip HTML/JavaScript from text fields
   - Validate email formats
   - Check phone number formats

3. **Tenant Isolation:**
   - ALWAYS set tenant_id from authenticated user session
   - NEVER allow tenant_id in CSV (security risk)

4. **Rate Limiting:**
   - Limit imports per user per hour
   - Prevent abuse of bulk import feature

---

## Signup Flow with Supabase Edge Function Auth

**Status:** 🚧 To be implemented tonight

### Current Signup Flow Issues (From SIGNUP_TENANT_ANALYSIS.md)

1. **Complex 4-tier tenant resolution** (race conditions possible)
2. **Generic Supabase emails** (not whitelabel)
3. **No user_profiles record on signup** (tenant_id not queryable)
4. **Immediate sign-out workaround** (confusing UX)

### Proposed Supabase Edge Function Solution

**Benefits:**
- ✅ Whitelabel emails via Mailgun
- ✅ tenant_id in database immediately
- ✅ Atomic user + profile creation
- ✅ Simpler, more reliable flow

**Implementation Plan:**
1. Create edge function at `supabase/functions/signup-user/index.ts`
2. Replace `supabase.auth.signUp()` with edge function call
3. Send custom emails via Mailgun API
4. Create user_profiles record with tenant_id
5. Test on both EMPWR and Glow tenants

**Estimated Time:** 4 hours (from SIGNUP_TENANT_ANALYSIS.md)

See `SIGNUP_TENANT_ANALYSIS.md` for complete implementation details.

---

## Next Steps

1. **Tonight's Work:**
   - [ ] Test all 10 dancer import CSV files
   - [ ] Document actual results vs expected
   - [ ] Implement Supabase edge function for signup
   - [ ] Test signup flow on both tenants

2. **Future Enhancements:**
   - [ ] Implement routine import feature
   - [ ] Add "Export to Excel" with formatting
   - [ ] Support bulk update via CSV
   - [ ] Add import history/audit log

---

**Generated by:** Claude Code Import Testing
**Test Files Created:** 10 CSV files
**Coverage:** 100% of identified edge cases
**Status:** Ready for manual testing
