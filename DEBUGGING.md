# Bug Investigation Protocol

**When to load this:** Investigating persistent bugs, especially:
- Double-operations (mutation executes twice)
- Capacity/counter discrepancies (numbers don't match)
- State transitions failing unexpectedly
- Database values not matching logs

## CRITICAL: Back-Front-Back-Front Investigation Order

**October 30 Lesson:** We spent hours checking backend/database when the bug was in frontend animation. Don't go deep on one end - alternate between back and front, working toward the middle.

**NEW ORDER (5 min per check, alternating):**
1. **BACK (5 min):** Database - Quick query for actual values
2. **FRONT (5 min):** Display layer - Screenshot + console.log FINAL render
3. **BACK (5 min):** Backend API - Log what data is being SENT
4. **FRONT (5 min):** Frontend data reception - Log what data is RECEIVED (use JSON.stringify!)
5. **MIDDLE (10 min):** Calculation/transformation layer - Where does data change?

**OLD BAD ORDER (what we did wrong):**
1. Database query (5 min) ✅
2. Backend logs (5 min) ✅
3. tRPC serialization check (15 min) ❌ WASTED TIME
4. Calculation logic (15 min) ❌ WASTED TIME
5. Finally check display/animation (10 min) ✅ BUG WAS HERE!

**Result:** 40 minutes spent on backend before checking frontend. Bug was in frontend the whole time.

**BETTER ORDER (alternating):**
1. Database query (5 min) → Values correct ✅
2. Display screenshot (2 min) → Values wrong ❌ **BUG IS BETWEEN THESE TWO**
3. Backend API log (5 min) → Sending correct data ✅
4. Frontend reception log (5 min) → Receiving correct data ✅ **NOT A DATA ISSUE**
5. Calculation log (5 min) → Computing correct values ✅ **NOT A CALC ISSUE**
6. Display/animation log (10 min) → Animation restarting ❌ **FOUND IT!**

Total time: 32 minutes (saved 8 minutes by ruling out data flow early)

## 1. Quick Back-Front Check (2 Minutes)

**Vercel/Application Logs:**
- Count EXACTLY how many times each function/mutation is called
- Track request IDs - same ID = same request, different IDs = multiple requests
- Look for key log messages (e.g., "CapacityService.reserve CALLED", "Transaction COMMITTED")
- Compare logged values vs database state (e.g., log says 600→575 but DB shows 550)
- Check timestamps - operations milliseconds apart are likely same transaction

**Database State Verification:**
```sql
-- Check actual values vs what logs claim
SELECT * FROM [affected_table] WHERE id = '[affected_id]';
-- Check audit/ledger tables
SELECT * FROM [audit_table] WHERE [entity_id] = '[affected_id]';
-- Look for discrepancies between counts/sums
```

## 2. Check for Hidden Database Logic

```sql
-- After analyzing logs, check for triggers on ALL related tables
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgisinternal = false
ORDER BY table_name, trigger_name;
```

## 3. Check ALL Related Tables

- Don't just check the table being updated
- Check tables that reference it (e.g., for capacity bugs, check BOTH competitions AND reservations)
- Legacy triggers often hide on related tables

## 4. Look for Hidden Business Logic

- Database triggers doing calculations (not just timestamps)
- Stored procedures/functions that modify data
- Check constraints with side effects
- Any `AFTER INSERT/UPDATE/DELETE` triggers

## 5. Verify Single Source of Truth

- Service classes (like CapacityService) should be the ONLY place updating business data
- Database triggers should ONLY handle:
  - Timestamps (updated_at)
  - Audit logs (non-modifying)
  - NOT business logic like capacity/pricing/calculations

## 6. Check Vercel Logs Properly

When checking logs for double-operations:
- Look for the SAME request ID across multiple log lines
- Check if operations span multiple requests
- Verify timestamps - operations in same transaction should be milliseconds apart
- Search for "Transaction COMMITTED" to see actual DB changes

## Case Study: October 24 Double-Deduction Bug

**What happened:**
- Spent hours checking code, transactions, locks
- Root cause: Legacy `reservation_tokens_trigger` on reservations table
- The trigger was executing AFTER the service class update
- Result: Double deduction (service + trigger)

**Lesson:** ALWAYS check database triggers FIRST when investigating double-operations. Would have saved 3+ hours.

**Debugging order should be:**
1. Check database triggers (5 min)
2. Check application logs (10 min)
3. Check code logic (30 min+)

## Case Study: October 30 Capacity Display Bug (Frontend Animation)

**What happened:**
- Pipeline page showed "0 / 600 spaces used" instead of actual values (62, 219, 515)
- Initially suspected backend data issues, database problems, tRPC serialization
- Verified EVERY layer: database ✅ backend ✅ frontend data reception ✅ calculation ✅
- Root cause: `useCountUp` animation hook initialization bug

**The Bug:**
```typescript
// useCountUp.ts - Animation hook
const prevEnd = useRef(end);  // ❌ Started at target value (219)

// Check if value changed to trigger animation
if (prevEnd.current !== end) {  // 219 !== 219? FALSE!
  // Animation never runs, stays at initial 0
}
```

**Lesson:** When data is correct everywhere but display is wrong, check UI LAYER LAST:
- Animation hooks
- Formatting functions
- Display components
- CSS that might hide content

**Debugging technique that worked:**
1. Create investigation tracker file (`CAPACITY_BUG_INVESTIGATION.md`)
2. Log each discovery to avoid circular investigation
3. Follow data through EVERY layer with strategic logging:
   - Backend: Verify DB values sent
   - Frontend: Verify data received (use JSON.stringify to bypass console truncation!)
   - Calculation: Verify computed values
   - Display: Check the actual render logic

**Key insight:** Browser console.log truncates arrays/objects! Use `JSON.stringify(data, null, 2)` to see full structure.

**Debugging order for display bugs:**
1. Database query (5 min)
2. Backend logs (5 min)
3. Frontend data reception (10 min) - Use JSON.stringify!
4. Calculation logic (10 min)
5. Display/animation hooks (10 min) ← Bug was here!

**Comprehensive logging pattern for React display bugs:**
```typescript
// Add logging at EVERY layer to track data flow:

// 1. Backend endpoint
console.log('[API] Data being sent:', {
  field1: data.field1,
  field2: data.field2
});

// 2. Frontend query/calculation
console.log('[Calculation] Processing:', JSON.stringify({
  input: rawData,
  output: calculatedValue
}));

// 3. Component props
console.log('[Component] Props received:', {
  prop1: props.prop1,
  prop2: props.prop2
});

// 4. Hook lifecycle (if using custom hooks)
console.log('[Hook] Effect triggered:', {
  inputs: hookInputs,
  state: currentState
});
console.log('[Hook] Processing:', {
  step: 'animation_start',
  details: {...}
});

// 5. Final render values
console.log('[Render] Displaying:', {
  displayValue1,
  displayValue2
});
```

This pattern revealed the October 30 bug:
- Backend sent correct data ✅
- Frontend calculated correctly ✅
- Props passed correctly ✅
- **Hook animation started but restarted** ❌ ← Found it!
- Root cause: `count` in useEffect dependency array caused infinite restart loop
