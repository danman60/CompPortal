# Database Migration Required

## Issue Fixed
Invoice discounts and credits were not persisting to the database. The "Other Credits" feature only updated React state (visible to CD in their browser), but Studio Directors never saw these credits because the data wasn't saved to the database.

## Changes Made
1. **Backend**: Added `applyCustomCredit` mutation to save fixed dollar credits
2. **Frontend**: Replaced local state with database-backed display
3. **Schema**: Added `other_credit_amount` and `other_credit_reason` fields

## Migration SQL (MUST BE APPLIED BEFORE DEPLOYMENT)

**Location:** `prisma/migrations/20250112_add_other_credit_fields/migration.sql`

**SQL to execute:**
```sql
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS other_credit_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_credit_reason TEXT;

COMMENT ON COLUMN invoices.other_credit_amount IS 'Fixed dollar credit amount (separate from percentage discounts in credit_amount)';
COMMENT ON COLUMN invoices.other_credit_reason IS 'Reason for other credit (e.g., loyalty credit, refund, etc.)';
```

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select the CompPortal project
3. Navigate to SQL Editor
4. Paste the SQL above
5. Click "Run"

### Option 2: Command Line (If Available)
```bash
psql $DATABASE_URL -c "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS other_credit_amount DECIMAL(10,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS other_credit_reason TEXT;"
```

## Verification

After applying the migration and deploying:

1. **As Competition Director** on glow.compsync.net:
   - Navigate to "Not Another Dance Studio" invoice
   - Click "💳 Other Credits" button
   - Enter $800 credit with reason "Loyalty credit"
   - Click "Save Credit"

2. **As Studio Director** (djamusic@gmail.com):
   - Navigate to the same invoice
   - Verify you see "Other Credits: Loyalty credit" with "-$800.00" in the totals section

3. **Verify Both Credits Show**:
   - Apply 10% discount (CD view)
   - Apply $800 other credit (CD view)
   - Confirm SD sees BOTH credits on their invoice

## Impact

- **Before**: CDs could apply credits but SDs never saw them (non-functional UI)
- **After**: Credits persist to database and are visible to all users
- **Benefit**: Invoices can have BOTH percentage discounts (10%) AND fixed credits ($800) simultaneously

## Rollback Plan

If issues occur, remove the columns:
```sql
ALTER TABLE invoices
DROP COLUMN IF EXISTS other_credit_amount,
DROP COLUMN IF EXISTS other_credit_reason;
```

Then revert to commit before d9cbfec.
