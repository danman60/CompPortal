# Database Side Effects Documentation

**Purpose:** Document hidden database behavior (triggers, functions, RLS policies) that affects application logic.
**Token cost:** ~2.5k tokens. Load when debugging data inconsistencies.

---

## Table of Contents

1. [Triggers](#triggers)
2. [Key Functions](#key-functions)
3. [RLS Patterns](#rls-patterns)
4. [Gotchas](#gotchas)

---

## 1. Triggers

### Trigger: update_dancer_names (entry_participants)

**Table:** `entry_participants`
**Events:** AFTER INSERT, UPDATE, DELETE
**Function:** `update_dancer_names()`

**What it does:**
- Rebuilds `competition_entries.dancer_names` array when participants change
- Aggregates all dancer names (first + last) for the entry
- Sorts alphabetically by last name, then first name

**When it fires:**
- Adding a dancer to an entry (INSERT)
- Changing which dancer is assigned (UPDATE)
- Removing a dancer from entry (DELETE)

**Example scenario:**
```
1. User adds "Jane Smith" to entry #123
2. Trigger fires on entry_participants INSERT
3. competition_entries.dancer_names updated to ['Jane Smith', 'John Doe']
4. No manual update needed - array rebuilds automatically
```

**Gotchas:**
- If dancer_names appears "wrong", check entry_participants first
- Array is rebuilt from scratch on every change (not incremental)
- Order is alphabetical, not insertion order

---

### Trigger: update_dancer_names_from_dancer (dancers)

**Table:** `dancers`
**Events:** AFTER UPDATE
**Function:** `update_dancer_names_from_dancer()`

**What it does:**
- When a dancer's name changes, updates ALL entries containing that dancer
- Finds all entries via `entry_participants.dancer_id`
- Rebuilds dancer_names array for each affected entry

**When it fires:**
- Editing a dancer's first_name or last_name

**Example scenario:**
```
1. User renames "Jane Smith" to "Jane Johnson"
2. Trigger fires on dancers UPDATE
3. Finds 5 entries containing this dancer
4. Updates dancer_names array on all 5 entries
```

**Gotchas:**
- Can affect many entries if dancer is in multiple routines
- Performance impact if dancer has 50+ entries
- Check this trigger if dancer name changes don't appear in entries

---

### Trigger: update_photo_count (media_photos)

**Table:** `media_photos`
**Events:** AFTER INSERT, DELETE
**Function:** `update_media_package_photo_count()`

**What it does:**
- Increments `media_packages.photo_count` on INSERT
- Decrements `media_packages.photo_count` on DELETE

**When it fires:**
- Uploading a photo to a media package
- Deleting a photo from a media package

**Gotchas:**
- Counter can drift if trigger fails (rare)
- Verify with `SELECT COUNT(*) FROM media_photos WHERE media_package_id = ?` if count seems wrong

---

### Trigger: updated_at Triggers (Multiple Tables)

**Tables:** competition_entries, competition_settings, dancers, day_start_times, documents, reservations, studios, user_profiles, invoice_payments, media_packages, scores

**Events:** BEFORE UPDATE
**Function:** `update_updated_at_column()` (or table-specific variants)

**What it does:**
- Automatically sets `updated_at = NOW()` on any row update

**Gotchas:**
- Do NOT manually set updated_at - trigger overwrites it
- Useful for debugging: "when was this last touched?"

---

## 2. Key Functions

### Function: get_user_tenant_id()

**Returns:** `uuid` (tenant_id for current user)
**Security:** SECURITY DEFINER (runs as superuser)

**Used by:**
- Nearly ALL RLS policies
- Ensures users only see their tenant's data

**How it works:**
```sql
SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
```

**Gotchas:**
- SECURITY DEFINER bypasses RLS to prevent recursion
- If user has no profile, returns NULL (blocks all data access)
- Super admins return their assigned tenant_id (not all tenants)

---

### Function: is_super_admin()

**Returns:** `boolean`
**Security:** SECURITY DEFINER

**Used by:**
- RLS policies that allow super admin access
- Pattern: `is_super_admin() OR tenant_id = get_user_tenant_id()`

**How it works:**
```sql
SELECT role = 'super_admin' FROM user_profiles WHERE id = auth.uid()
```

**Gotchas:**
- Only checks role, not permissions
- Super admin can see ALL tenants' data (by design)

---

### Function: calculate_dancer_age()

**Input:** `birth_date DATE, competition_date DATE`
**Returns:** `integer` (age in years)

**Used by:**
- Age division calculations
- Entry validation (age eligibility)

**How it works:**
```sql
RETURN EXTRACT(YEAR FROM AGE(competition_date, birth_date))
```

**Gotchas:**
- Age is calculated AT competition date, not current date
- Uses PostgreSQL's AGE() function for accuracy
- Immutable function - same inputs always return same output

---

### Function: get_next_entry_number()

**Input:** `comp_id UUID`
**Returns:** `integer`

**Used by:**
- Entry creation to assign sequential entry numbers

**How it works:**
```sql
SELECT COALESCE(MAX(entry_number), 0) + 1
FROM competition_entries
WHERE competition_id = comp_id
```

**Gotchas:**
- NOT concurrency-safe (race condition possible)
- For high-volume imports, use application-level locking
- Returns 1 if no entries exist yet

---

## 3. RLS Patterns

### Pattern: Tenant Isolation (Most Tables)

```sql
-- SELECT policy
CREATE POLICY "tenant_isolation_select" ON table_name
FOR SELECT USING (
  is_super_admin() OR tenant_id = get_user_tenant_id()
);

-- INSERT policy
CREATE POLICY "tenant_isolation_insert" ON table_name
FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id()
);

-- UPDATE policy
CREATE POLICY "tenant_isolation_update" ON table_name
FOR UPDATE USING (
  is_super_admin() OR tenant_id = get_user_tenant_id()
);
```

**Applied to:** competitions, studios, dancers, entries, invoices, reservations, etc.

**Effect:**
- Users can only see/modify data from their tenant
- Super admins can see/modify all data
- INSERTs must use user's tenant_id (can't insert to other tenants)

---

### Pattern: Studio Director Access

```sql
CREATE POLICY "studio_access" ON competition_entries
FOR SELECT USING (
  is_super_admin()
  OR tenant_id = get_user_tenant_id()
  OR studio_id IN (
    SELECT studio_id FROM studio_users
    WHERE user_id = auth.uid()
  )
);
```

**Applied to:** competition_entries, dancers, entry_participants

**Effect:**
- Studio directors can see entries for their studios
- Even across different competitions (if they have studio access)

---

### Pattern: Service Role Bypass

```sql
-- All RLS policies check auth.uid()
-- Service role (anon key with service_role) bypasses RLS entirely
```

**Used for:**
- Background jobs
- Admin operations
- Data migrations

**Gotchas:**
- Service role key NEVER exposed to frontend
- Always set tenant_id explicitly in service role operations

---

## 4. Gotchas

### Gotcha: Dancer Names Array Stale

**Symptom:** `competition_entries.dancer_names` doesn't match actual participants

**Cause:** Trigger may have failed or been disabled

**Fix:**
```sql
-- Rebuild dancer_names for specific entry
UPDATE competition_entries
SET dancer_names = (
  SELECT array_agg(d.first_name || ' ' || d.last_name ORDER BY d.last_name, d.first_name)
  FROM entry_participants ep
  JOIN dancers d ON ep.dancer_id = d.id
  WHERE ep.entry_id = competition_entries.id
)
WHERE id = '[entry_id]';

-- Rebuild ALL dancer_names (use sparingly)
UPDATE competition_entries
SET dancer_names = (
  SELECT array_agg(d.first_name || ' ' || d.last_name ORDER BY d.last_name, d.first_name)
  FROM entry_participants ep
  JOIN dancers d ON ep.dancer_id = d.id
  WHERE ep.entry_id = competition_entries.id
);
```

---

### Gotcha: RLS Blocking Expected Data

**Symptom:** Query returns empty when data exists

**Debug steps:**
1. Check `auth.uid()` is set correctly
2. Check user has `user_profiles` entry with correct `tenant_id`
3. Check data has matching `tenant_id`
4. Test as super admin to verify data exists

**Quick debug query:**
```sql
SELECT
  auth.uid() as current_user,
  get_user_tenant_id() as user_tenant,
  is_super_admin() as is_admin;
```

---

### Gotcha: Photo Count Drift

**Symptom:** `media_packages.photo_count` doesn't match actual photos

**Fix:**
```sql
UPDATE media_packages mp
SET photo_count = (
  SELECT COUNT(*) FROM media_photos
  WHERE media_package_id = mp.id
);
```

---

### Gotcha: Entry Number Gaps

**Symptom:** Entry numbers have gaps (1, 2, 5, 6...)

**Cause:** Entries deleted or imported with gaps

**Note:** Gaps are intentional - entry numbers are permanent IDs, not reused.

---

*Last updated: December 25, 2025*
