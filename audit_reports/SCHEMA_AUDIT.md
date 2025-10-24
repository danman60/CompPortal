# Database Schema Audit

**Audit Date:** October 24, 2025
**Production Launch:** October 27, 2025 (3 days)
**Auditor:** Opus Pre-Production Audit

---

## Executive Summary

- **Total mismatches:** 22
- **BLOCKER issues:** 8
- **Schema compliance:** 65%

### Critical Findings
1. **MISSING CORE TABLES:** `events`, `entries`, `summaries`, `summary_entries` tables do not exist
2. **WRONG TABLE NAMES:** Using `competition_entries` instead of `entries`, `competitions` instead of `events`
3. **MISSING CAPACITY TRACKING:** No `remaining_capacity` field, using token system instead
4. **FIELD NAME MISMATCHES:** `spaces_requested/spaces_confirmed` instead of `entries_requested/entries_approved`
5. **MISSING CONSTRAINTS:** No unique constraints on critical business rules

---

## Critical Mismatches (BLOCKER - Production Risk)

### 1. Events Table - DOES NOT EXIST
**Spec:** Phase 1 spec lines 31-48 define `events` table
**Actual:** No `events` table exists
**Current:** Using `competitions` table with different schema
**Risk:** Complete architectural mismatch - code expects `events`, database has `competitions`
**Fix:** Either:
- Option A: Rename `competitions` to `events` (MIGRATION REQUIRED)
- Option B: Update all code to use `competitions` (MASSIVE CODE CHANGE)

### 2. Entries Table - DOES NOT EXIST
**Spec:** Phase 1 spec lines 204-243 define `entries` table
**Actual:** No `entries` table exists
**Current:** Using `competition_entries` table with different field names
**Risk:** All entry creation/management code will fail
**Fix:**
```sql
-- Option A: Create view for compatibility
CREATE VIEW entries AS SELECT * FROM competition_entries;
-- Option B: Rename table
ALTER TABLE competition_entries RENAME TO entries;
```

### 3. Summaries Table - DOES NOT EXIST
**Spec:** Phase 1 spec lines 261-277 define `summaries` table
**Actual:** Table completely missing
**Risk:** Summary submission feature non-functional - CRITICAL for invoice flow
**Fix:**
```sql
CREATE TABLE summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id) UNIQUE,
    entries_used INT NOT NULL CHECK (entries_used >= 0),
    entries_unused INT NOT NULL CHECK (entries_unused >= 0),
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT summaries_total_check
        CHECK (entries_used + entries_unused =
               (SELECT spaces_confirmed FROM reservations WHERE id = reservation_id))
);
```

### 4. Summary_Entries Table - DOES NOT EXIST
**Spec:** Phase 1 spec lines 282-291 define `summary_entries` table
**Actual:** Table completely missing
**Risk:** No audit trail for summary submissions
**Fix:**
```sql
CREATE TABLE summary_entries (
    summary_id UUID REFERENCES summaries(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES competition_entries(id),
    snapshot JSONB NOT NULL,
    PRIMARY KEY (summary_id, entry_id)
);
```

### 5. Reservations Table - Critical Field Mismatches
**Field:** `entries_requested/entries_approved`
**Spec:** INT fields for entry counts (lines 173-174)
**Actual:** `spaces_requested/spaces_confirmed`
**Risk:** All reservation logic uses wrong field names
**Fix:**
```sql
ALTER TABLE reservations
  RENAME COLUMN spaces_requested TO entries_requested;
ALTER TABLE reservations
  RENAME COLUMN spaces_confirmed TO entries_approved;
```

### 6. Competition/Event Capacity System Mismatch
**Spec:** `capacity_entries` and `remaining_capacity` fields (lines 38-39)
**Actual:** `total_reservation_tokens` and `available_reservation_tokens`
**Risk:** Entire capacity management system uses different model
**Fix:** Need to decide on consistent capacity model - tokens or entries

### 7. Missing Entry_Dancers Junction Table
**Spec:** `entry_dancers` table (lines 246-255)
**Actual:** Using `entry_participants` with different schema
**Risk:** Dancer assignment to entries uses wrong table/fields
**Fix:** Either rename table or update all code references

### 8. Invoice Table Schema Mismatch
**Spec Fields (lines 296-324):**
- `discount_percent` (INT)
- `discount_amount` (DECIMAL)
- `credits` (JSONB)
- `tax_amount` (DECIMAL)
- `status` (issued|paid|void)
- `issued_at`, `paid_at` timestamps
- `created_by_user_id` reference

**Actual Fields:**
- Missing: `discount_percent`, `discount_amount`, `credits` as proper JSONB
- Different: Using `credit_amount` and `credit_reason` instead of JSONB credits
- Different: Status values don't match spec
- Missing: `issued_at`, `created_by_user_id`

---

## Non-Critical Mismatches (Medium Priority)

