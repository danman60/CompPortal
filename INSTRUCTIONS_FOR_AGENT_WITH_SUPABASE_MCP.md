# Instructions for Agent with Supabase MCP

**Session Context:** Entry form bug fixes completed (commit ba89da3). Two tasks require Supabase MCP access.

---

## Task 1: Populate Time Limits in Database ⏱️

**Priority:** HIGH - Required for Extended Time feature to display correctly

### Objective
Execute SQL script to populate `max_time_minutes` and `max_time_seconds` columns in `entry_size_categories` table for both tenants.

### Steps

1. **Read the SQL script:**
   ```bash
   cat update_time_limits.sql
   ```

2. **Execute using Supabase MCP:**
   Use `mcp__supabase__execute_sql` with the following SQL:

   ```sql
   -- EMPWR tenant updates
   UPDATE entry_size_categories
   SET max_time_minutes = 3, max_time_seconds = 0
   WHERE name = 'Solo' AND tenant_id = '00000000-0000-0000-0000-000000000001';

   UPDATE entry_size_categories
   SET max_time_minutes = 3, max_time_seconds = 0
   WHERE name IN ('Duet', 'Trio') AND tenant_id = '00000000-0000-0000-0000-000000000001';

   UPDATE entry_size_categories
   SET max_time_minutes = 4, max_time_seconds = 0
   WHERE name = 'Small Group' AND tenant_id = '00000000-0000-0000-0000-000000000001';

   UPDATE entry_size_categories
   SET max_time_minutes = 5, max_time_seconds = 0
   WHERE name = 'Large Group' AND tenant_id = '00000000-0000-0000-0000-000000000001';

   UPDATE entry_size_categories
   SET max_time_minutes = 5, max_time_seconds = 0
   WHERE name = 'Line' AND tenant_id = '00000000-0000-0000-0000-000000000001';

   UPDATE entry_size_categories
   SET max_time_minutes = 6, max_time_seconds = 0
   WHERE name = 'Super Line' AND tenant_id = '00000000-0000-0000-0000-000000000001';

   UPDATE entry_size_categories
   SET max_time_minutes = 7, max_time_seconds = 0
   WHERE name = 'Production' AND tenant_id = '00000000-0000-0000-0000-000000000001';

   -- Glow tenant updates
   UPDATE entry_size_categories
   SET max_time_minutes = 3, max_time_seconds = 0
   WHERE name = 'Solo' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

   UPDATE entry_size_categories
   SET max_time_minutes = 3, max_time_seconds = 0
   WHERE name IN ('Duet', 'Trio') AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

   UPDATE entry_size_categories
   SET max_time_minutes = 4, max_time_seconds = 0
   WHERE name = 'Small Group' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

   UPDATE entry_size_categories
   SET max_time_minutes = 5, max_time_seconds = 0
   WHERE name = 'Large Group' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

   UPDATE entry_size_categories
   SET max_time_minutes = 5, max_time_seconds = 0
   WHERE name = 'Line' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

   UPDATE entry_size_categories
   SET max_time_minutes = 6, max_time_seconds = 0
   WHERE name = 'Super Line' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

   UPDATE entry_size_categories
   SET max_time_minutes = 7, max_time_seconds = 0
   WHERE name = 'Production' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';
   ```

3. **Verify the updates:**
   ```sql
   SELECT name, max_time_minutes, max_time_seconds, tenant_id
   FROM entry_size_categories
   ORDER BY tenant_id, min_participants;
   ```

4. **Expected Result:**
   - All rows should have non-null `max_time_minutes` values
   - EMPWR tenant (00000000-0000-0000-0000-000000000001): 7 size categories updated
   - Glow tenant (4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5): 7 size categories updated
   - Total: 14 rows updated

5. **Success Criteria:**
   - No errors during execution
   - All 14 size categories have time limits populated
   - Values match the standard dance competition time limits

---

## Task 2: Fix Testing Environment - SA Studio Issue 🔧

**Priority:** HIGH - Blocking testing workflows

### Problem
User (SA account: danieljohnabrahamson@gmail.com) accidentally completed onboarding flow and created a new studio. This broke the testing environment:
- Studio code changed
- 100 test dancers disappeared
- Testing Tools path broken

### Desired State
SA account should be linked to the test studio (owned by djamusic@gmail.com) which has 100 test dancers with varied classifications.

### Investigation Steps

