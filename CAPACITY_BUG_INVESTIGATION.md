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

## Next Steps (DO NOT BUILD YET)

1. **Check what fields are actually returned** - Added debug logging to both:
   - Backend: `src/server/routers/competition.ts:125-130` (logs what Prisma returns)
   - Frontend: `src/components/rebuild/pipeline/PipelinePageContainer.tsx:55-65` (logs what React receives)

2. **After build and deploy:** Check production logs to see actual field values

3. **If fields are NULL/undefined:** Investigate why Prisma query isn't returning them

4. **If fields exist but calculation is wrong:** Check EventMetricsGrid component logic

## Files Modified (Not Yet Built)
- `D:\ClaudeCode\CompPortal\src\server\routers\competition.ts` - Added server-side debug log
- `D:\ClaudeCode\CompPortal\src\components\rebuild\pipeline\PipelinePageContainer.tsx` - Added frontend debug log with Object.keys()
