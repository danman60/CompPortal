# CompPortal Schema Deployment Instructions

**Project**: CompPortal (GlowDance Competition Portal)
**Supabase Project**: cafugvuaatsgihrsmvvl
**Deployment Method**: Manual via Supabase Dashboard
**Date**: September 30, 2025

---

## 📋 Pre-Deployment Checklist

- ✅ Supabase project created: `cafugvuaatsgihrsmvvl`
- ✅ Service role key saved in `.env.local`
- ✅ Schema file ready: `supabase/schema.sql` (1,105 lines)
- ✅ Database confirmed empty (ready for fresh deployment)

---

## 🚀 Deployment Steps

### Step 1: Access the SQL Editor

1. Go to your Supabase dashboard:
   ```
   https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl
   ```

2. Click on **SQL Editor** in the left sidebar (icon looks like `</>`)

3. Click **New Query** button (top right)

### Step 2: Deploy the Schema

1. Open the schema file: `CompPortal/supabase/schema.sql`

2. **Copy ALL contents** of the file (1,105 lines)

3. **Paste** into the SQL Editor

4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

5. **Wait** for execution to complete (may take 30-60 seconds)

### Step 3: Verify Deployment

After the schema runs successfully, verify the deployment:

#### Check 1: Count Tables
```sql
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';
```
**Expected Result**: Should show **30+ tables**

#### Check 2: List All Tables
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
**Expected Tables** (partial list):
- user_profiles
- studios
- dancers
- competitions
- competition_locations
- competition_sessions
- classifications
- age_groups
- dance_categories
- entry_size_categories
- reservations
- competition_entries
- entry_participants
- judges
- scores
- rankings
- awards
- award_types
- title_rounds
- vip_events
- elite_instructors
- documents
- system_settings
- email_templates

#### Check 3: Verify Seed Data
```sql
-- Check classifications
SELECT name, skill_level FROM classifications ORDER BY skill_level;

-- Check age groups
SELECT name, min_age, max_age FROM age_groups ORDER BY sort_order;

-- Check dance categories
SELECT name FROM dance_categories ORDER BY sort_order;

-- Check entry sizes
SELECT name, min_participants, max_participants FROM entry_size_categories ORDER BY sort_order;
```

**Expected Seed Data**:
- **Classifications**: Recreational, Competitive, Crystal, Titanium
- **Age Groups**: 6 groups (Mini through Senior+)
- **Dance Categories**: 9 categories (Ballet, Jazz, Lyrical, etc.)
- **Entry Sizes**: 5 sizes (Solo through Production)

#### Check 4: Verify RLS Policies
```sql
SELECT
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
**Expected**: Multiple RLS policies for access control

#### Check 5: Verify Functions
```sql
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```
**Expected Functions**:
- `handle_new_user()`
- `update_updated_at_column()`
- `calculate_dancer_age()`
- `get_next_entry_number()`

---

## ⚠️ Troubleshooting

### Error: "permission denied"
- Make sure you're logged in with the correct account
- Verify you have owner/admin access to the project

### Error: "relation already exists"
- Database is not empty - check existing tables first
- You may need to drop existing tables or use a fresh project

### Error: "syntax error"
- Make sure you copied the ENTIRE schema file
- Check that no characters were lost during copy/paste

### Schema runs but no tables appear
- Refresh the Table Editor page
- Try running the verification queries in SQL Editor

### Seed data not loading
- Seed data is at the bottom of schema.sql
- Make sure the entire file was copied including the INSERT statements

---

## ✅ Post-Deployment

Once deployment is successful:

1. **Update the roadmap** - Mark "Schema Deployed" as complete in `PRODUCTION_ROADMAP.md`

2. **Test connection from code**:
   ```javascript
   // Test query from your app
   const { data, error } = await supabase
     .from('classifications')
     .select('*');
   ```

3. **Next steps**:
   - Set up Next.js project (Phase 1)
   - Configure Prisma ORM
   - Build tRPC API layer

---

## 📊 Schema Overview

### Core Tables (30+)
- **Authentication**: user_profiles
- **Studio Management**: studios, dancers
- **Competition Structure**: competitions, competition_locations, competition_sessions
- **Classification System**: classifications, age_groups, dance_categories, entry_size_categories
- **Registration**: reservations, competition_entries, entry_participants
- **Judging**: judges, scores, rankings, awards, award_types
- **Enterprise Features**: title_rounds, vip_events, elite_instructors
- **Infrastructure**: documents, system_settings, email_templates

### Key Features
- ✅ UUID primary keys throughout
- ✅ Timestamps (created_at, updated_at) with auto-update triggers
- ✅ Row Level Security (RLS) policies configured
- ✅ Foreign key constraints for data integrity
- ✅ 15+ performance indexes
- ✅ Real-time subscriptions enabled
- ✅ Helper functions for business logic

---

## 🔐 Security Notes

- Service role key has full database access (use for admin tasks only)
- RLS policies enforce data isolation between studios
- Studio owners can only see their own data
- Admins and judges have elevated access based on role

---

## 📞 Support

If you encounter issues:
1. Check the verification queries above
2. Review error messages carefully
3. Check Supabase dashboard logs (Logs → SQL)
4. Refer to `PRODUCTION_ROADMAP.md` for next steps

---

**Schema File Location**: `D:\ClaudeCode\CompPortal\supabase\schema.sql`
**Lines**: 1,105
**Size**: 38.79 KB
**Last Updated**: September 25, 2025
