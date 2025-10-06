# CompPortal Testing Prerequisites

**Document Purpose**: Checklist of conditions required for effective production testing with CHATGPT_TEST_AGENT_PROMPT.md

---

## Current State Analysis

### ✅ What's Already Working

**Infrastructure:**
- ✅ Production deployment on Vercel (https://comp-portal-one.vercel.app/)
- ✅ Supabase PostgreSQL database configured
- ✅ Supabase Storage for music files configured
- ✅ Prisma ORM with full schema
- ✅ tRPC API with all routers
- ✅ Email service (Resend) configured with templates

**Code Base:**
- ✅ Authentication (Supabase Auth)
- ✅ Role-based access control (Studio Director, Competition Director)
- ✅ All MVP features implemented
- ✅ Seed script available (prisma/seed.ts)

---

## ⚠️ Required Data Conditions (May Not Be Present)

### 1. **Demo User Accounts** (CRITICAL)

**Required Accounts:**
- Email: `demo.studio@gmail.com`
- Email: `demo.director@gmail.com`
- Both with password: `Demo1234!`

**Status Check:**
```bash
# In Supabase SQL editor or psql:
SELECT email, id FROM auth.users WHERE email IN ('demo.studio@gmail.com', 'demo.director@gmail.com');
```

**If Missing:**
- Need to manually create in Supabase Auth dashboard
- OR update seed script to create via admin API
- OR sign up through production UI

**Database Requirements:**
```sql
-- Check user_profiles exist with correct roles
SELECT id, email, role FROM user_profiles WHERE email IN ('demo.studio@gmail.com', 'demo.director@gmail.com');
-- Should see:
-- demo.studio@gmail.com | role: 'studio_director'
-- demo.director@gmail.com | role: 'competition_director'
```

---

### 2. **Test Data State** (LIKELY NEEDS RESET)

**Required Data Mix:**

**Studios:** (minimum 4)
- ✅ Demo Dance Studio (owned by demo.studio@gmail.com)
- ✅ Rhythm & Motion (different owner)
- ✅ Elite Performance (different owner)
- ✅ Starlight Academy (different owner)

```sql
-- Check studio count and ownership
SELECT s.name, s.status, u.email as owner_email
FROM studios s
LEFT JOIN user_profiles u ON s.owner_id = u.id
ORDER BY s.created_at;

-- Expected: At least 4 studios, one owned by demo.studio@gmail.com
```

**Competitions:** (minimum 1)
- ✅ GlowDance Orlando 2025 (or similar)
- Status: `registration_open`
- Capacity: 600 routines
- Has pricing configured (entry_fee, late_fee)

```sql
-- Check competition exists
SELECT id, name, status, venue_capacity, entry_fee
FROM competitions
WHERE year = 2025;
```

**Reservations:** (CRITICAL - Need specific statuses)
- ⚠️ At least 1 PENDING reservation (for approval test)
- ✅ At least 1 APPROVED reservation with available spaces (e.g., 5/10 used)
- ✅ At least 1 REJECTED reservation (for UI testing)

```sql
-- Check reservation statuses
SELECT
  s.name as studio,
  c.name as competition,
  r.status,
  r.spaces_requested,
  r.spaces_confirmed,
  (SELECT COUNT(*) FROM competition_entries WHERE reservation_id = r.id) as routines_used
FROM reservations r
JOIN studios s ON r.studio_id = s.id
JOIN competitions c ON r.competition_id = c.id
ORDER BY r.status, s.name;

-- Expected: Mix of pending, approved (with available spaces), rejected
```

**⚠️ PROBLEM**: If all reservations are already `approved`, the approval workflow test (Phase 2) cannot be tested!

**Dancers:** (minimum 10)
- ✅ At least 5 dancers for Demo Dance Studio
- ✅ At least 5 dancers for other studios
- With names, ages, genders

```sql
-- Check dancer count per studio
SELECT s.name, COUNT(d.id) as dancer_count
FROM studios s
LEFT JOIN dancers d ON s.id = d.studio_id
GROUP BY s.id, s.name;
```

**Routines (Entries):** (minimum 10)
- ✅ Multiple routines across different studios
- ✅ Entry numbers starting at 100+
- ⚠️ Some routines WITH dancers assigned (for viewing)
- ⚠️ Some routines WITHOUT dancers assigned (for assignment testing)

```sql
-- Check routines and dancer assignments
SELECT
  ce.entry_number,
  ce.title,
  s.name as studio,
  COUNT(ep.id) as dancers_assigned
FROM competition_entries ce
JOIN studios s ON ce.studio_id = s.id
LEFT JOIN entry_participants ep ON ce.id = ep.entry_id
GROUP BY ce.id, ce.entry_number, ce.title, s.name
ORDER BY s.name, ce.entry_number;

-- Expected: Mix of routines with 0 dancers and routines with 1+ dancers
```

**Invoices:** (CRITICAL for payment testing)
- ⚠️ At least 1 invoice with status `pending` or `unpaid`
- ✅ At least 1 invoice with status `paid`

```sql
-- Check invoice payment statuses
SELECT
  s.name as studio,
  c.name as competition,
  i.invoice_number,
  r.paymentStatus,
  i.total_amount
FROM invoices i
JOIN studios s ON i.studio_id = s.id
JOIN competitions c ON i.competition_id = c.id
LEFT JOIN reservations r ON i.id = r.invoice_id
ORDER BY r.paymentStatus;

-- Expected: At least one 'pending' and one 'paid'
```

**⚠️ PROBLEM**: If all invoices are already `paid`, the "mark as paid" test cannot be executed!

---

### 3. **Data Relationships** (CRITICAL)

**Must Be Correct:**

1. **Demo Studio Ownership:**
   ```sql
   -- Verify demo.studio@gmail.com owns "Demo Dance Studio"
   SELECT s.name, u.email
   FROM studios s
   JOIN user_profiles u ON s.owner_id = u.id
   WHERE u.email = 'demo.studio@gmail.com';

   -- Must return exactly ONE studio
   ```

2. **Reservation-Studio-Competition Links:**
   ```sql
   -- All reservations must have valid studio_id and competition_id
   SELECT COUNT(*) as broken_reservations
   FROM reservations r
   WHERE r.studio_id IS NULL OR r.competition_id IS NULL;

   -- Must return 0
   ```

3. **Invoice Generation:**
   ```sql
   -- Check that approved reservations have invoices
   SELECT
     r.id as reservation_id,
     r.status,
     i.id as invoice_id
   FROM reservations r
   LEFT JOIN invoices i ON r.id = (
     SELECT res.id FROM reservations res WHERE res.invoice_id = i.id
   )
   WHERE r.status = 'approved';

   -- All approved reservations should have linked invoices
   ```

---

## 🚫 What Will Break Testing

### Scenario 1: No Pending Reservations
**Impact**: Cannot test Phase 2 (Competition Director approval workflow)
**Fix**: Manually create a pending reservation OR reset database with seed script

### Scenario 2: All Reservations at Capacity
**Impact**: Cannot test Phase 3 (Studio Director creating new routines)
**Example**: Reservation shows "10/10 spaces used" → Create Routine button disabled
**Fix**: Manually reduce routine count OR create new reservation with available spaces

### Scenario 3: All Invoices Paid
**Impact**: Cannot test Phase 5 (Competition Director marking invoice as paid)
**Fix**: Manually update invoice payment status back to 'pending' OR create new unpaid invoice

### Scenario 4: No Unassigned Dancers
**Impact**: Cannot test dancer assignment workflow
**Fix**: Create new dancer OR remove existing dancer assignments

### Scenario 5: Demo Accounts Don't Exist
**Impact**: Cannot authenticate → ALL tests fail
**Fix**: Create accounts in Supabase Auth + user_profiles table

---

## ✅ Email Service (NOT BLOCKING)

**Current Status:**
- Email service (Resend) is configured
- Templates exist for: ReservationApproved, EntrySubmitted, InvoiceDelivery, etc.
- Emails sent on: reservation approval, routine creation, invoice generation

**For Testing:**
- ✅ **NOT REQUIRED** for core workflow testing
- Email failures are logged but don't block mutations
- Tests verify UI updates and database changes, not email delivery

**Optional Verification:**
```typescript
// Check email logs in database
SELECT
  template_name,
  recipient_email,
  status,
  created_at
FROM email_logs
ORDER BY created_at DESC
LIMIT 20;

// Recent emails should show 'sent' status
```

**If emails are failing:**
- Check Resend API key in environment variables
- Check email_logs table for error messages
- NOT a blocker for MVP testing

---

## 🔧 Recommended: Database Reset Before Testing

### Option 1: Run Seed Script (Recommended)

```bash
# From CompPortal directory
npm run seed
# OR
npx prisma db seed
```

**What this does:**
- Clears existing test data (optional, controlled by seed.ts)
- Creates 4 studios (Demo Dance Studio + 3 others)
- Creates 30 dancers across studios
- Creates 1 competition (GlowDance Orlando 2025)
- Creates multiple reservations with MIX of statuses (pending, approved, rejected)
- Creates 23 routines with realistic data
- Generates invoices for approved reservations

**⚠️ PROBLEM**: Seed script may not create Supabase Auth users (demo.studio@gmail.com, demo.director@gmail.com)

### Option 2: Manual Database Setup

**Step 1: Create Auth Users**
- Go to Supabase Dashboard → Authentication → Users
- Click "Add User" (or use SQL if available)
- Create: demo.studio@gmail.com / Demo1234!
- Create: demo.director@gmail.com / Demo1234!

**Step 2: Create User Profiles**
```sql
-- After users created, insert profiles
INSERT INTO user_profiles (id, email, role, first_name, last_name)
VALUES
  ('<demo.studio user_id>', 'demo.studio@gmail.com', 'studio_director', 'Demo', 'Studio'),
  ('<demo.director user_id>', 'demo.director@gmail.com', 'competition_director', 'Demo', 'Director');
```

**Step 3: Run Seed Script**
```bash
npm run seed
```

**Step 4: Link Demo Studio to Demo Account**
```sql
-- Update Demo Dance Studio to be owned by demo.studio@gmail.com
UPDATE studios
SET owner_id = (SELECT id FROM user_profiles WHERE email = 'demo.studio@gmail.com')
WHERE name = 'Demo Dance Studio';
```

### Option 3: Partial Reset (Testing-Friendly)

If database has existing data but wrong states:

```sql
-- Reset some reservations to pending (for approval testing)
UPDATE reservations
SET status = 'pending'
WHERE id IN (
  SELECT id FROM reservations
  WHERE status = 'approved'
  ORDER BY created_at DESC
  LIMIT 2
);

-- Reset some invoices to unpaid (for payment testing)
UPDATE reservations
SET "paymentStatus" = 'pending'
WHERE id IN (
  SELECT r.id FROM reservations r
  JOIN invoices i ON r.invoice_id = i.id
  WHERE r."paymentStatus" = 'paid'
  ORDER BY r.updated_at DESC
  LIMIT 2
);

-- Create available space in a reservation (for routine creation testing)
-- Delete some routines to free up spaces
DELETE FROM competition_entries
WHERE id IN (
  SELECT id FROM competition_entries
  WHERE reservation_id = '<some approved reservation id>'
  ORDER BY created_at DESC
  LIMIT 3
);
-- This frees 3 spaces in that reservation
```

---

## 📋 Pre-Test Checklist

Before running CHATGPT_TEST_AGENT_PROMPT.md, verify:

### Authentication:
- [ ] demo.studio@gmail.com account exists in Supabase Auth
- [ ] demo.director@gmail.com account exists in Supabase Auth
- [ ] Both accounts have user_profiles with correct roles
- [ ] demo.studio@gmail.com owns "Demo Dance Studio"

### Data States:
- [ ] At least 1 PENDING reservation exists
- [ ] At least 1 APPROVED reservation with available spaces (e.g., 5/10 used)
- [ ] At least 1 invoice with `pending` or `unpaid` status
- [ ] At least 5 dancers in Demo Dance Studio
- [ ] At least 10 total routines across all studios
- [ ] Some dancers are unassigned (for assignment testing)
- [ ] At least 1 routine has 0 dancers (for assignment testing)

### Database Integrity:
- [ ] All reservations have valid studio_id and competition_id
- [ ] All approved reservations have linked invoices
- [ ] All routines have valid reservation_id (space limit enforcement)
- [ ] No orphaned data (entry_participants without valid entry_id)

### Infrastructure:
- [ ] Production site loads at https://comp-portal-one.vercel.app/
- [ ] No build errors in Vercel deployment logs
- [ ] Supabase database responding (no downtime)
- [ ] No critical console errors on page load

---

## 🎯 Summary: What's Needed

### CRITICAL (Testing will fail without these):
1. ✅ Demo accounts exist in Supabase Auth
2. ⚠️ Demo accounts have correct roles in user_profiles
3. ⚠️ At least 1 PENDING reservation
4. ⚠️ At least 1 APPROVED reservation with available spaces
5. ⚠️ At least 1 UNPAID invoice
6. ✅ Database relationships intact

### IMPORTANT (Tests will be limited):
7. ⚠️ Multiple studios with data (for cross-studio testing)
8. ⚠️ Mix of assigned/unassigned dancers
9. ✅ Competition exists with capacity settings

### OPTIONAL (Nice to have):
10. ✅ Email service working (logs show 'sent')
11. ✅ Music upload storage configured
12. ✅ Realistic seed data with 30+ dancers

---

## 🚀 Recommended Action Plan

**BEFORE TESTING:**

1. **Check if demo accounts exist** (5 min)
   - Try logging in to production with demo.studio@gmail.com / Demo1234!
   - Try logging in with demo.director@gmail.com / Demo1234!
   - If either fails → create accounts in Supabase Auth dashboard

2. **Run database query to check data states** (5 min)
   ```sql
   -- Quick status check
   SELECT 'Pending Reservations' as check_name, COUNT(*) as count FROM reservations WHERE status = 'pending'
   UNION ALL
   SELECT 'Approved Reservations with Space', COUNT(*) FROM reservations r WHERE status = 'approved' AND (SELECT COUNT(*) FROM competition_entries WHERE reservation_id = r.id) < r.spaces_confirmed
   UNION ALL
   SELECT 'Unpaid Invoices', COUNT(*) FROM reservations WHERE "paymentStatus" IN ('pending', 'sent')
   UNION ALL
   SELECT 'Unassigned Dancers', COUNT(*) FROM dancers d WHERE NOT EXISTS (SELECT 1 FROM entry_participants WHERE dancer_id = d.id);
   ```

3. **If data states are wrong** (10 min)
   - Option A: Run `npm run seed` to reset with fresh test data
   - Option B: Run partial reset SQL queries above

4. **Quick smoke test** (5 min)
   - Sign in as demo.studio@gmail.com → check dashboard loads
   - Sign in as demo.director@gmail.com → check dashboard loads
   - Verify no critical console errors

**TOTAL TIME: ~25 minutes to prepare for effective testing**

---

## 💡 Key Insight

The testing protocol is **comprehensive and exacting**, but it requires:
- **Correct authentication** (demo accounts)
- **Specific data states** (pending reservations, unpaid invoices, available spaces)
- **Data consistency** (no orphaned records, correct relationships)

**Without these conditions**, tests will:
- Skip approval workflow (no pending reservations)
- Skip routine creation (no available spaces)
- Skip payment workflow (no unpaid invoices)
- Fail authentication (no demo accounts)

**Recommendation**: Reset database with seed script + manually create demo accounts = clean slate for testing.