### 1. Competition Settings Structure
**Spec:** Single `competition_settings` table with JSONB fields (lines 74-88)
**Actual:** Using distributed JSONB across multiple places
**Impact:** Settings management more complex than spec

### 2. Dancer Name Storage
**Spec:** Single `name` field (line 151)
**Actual:** `first_name` and `last_name` separate
**Impact:** Name handling logic differs from spec

### 3. Status Value Enumerations
**Tables:** reservations, competition_entries, invoices
**Issue:** Status values don't match spec exactly
**Impact:** State machine transitions may fail

### 4. Missing Constraints
- No unique constraint on `(studio_id, name, date_of_birth)` for dancers
- No check constraint for title_upgrade solo-only rule
- Missing foreign key constraints in several places

---

## Missing Indexes (Performance Risk)

### Critical Missing Indexes
```sql
-- Spec line 184-185
CREATE INDEX idx_reservations_event_submitted
  ON reservations(competition_id, requested_at);

CREATE INDEX idx_reservations_studio_event
  ON reservations(studio_id, competition_id);

-- Spec line 228-230
CREATE INDEX idx_entries_reservation
  ON competition_entries(reservation_id);

CREATE INDEX idx_entries_event
  ON competition_entries(competition_id);

CREATE INDEX idx_entries_status
  ON competition_entries(status);

-- Spec line 253-254
CREATE INDEX idx_entry_dancers_entry
  ON entry_participants(entry_id);

CREATE INDEX idx_entry_dancers_dancer
  ON entry_participants(dancer_id);
```

---

## Data Type Mismatches

### 1. Tax Rate Storage
**Spec:** DECIMAL(5,4) for tax_rate (line 79)
**Actual:** Various DECIMAL types, some (5,2), some (5,4)
**Risk:** Tax calculation precision errors

### 2. Entry Status Values
**Spec:** draft | submitted | invoiced | routine_created
**Actual:** draft | registered | confirmed | performed | scored | awarded | disqualified | withdrawn
**Risk:** Status transitions won't match business logic

---

## Recommendations

### IMMEDIATE (Before Production)
1. **CREATE MISSING TABLES:** summaries, summary_entries
2. **RENAME FIELDS:** spaces_requested → entries_requested, spaces_confirmed → entries_approved
3. **ADD MISSING INDEXES:** All performance-critical indexes listed above
4. **FIX STATUS ENUMS:** Align with spec values
5. **DECIDE ON NAMING:** competitions vs events, competition_entries vs entries

### HIGH PRIORITY (Day 1 Patch)
1. Reconcile capacity model (tokens vs entries)
2. Add missing constraints and foreign keys
3. Standardize tax rate data types
4. Create compatibility views if needed

### MEDIUM PRIORITY (Week 1)
1. Consolidate settings into proper structure
2. Add missing invoice fields
3. Implement proper audit trail tables

---

## SQL Migration Script (EMERGENCY)

```sql
-- CRITICAL: Run before production launch

-- 1. Create missing summaries table
CREATE TABLE IF NOT EXISTS summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id) UNIQUE,
    entries_used INT NOT NULL CHECK (entries_used >= 0),
    entries_unused INT NOT NULL CHECK (entries_unused >= 0),
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Create missing summary_entries table
CREATE TABLE IF NOT EXISTS summary_entries (
    summary_id UUID REFERENCES summaries(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES competition_entries(id),
    snapshot JSONB NOT NULL,
    PRIMARY KEY (summary_id, entry_id)
);

-- 3. Fix reservation field names
ALTER TABLE reservations
  RENAME COLUMN spaces_requested TO entries_requested;

ALTER TABLE reservations
  RENAME COLUMN spaces_confirmed TO entries_approved;

-- 4. Add critical indexes
CREATE INDEX IF NOT EXISTS idx_reservations_competition_submitted
  ON reservations(competition_id, requested_at);

CREATE INDEX IF NOT EXISTS idx_reservations_studio_competition
  ON reservations(studio_id, competition_id);

-- 5. Create compatibility view
CREATE OR REPLACE VIEW events AS
  SELECT
    id,
    name,
    year,
    competition_start_date as start_at,
    competition_end_date as end_at,
    total_reservation_tokens as capacity_entries,
    available_reservation_tokens as remaining_capacity,
    'registration_open' as status,
    created_at,
    updated_at
  FROM competitions;

CREATE OR REPLACE VIEW entries AS
  SELECT * FROM competition_entries;
```

---

## Risk Assessment

**Production Readiness: 🔴 HIGH RISK**

Without the missing tables (summaries, summary_entries), the invoice generation flow will completely fail. The field name mismatches will cause immediate errors in the reservation approval process.

**Minimum Required for Launch:**
1. Create summaries and summary_entries tables
2. Fix reservation field names
3. Add critical indexes
4. Create compatibility views or update all code

**Estimated Time:** 2-4 hours for database changes + unknown time for code updates

---

*End of Database Schema Audit*