# Session 10 Summary - Double-Deduction Bug Fixed!

**Date:** October 24, 2025 (11:00pm-11:30pm EST)
**Duration:** 30 minutes
**Status:** ✅ Critical bug completely resolved

## The Problem

Every reservation approval was deducting capacity TWICE:
- User approves 25-space reservation
- Capacity decreases by 50 spaces
- Only ONE ledger entry created
- Only ONE API call in logs

## Investigation Process

1. **Checked Vercel Logs**:
   - Confirmed only ONE mutation call
   - CapacityService logged correct values (600→575)
   - Transaction completed successfully

2. **Checked Database State**:
   - Database showed 550 (not 575 as logs claimed)
   - Ledger had only ONE entry of -25
   - Clear discrepancy between logs and reality

3. **Found Hidden Database Trigger**:
   - Trigger name: `reservation_tokens_trigger`
   - Located on `reservations` table (not `competitions` where we initially looked)
   - Fired AFTER reservation status changed to 'approved'
   - Was deducting capacity AGAIN after CapacityService

## Root Cause

Legacy database trigger from the OLD implementation was still active. When CapacityService was added, we ended up with BOTH systems deducting capacity:

1. CapacityService correctly deducted 25 (600→575)
2. Database trigger ALSO deducted 25 (575→550)

## The Fix

Applied migration to drop the problematic trigger:

```sql
DROP TRIGGER IF EXISTS reservation_tokens_trigger ON public.reservations;
DROP FUNCTION IF EXISTS update_competition_tokens();
```

## Result

✅ **BUG FIXED** - No more double-deduction!
- CapacityService is now the single source of truth
- All capacity changes go through the service with proper audit trail
- Database triggers only handle timestamps, not business logic

## Lessons Learned

1. **Always compare logs vs database state** - The discrepancy revealed the hidden issue
2. **Check ALL tables for triggers** - Not just the obvious ones
3. **Legacy code can hide in database** - Triggers, functions, and procedures can duplicate logic
4. **Single source of truth** - Business logic should live in application code, not database

## Documentation Updates

- Added "Bug Investigation Protocol" to CLAUDE.md
- Emphasized checking logs thoroughly first
- Added database trigger check as step 2
- Documented this case as an example

## Files Changed

- `BUG_DOUBLEDEDUCTION_FINDINGS.md` - Updated with solution
- `CLAUDE.md` - Added investigation protocol
- Database migration applied via Supabase MCP

## Status

The double-deduction bug is completely fixed. No code changes were needed - only database cleanup. The system is now working as designed with CapacityService as the single source of truth for all capacity management.