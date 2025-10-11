# 🚨 CRITICAL SECURITY FIX - Broken RLS Policies

**SEVERITY**: CRITICAL - Data leakage across studios
**DISCOVERED**: October 8, 2025
**STATUS**: IMMEDIATE ACTION REQUIRED

---

## 🔴 The Problem

**Multiple RLS policies are BROKEN** - trying to get `studio_id` from `user_profiles` table, but that column doesn't exist!

**Current broken pattern**:
```sql
studio_id IN (
  SELECT dancers.studio_id
  FROM user_profiles
  WHERE user_profiles.id = auth.uid()
)
```

**This fails silently** and likely returns ALL rows (no filtering) - letting users see data from other studios!

---

## 📊 Affected Tables (9 tables)

1. ✅ **dancers** - Users can see ALL dancers from ALL studios
2. ✅ **competition_entries** - Users can see ALL entries from ALL studios
3. ✅ **reservations** - Users can see ALL reservations from ALL studios
4. ✅ **invoices** - Users can see ALL invoices from ALL studios
5. ✅ **email_logs** - Users can see ALL email logs from ALL studios
6. ✅ **documents** - Users can see ALL documents from ALL studios
7. ✅ **entry_participants** - Users can see ALL participants from ALL studios
8. ✅ **awards** - Users can see ALL awards from ALL studios
9. ✅ **rankings** - Users can see ALL rankings from ALL studios

---

## 🔧 The Fix

**Correct relationship**:
- `auth.users` ← `studios.owner_id` (user owns studios)
- `studios.id` ← `dancers.studio_id` (studio has dancers)

**Correct RLS policy**:
```sql
studio_id IN (
  SELECT id
  FROM studios
  WHERE owner_id = auth.uid()
)
```

---

## 🛠️ Apply Fix Immediately

Run this migration to fix ALL broken policies:

```sql
-- CRITICAL: Fix broken RLS policies that allow data leakage

-- 1. Fix dancers policy
DROP POLICY IF EXISTS "Studio access to dancers" ON public.dancers;
CREATE POLICY "Studio access to dancers"
  ON public.dancers
  FOR ALL
  USING (
    studio_id IN (
      SELECT id FROM public.studios WHERE owner_id = auth.uid()
    )
  );

-- 2. Fix competition_entries policy
DROP POLICY IF EXISTS "Studio access to entries" ON public.competition_entries;
CREATE POLICY "Studio access to entries"
  ON public.competition_entries
  FOR ALL
  USING (
    studio_id IN (
      SELECT id FROM public.studios WHERE owner_id = auth.uid()
    )
    OR
    -- Competition directors can see all entries
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('competition_director', 'super_admin')
    )
  );

-- 3. Fix reservations policy
DROP POLICY IF EXISTS "Studio access to reservations" ON public.reservations;
CREATE POLICY "Studio access to reservations"
  ON public.reservations
  FOR ALL
  USING (
    studio_id IN (
      SELECT id FROM public.studios WHERE owner_id = auth.uid()
    )
    OR
    -- Competition directors can see all reservations
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('competition_director', 'super_admin')
    )
  );

-- 4. Fix invoices policy (VIEW)
DROP POLICY IF EXISTS "View invoices" ON public.invoices;
CREATE POLICY "View invoices"
  ON public.invoices
  FOR SELECT
  USING (
    studio_id IN (
      SELECT id FROM public.studios WHERE owner_id = auth.uid()
    )
    OR
    -- Competition directors can see all invoices
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('competition_director', 'super_admin')
    )
  );

-- 5. Fix email_logs policy (VIEW)
DROP POLICY IF EXISTS "View email logs" ON public.email_logs;
CREATE POLICY "View email logs"
  ON public.email_logs
  FOR SELECT
  USING (
    studio_id IN (
      SELECT id FROM public.studios WHERE owner_id = auth.uid()
    )
    OR
    -- Competition directors can see all logs
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('competition_director', 'super_admin')
    )
  );

-- 6. Fix documents policy
DROP POLICY IF EXISTS "Document access control" ON public.documents;
CREATE POLICY "Document access control"
  ON public.documents
  FOR ALL
  USING (
    studio_id IN (
      SELECT id FROM public.studios WHERE owner_id = auth.uid()
    )
    OR uploaded_by = auth.uid()
    OR
    -- Competition directors can see all documents
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('competition_director', 'super_admin')
    )
  );

-- 7. Fix entry_participants policy
DROP POLICY IF EXISTS "Entry participant access" ON public.entry_participants;
CREATE POLICY "Entry participant access"
  ON public.entry_participants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.competition_entries e
      WHERE e.id = entry_participants.entry_id
      AND e.studio_id IN (
        SELECT id FROM public.studios WHERE owner_id = auth.uid()
      )
    )
    OR
    -- Competition directors can see all participants
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('competition_director', 'super_admin')
    )
  );

-- 8. Fix awards policy (Studios can view own awards)
DROP POLICY IF EXISTS "Studios can view own awards" ON public.awards;
CREATE POLICY "Studios can view own awards"
  ON public.awards
  FOR SELECT
  USING (
    entry_id IN (
      SELECT e.id
      FROM public.competition_entries e
      WHERE e.studio_id IN (
        SELECT id FROM public.studios WHERE owner_id = auth.uid()
      )
    )
  );

-- 9. Fix rankings policy (Studios can view own rankings)
DROP POLICY IF EXISTS "Studios can view own rankings" ON public.rankings;
CREATE POLICY "Studios can view own rankings"
  ON public.rankings
  FOR SELECT
  USING (
    entry_id IN (
      SELECT e.id
      FROM public.competition_entries e
      WHERE e.studio_id IN (
        SELECT id FROM public.studios WHERE owner_id = auth.uid()
      )
    )
  );

-- Verify RLS is enabled on all tables
ALTER TABLE public.dancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
```

---

##  ⚠️ Why "Add Dancer" Failed

**Error**: "you need to be associated with a studio to add dancers"

**Root Cause**: Your new user account doesn't have a studio yet!

**The flow should be**:
1. User signs up
2. User creates/registers their studio
3. User can now add dancers to their studio

**Current issue**: No onboarding flow to create studio after signup!

---

## 🔄 Immediate Actions

### 1. Fix RLS Policies (URGENT - stops data leakage)
```bash
# Apply the SQL migration above via Supabase dashboard or MCP
```

### 2. Create Studio for Your Test Account
```sql
-- Temporary fix: Create studio for your new user
INSERT INTO public.studios (
  owner_id,
  name,
  status
) VALUES (
  '[YOUR_NEW_USER_ID]',  -- Get from auth.users
  'Test Studio',
  'approved'
);
```

### 3. Build Studio Onboarding Flow
- After signup, redirect to "Create Your Studio" page
- Collect studio info (name, address, etc.)
- Create studio record linked to user
- Then allow dancer management

---

## 🧪 Test After Fix

1. **Apply RLS fix**
2. **Create studio for test user**
3. **Login as test user**
4. **Try to view dancers** - should see NONE (or only from their studio)
5. **Try to add dancer** - should work now
6. **Login as original demo user**
7. **Verify they can't see test user's dancers**

---

## 📋 Next Steps

1. Apply RLS fix immediately (use Supabase MCP)
2. Get your new user's ID
3. Create studio for that user
4. Test data isolation works
5. Build proper studio onboarding flow

---

**Status**: Ready to apply fix via MCP
