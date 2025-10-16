# Database Wipe Script

This script wipes all data while preserving:
- Database schema
- 3 demo accounts (Studio Director, Competition Director, Super Admin)
- Sample data for testing (1 competition, 1 reservation, 5 dancers)

## ⚠️ WARNING

This will **DELETE ALL DATA** except demo accounts. Use with extreme caution!

## Prerequisites

1. Supabase CLI installed: `npm install -g supabase`
2. Supabase project ID: `dnrlcrgchqruyuqedtwi`
3. Database connection string or Supabase auth

## Method 1: Using Supabase CLI (Recommended)

```bash
# From project root
npx supabase db execute --file scripts/wipe-database-keep-demos.sql --project-ref dnrlcrgchqruyuqedtwi --db-url "postgresql://postgres:[PASSWORD]@db.dnrlcrgchqruyuqedtwi.supabase.co:5432/postgres"
```

Replace `[PASSWORD]` with your Supabase database password.

## Method 2: Using psql Directly

```bash
psql "postgresql://postgres:[PASSWORD]@db.dnrlcrgchqruyuqedtwi.supabase.co:5432/postgres" -f scripts/wipe-database-keep-demos.sql
```

## Method 3: Copy & Paste in Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/dnrlcrgchqruyuqedtwi/sql
2. Open `scripts/wipe-database-keep-demos.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run"

## Method 4: Using Supabase MCP Tools (if connected)

```javascript
// If Supabase MCP server is connected
const fs = require('fs');
const sql = fs.readFileSync('./scripts/wipe-database-keep-demos.sql', 'utf8');

await mcp.supabase.execute_sql({
  query: sql,
  project_id: 'dnrlcrgchqruyuqedtwi'
});
```

## What Gets Preserved

### Demo Accounts
- **Studio Director**: `demo.studio@gmail.com` / `StudioDemo123!`
- **Competition Director**: `demo.director@gmail.com` / `DirectorDemo123!`
- **Super Admin**: `demo.admin@gmail.com` / `AdminDemo123!`

### Sample Data Created
- **Competition**: "EMPWR Dance Challenge 2025" (30 days from now)
- **Reservation**: 10 routines allocated to demo studio (approved)
- **Dancers**: 5 sample dancers (Emily, Sophia, Olivia, Ava, Isabella)
- **Studio**: Demo studio owned by Studio Director

## What Gets Deleted

- All competition entries
- All routines
- All dancers (except 5 sample dancers)
- All invoices
- All reservations (except 1 sample)
- All competitions (except 1 sample)
- All studios (except demo studio)
- All user profiles (except 3 demos)
- All activity logs
- All scores

## After Running

1. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
2. **Log in**: Use one of the demo accounts
3. **Verify**: Check dashboard shows sample competition and reservation
4. **Test workflow**: Create routines, generate invoice, test payment flow

## Troubleshooting

### "auth.users does not exist"
The script looks for demo accounts in Supabase Auth. Make sure:
1. Demo accounts exist in Supabase Dashboard > Authentication > Users
2. Emails match exactly: `demo.studio@gmail.com`, `demo.director@gmail.com`, `demo.admin@gmail.com`

### "Permission denied"
Make sure you're using a user with `postgres` role or database owner permissions.

### "Table does not exist"
Schema should be intact. If tables are missing, run migrations first:
```bash
npx supabase db reset --project-ref dnrlcrgchqruyuqedtwi
```

## Modifying the Script

To add more sample data, edit `wipe-database-keep-demos.sql`:

- **Add more dancers**: Insert into `dancers` table (Step 7)
- **Add more competitions**: Insert into `competitions` table (Step 5)
- **Add sample routines**: Insert into `competition_entries` table (new step)
- **Add sample invoices**: Insert into `invoices` table (new step)

## Safety Tips

1. **Backup first**: Export data before wiping
2. **Test in staging**: Don't run on production without testing
3. **Verify demo accounts exist**: Check Supabase dashboard first
4. **Read script carefully**: Understand what will be deleted

## Questions?

See PROJECT_STATUS.md for current project state and test credentials.
