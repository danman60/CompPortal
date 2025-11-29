# Schedule Builder Test/Debug Cycle (MANDATORY)

**Status:** REQUIRED for ALL schedule builder changes
**Must Pass:** 100% completion start to finish before marking work complete
**Verification:** UI testing + Supabase MCP database verification

---

## Test Cycle Checklist

### 1. Reset Environment ✅
- [ ] Click "Reset All" button in UI
- [ ] Confirm all schedules cleared
- [ ] Verify clean slate

### 2. Schedule Routines on Each Day ✅
- [ ] Schedule 2-3 routines on Thursday
- [ ] Schedule 2-3 routines on Friday
- [ ] Schedule 2-3 routines on Saturday
- [ ] Schedule 2-3 routines on Sunday
- [ ] Verify routine pool count decreases correctly
- [ ] Verify each day tab shows routine count

### 3. Change Day Start Time ✅
- [ ] Click pencil icon on one day tab
- [ ] Change start time (e.g., 08:00 → 09:00)
- [ ] Click save (checkmark)
- [ ] Verify all routine times on that day updated
- [ ] Verify toast shows success message

### 4. Add Break Block ✅
- [ ] Click "+Break" button
- [ ] Place break block in schedule
- [ ] Verify times cascade correctly after break
- [ ] Verify sequential entry numbers updated

### 5. Add Award Block ✅
- [ ] Click "+Award" button
- [ ] Place award block in schedule
- [ ] Verify times cascade correctly after award
- [ ] Verify sequential entry numbers updated

### 6. Create Conflicts (Manual) ✅
- [ ] Query DB to find dancer in test tenant with multiple routines
- [ ] Schedule those routines within 6 positions of each other
- [ ] Verify conflict icon appears (⚠️)
- [ ] Hover over conflict icon
- [ ] Verify readable hover state: "⚠️ 🔧 Fix ✕"

### 7. Test Auto Fix One Conflict ✅
- [ ] Hover over conflict icon
- [ ] Click "🔧 Fix" button
- [ ] Verify routine moved to conflict-free position
- [ ] Verify conflict icon disappears
- [ ] Verify toast shows success message

### 8. Test Auto Fix All Conflicts ✅
- [ ] Create multiple conflicts across days
- [ ] Click "Fix All Conflicts" button
- [ ] Verify all conflicts resolved
- [ ] Verify toast shows accurate count
- [ ] Verify no conflict icons remain

### 9. Verify All Toasts Have Accurate Info ✅
- [ ] Success toast on save: Shows day count
- [ ] Success toast on conflict fix: Shows routine moved
- [ ] Success toast on time change: Confirms update
- [ ] Error toast on failure: Shows meaningful error

### 10. Verify All Days Saved in UI ✅
- [ ] Switch between day tabs
- [ ] Verify each day retains its scheduled routines
- [ ] Verify routine pool doesn't show scheduled routines
- [ ] Verify day tab badges show correct counts

### 11. Unable to Schedule Same Routine Twice ✅
- [ ] Schedule routine on Thursday
- [ ] Switch to Friday
- [ ] Verify that routine is NOT in the pool
- [ ] Confirm cannot schedule same routine on Friday
- [ ] THIS IS THE CRITICAL FIX

### 12. Save the Schedule ✅
- [ ] Click "Save Schedule" button
- [ ] Verify success toast shows correct day count
- [ ] Wait for save to complete

### 13. Verify UI Values Match DB Values ✅
- [ ] Use Supabase MCP to query `scheduled_routines` table
- [ ] Verify entry numbers match UI
- [ ] Verify performance times match UI
- [ ] Verify dates match UI
- [ ] Verify routine IDs match UI
- [ ] Check for duplicates in DB (should be NONE)

---

## Database Verification Queries

### Query 1: Check All Scheduled Routines
```sql
SELECT
  date,
  entry_number,
  performance_time,
  routine_id,
  r.title as routine_title
FROM scheduled_routines sr
JOIN routines r ON r.id = sr.routine_id
WHERE competition_id = '1b786221-8f8e-413f-b532-06fa20a2ff63'
ORDER BY date, entry_number;
```

### Query 2: Check for Duplicate Routines
```sql
SELECT
  routine_id,
  COUNT(*) as count,
  STRING_AGG(date::text, ', ') as scheduled_dates
FROM scheduled_routines
WHERE competition_id = '1b786221-8f8e-413f-b532-06fa20a2ff63'
GROUP BY routine_id
HAVING COUNT(*) > 1;
```

### Query 3: Find Dancer for Conflict Testing
```sql
SELECT
  d.first_name,
  d.last_name,
  r.id as routine_id,
  r.title,
  r.entry_number
FROM dancers d
JOIN entry_dancers ed ON ed.dancer_id = d.id
JOIN entries e ON e.id = ed.entry_id
JOIN routines r ON r.entry_id = e.id
WHERE d.tenant_id = '00000000-0000-0000-0000-000000000003'
GROUP BY d.id, d.first_name, d.last_name, r.id, r.title, r.entry_number
HAVING COUNT(r.id) >= 2
LIMIT 1;
```

---

## Pass Criteria

**ALL items must be checked ✅ before marking work complete.**

**If ANY item fails:**
1. Create `BLOCKER_SCHEDULE_TEST.md` with failure details
2. Fix the issue
3. Re-run ENTIRE test cycle from step 1
4. Do NOT mark work complete until 100% pass

---

## Evidence Required

- Screenshots of each major step (Reset, Schedule, Conflicts, Fix)
- Supabase query results showing DB state matches UI
- Final screenshot showing all days with scheduled routines
- DB query result showing NO duplicate routines

---

**Test Cycle Status:** MANDATORY for all schedule builder work
**Frequency:** Every commit that touches schedule builder code
**Duration:** ~15-20 minutes full cycle
**Automation:** None - manual testing required for UI verification
