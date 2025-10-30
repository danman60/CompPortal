# Capacity Display Bug Investigation

**Bug:** Pipeline page shows "0 / 600 spaces used" instead of actual values (62/600, 515/600, 219/600)

## Timeline of Investigation

### Discovery 1: Initial Analysis
- **User reported:** Capacity numbers don't match bars on https://empwr.compsync.net/dashboard/reservation-pipeline
- **Logs showed:** `reservation.getPipelineView` throwing 500 errors with message "Studio directors cannot access the reservation pipeline"
- **Initial theory:** User logged in with wrong account

### Discovery 2: Wrong User Account
- **Found:** Logs show `userId: 'd72df930-c114-4de1-9f9d-06aa7d28b2ce'` with `userRole: 'studio_director'`
- **This user is:** `djamusic@gmail.com` (Studio Director)
- **Expected user:** `empwrdance@gmail.com` (Competition Director)

### Discovery 3: NOT a Login Issue - Context Bug
- **User clarified:** "I was incognito mode logged in with empwr account though"
- **Real issue:** Studio Director account shouldn't even be able to ACCESS `/dashboard/reservation-pipeline` page
- **Missing:** Route protection for CD-only pages

### Discovery 4: CD Account Works but Shows Wrong Data
- **Tested with Playwright:** Logged in as `empwrdance@gmail.com` (CD)
- **Result:** Page loads successfully, 11 reservations visible in table
- **BUT:** Event metrics at top still show "0 / 600 spaces used" for all 3 competitions
- **Console log:** `[Pipeline] Competitions data: {hasData: true, count: 3, loading: false, competitions: Array(3)...`

### Discovery 5: Database Has Correct Values
- **Query result:**
  - St. Catharines #2: 600 total, 381 available = **219 used** ✅
  - St. Catharines #1: 600 total, 85 available = **515 used** ✅
  - London: 600 total, 538 available = **62 used** ✅

### Discovery 6: Prisma Schema Has Fields
- **Checked:** `prisma/schema.prisma` lines 652-653
- **Fields exist:**
  ```prisma
  total_reservation_tokens     Int?  @default(600)
  available_reservation_tokens Int?  @default(600)
  ```

### Discovery 7: competition.getAll Query Structure
- **File:** `src/server/routers/competition.ts` lines 88-123
- **Uses:** `include` to fetch relations (reservations, counts)
- **Does NOT use:** explicit `select` for competition fields
- **Should return:** All competition fields automatically when using `include`

## Current Hypothesis

The `competition.getAll` tRPC endpoint is returning competition objects, but the `total_reservation_tokens` and `available_reservation_tokens` fields are either:
1. NULL in the returned data
2. Undefined in the returned data
3. Not being serialized by tRPC/Superjson

## Discovery 8: CRITICAL - There's a Capacity Service!

**Major oversight:** The capacity system has its own dedicated service/router architecture!

**Need to investigate:**
1. Is there a `capacity` router in `src/server/routers/`?
2. Does the pipeline page use a capacity-specific endpoint instead of `competition.getAll`?
3. Is the capacity calculation happening in a service layer?

**Re-examining the workflow:**
- Pipeline page uses `competition.getAll` for competition data
- BUT capacity might be managed by `CapacityService` (mentioned in reservation.ts:27)
- EventMetricsGrid calculation might be using stale/incorrect data source

## Next Steps

1. ✅ **DEPLOYED:** Debug logging (commit 608f3fd)
2. **INVESTIGATE BEFORE TESTING:**
   - Check if there's a `capacity.ts` router
   - Check CapacityService implementation
   - Verify what endpoint EventMetricsGrid should be using
   - Check if `competition.getAll` is the wrong endpoint for capacity display

## Discovery 9: Console Log Truncation Issue
- **Tested:** Playwright console captures show `Array(3)` but truncated
- **Backend verified:** Vercel logs confirm backend sends `available_reservation_tokens: 381`
- **Frontend unknown:** Console.log truncates array details, can't see actual field values
- **Next:** Need JSON.stringify() in frontend log to see full data structure

## Discovery 10: FOUND THE BUG! ✅
- **JSON.stringify revealed:** Frontend DOES receive correct data!
  - St. Catharines #2: `total: 600, available: 381` (219 used) ✅
  - St. Catharines #1: `total: 600, available: 85` (515 used) ✅
  - London: `total: 600, available: 538` (62 used) ✅
- **EventMetrics logs confirmed:** Calculation code correctly accesses fields
  - `total_reservation_tokens: 600, available_reservation_tokens: 381` ✅
- **Real bug:** `useCountUp` hook doesn't animate on mount!
  - Initializes `prevEnd.current = end` (line 12)
  - Check `prevEnd.current !== end` is FALSE on first render
  - Animation never triggers, stays at initial value of 0

## Fix Applied (commit e1177c0)
- Changed `prevEnd.current` initialization from `end` to `undefined` when `startOnMount=true`
- Now animation triggers on first render
- Numbers should count up from 0 to correct values

## Files Modified
- ✅ **DEPLOYED (commit 608f3fd):**
  - `D:\ClaudeCode\CompPortal\src\server\routers\competition.ts` - Added server-side debug log
  - `D:\ClaudeCode\CompPortal\src\components\rebuild\pipeline\PipelinePageContainer.tsx` - Added frontend debug log with Object.keys()

- ✅ **DEPLOYED (commit be103a7):**
  - `D:\ClaudeCode\CompPortal\src\components\rebuild\pipeline\PipelinePageContainer.tsx` - Changed to JSON.stringify for full data visibility
  - `D:\ClaudeCode\CompPortal\CAPACITY_BUG_INVESTIGATION.md` - Updated with Discovery 9

## Discovery 11: Animation Works But Shows Wrong Numbers
- **Tested build e1177c0:** Numbers ARE showing but incorrect
  - St. Catharines #2: Shows "3 / 600" (should be 219/600)
  - St. Catharines #1: Shows "8 / 600" (should be 515/600)
  - London: Shows "1 / 600" (should be 62/600)
- **Console logs confirm:** EventMetrics calculation correct (total: 600, available: 381)
- **Math verified:** 600 - 381 = 219 used ✅ (but displays as 3)
- **Hypothesis:** Either props passing wrong values OR useCountUp animation logic has bug

## Discovery 12: FOUND ROOT CAUSE - useEffect Dependency Bug ✅
- **Comprehensive logging revealed:**
  - MetricCard receives correct values (used: 219, remaining: 381)
  - useCountUp starts animation correctly (from: 0, to: 219)
  - Animation runs 1 frame: current: 3.504, increment: 3.504
  - Component re-renders with usedCount: 3
  - **useEffect triggers AGAIN because `count` is in dependency array**
  - Animation restarts from 3 instead of continuing to 219
- **Root cause:** Line 59 of useCountUp.ts had `count` in dependency array
- **Fix:** Remove `count` from dependencies - it should only restart when `end` changes, not when internal `count` updates
- **Result:** Animation will now run to completion without restarting

## Fix Applied (commit pending)
- Removed `count` from useEffect dependency array (useCountUp.ts:59)
- Animation will no longer be interrupted by its own state updates
