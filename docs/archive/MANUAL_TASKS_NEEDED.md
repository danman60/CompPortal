# Manual Tasks Required

**Date:** 2025-11-05
**Session:** Bug fixes completed, manual intervention needed

---

## 1. Run SQL Script to Populate Time Limits

**File:** `update_time_limits.sql` (in root directory)

**Action:** Execute the SQL script on production database using Supabase dashboard or MCP tool

**What it does:**
- Sets max_time_minutes and max_time_seconds for all size categories
- Solo/Duet/Trio: 3 min
- Small Group: 4 min
- Large Group: 5 min
- Line: 5 min
- Super Line: 6 min
- Production: 7 min
- Updates both EMPWR and Glow tenants

**Verification query:**
```sql
SELECT name, max_time_minutes, max_time_seconds, tenant_id
FROM entry_size_categories
ORDER BY tenant_id, min_participants;
```

Expected result: All rows should have non-null time values

---

## 2. Fix Testing Environment - SA Studio Issue

**Problem:** User (danieljohnabrahamson@gmail.com) accidentally completed onboarding and created a new studio. This caused:
- Studio code changed
- All test dancers disappeared
- Testing path broken

**Desired state:** SA account should be linked to test studio (djamusic@gmail.com's studio) with 100 test dancers

**Investigation needed:**
1. Find the new studio created by danieljohnabrahamson@gmail.com
2. Find the original test studio owned by djamusic@gmail.com
3. Either:
   - Option A: Delete the new SA studio, re-link SA to djamusic studio
   - Option B: Keep new studio, copy test dancers over, update testing tools

**SQL queries to investigate:**
```sql
-- Find studios for SA user
SELECT s.id, s.name, s.studio_code, s.owner_id, u.email
FROM studios s
JOIN user_profiles u ON s.owner_id = u.id
WHERE u.email = 'danieljohnabrahamson@gmail.com';

-- Find djamusic studio
SELECT s.id, s.name, s.studio_code, s.owner_id, COUNT(d.id) as dancer_count
FROM studios s
JOIN user_profiles u ON s.owner_id = u.id
LEFT JOIN dancers d ON s.id = d.studio_id
WHERE u.email = 'djamusic@gmail.com'
GROUP BY s.id, s.name, s.studio_code, s.owner_id;

-- Count dancers per studio
SELECT studio_id, COUNT(*) as count
FROM dancers
WHERE studio_id IN (
  SELECT s.id FROM studios s
  JOIN user_profiles u ON s.owner_id = u.id
  WHERE u.email IN ('danieljohnabrahamson@gmail.com', 'djamusic@gmail.com')
)
GROUP BY studio_id;
```

**Recommended fix:**
1. Soft delete the new SA studio (set status = 'cancelled' or similar)
2. Update SA user_profile to point to djamusic's studio (if user_profiles has studio_id FK)
3. OR: Update Testing Tools to use correct studio ID

---

## 3. Testing Required (For Another Agent)

All code changes have been deployed (commit ba89da3). Testing needed:

### Test Checklist:

**1. Classification Validation Fix:**
- [ ] Select 1 dancer with classification
- [ ] Leave classification dropdown on "Use detected"
- [ ] Verify save button is ENABLED
- [ ] Save entry successfully

**2. Size Category Read-Only:**
- [ ] Select dancers
- [ ] Verify size category shows "Detected: Solo" (or other)
- [ ] Verify NO dropdown present
- [ ] Verify cannot override size category

**3. Exception Modal Dropdown:**
- [ ] Click "Exception Required" button
- [ ] Open classification dropdown in modal
- [ ] Verify dropdown options are READABLE (not white on white)

**4. Exception Modal Classification:**
- [ ] Select 3 dancers with mixed classifications
- [ ] Click "Exception Required"
- [ ] Verify modal shows CORRECT auto-calculated classification (not "Novice" if calculated was "Competitive")

**5. Exception Modal Race Condition:**
- [ ] Click "Exception Required" before saving entry
- [ ] Try to submit exception request
- [ ] Verify shows clear error: "Please save entry first"

**6. Extended Time Label:**
- [ ] Select dancers (solo or group)
- [ ] Scroll to Extended Time section
- [ ] Verify label shows: "⏱️ Request Extended Time (Solo, 3:00 max) ($5 flat)"
- [ ] Verify time matches size category

**7. Back Button:**
- [ ] Navigate to entry create form
- [ ] Verify "← Back" button present at top
- [ ] Click back button
- [ ] Verify navigates back to previous page

**8. Import Routines Rename:**
- [ ] Go to /dashboard/entries
- [ ] Verify button says "Import Routines" (not "Import CSV")

### Test URLs:
- **EMPWR:** https://empwr.compsync.net/dashboard/admin/testing → "TEST ROUTINES DASHBOARD"
- **Glow:** https://glow.compsync.net/dashboard/admin/testing → "TEST ROUTINES DASHBOARD"

### Test Credentials:
- **SA:** danieljohnabrahamson@gmail.com / 123456
- **CD (EMPWR):** empwrdance@gmail.com / 1CompSyncLogin!
- **SD:** djamusic@gmail.com / 123456

---

**Created:** 2025-11-05
**Status:** Awaiting manual intervention