1. **Find all studios for both users:**
   ```sql
   SELECT
     s.id,
     s.name,
     s.studio_code,
     s.owner_id,
     s.created_at,
     u.email,
     u.role
   FROM studios s
   JOIN user_profiles u ON s.owner_id = u.id
   WHERE u.email IN ('danieljohnabrahamson@gmail.com', 'djamusic@gmail.com')
   ORDER BY s.created_at DESC;
   ```

2. **Count dancers per studio:**
   ```sql
   SELECT
     s.id as studio_id,
     s.name as studio_name,
     s.studio_code,
     u.email as owner_email,
     COUNT(d.id) as dancer_count
   FROM studios s
   JOIN user_profiles u ON s.owner_id = u.id
   LEFT JOIN dancers d ON s.id = d.studio_id
   WHERE u.email IN ('danieljohnabrahamson@gmail.com', 'djamusic@gmail.com')
   GROUP BY s.id, s.name, s.studio_code, u.email
   ORDER BY dancer_count DESC;
   ```

3. **Identify the studios:**
   - Look for studio with 100 dancers (this is the correct test studio)
   - Look for recently created studio with 0 dancers (this is the accidentally created studio)

### Fix Options

**Option A: Delete New SA Studio (Recommended)**
```sql
-- First, verify which studio to delete (0 dancers, created today)
SELECT id, name, studio_code, created_at
FROM studios s
JOIN user_profiles u ON s.owner_id = u.id
WHERE u.email = 'danieljohnabrahamson@gmail.com'
AND created_at > NOW() - INTERVAL '1 day';

-- Soft delete (if studio has status column)
UPDATE studios
SET status = 'cancelled'
WHERE id = '[NEW_STUDIO_ID_HERE]';

-- OR Hard delete (if no dependencies)
DELETE FROM studios WHERE id = '[NEW_STUDIO_ID_HERE]';
```

**Option B: Update Testing Tools to Use Correct Studio**
If SA user needs their own studio, update the Testing Tools component to use the correct test studio ID:

File: `src/app/dashboard/admin/testing/page.tsx`

Find the studio ID reference and update to use the studio with 100 dancers.

### Verification

After fix, verify:

1. **Check SA can access test studio:**
   ```sql
   SELECT s.id, s.name, COUNT(d.id) as dancer_count
   FROM studios s
   LEFT JOIN dancers d ON s.id = d.studio_id
   WHERE s.id IN (
     SELECT studio_id FROM user_profiles
     WHERE email = 'danieljohnabrahamson@gmail.com'
   )
   GROUP BY s.id, s.name;
   ```
   Should show: 100 dancers

2. **Test with Playwright MCP:**
   - Navigate to: https://empwr.compsync.net/dashboard/admin/testing
   - Login as: danieljohnabrahamson@gmail.com / 123456
   - Click "TEST ROUTINES DASHBOARD"
   - Verify: 100 dancers visible in dancer list
   - Verify: Studio code matches expected value

---

## Success Criteria

**Task 1 Complete When:**
- ✅ All 14 size categories have time limits populated
- ✅ Verification query returns expected values
- ✅ No SQL errors

**Task 2 Complete When:**
- ✅ SA account can access studio with 100 test dancers
- ✅ Testing Tools button works correctly
- ✅ Entry creation form shows 100 dancers
- ✅ No duplicate or orphaned studios

---

## Additional Context

### Tenant IDs
- **EMPWR:** `00000000-0000-0000-0000-000000000001`
- **Glow:** `4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5`

### Test Studio Details (Expected)
- **Name:** "Test Studio - Daniel" (or similar)
- **Owner:** djamusic@gmail.com
- **Dancers:** 100 with varied classifications (Novice, Part-Time, Competitive, Elite, Production)
- **Ages:** 6-18 years old
- **Used for:** SA Testing Tools, entry form testing

### Related Files
- `update_time_limits.sql` - SQL script for Task 1
- `MANUAL_TASKS_NEEDED.md` - Detailed investigation notes
- `NEXT_SESSION_BUGS.md` - Original bug report

---

## Deployment Status

**Commit:** ba89da3
**Pushed:** Yes (main branch)
**Build:** ✅ Passing (78/78 pages)
**Deployed:** Waiting for Vercel auto-deploy (~3-5 minutes after push)

All code fixes are deployed. These two database tasks are the final steps before testing can begin.

---

**Created:** 2025-01-05
**For:** Agent with Supabase MCP access
**Estimated Time:** 15-20 minutes total
