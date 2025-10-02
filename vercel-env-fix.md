# Vercel Environment Variable Fix

## Problem
Vercel currently has URL-encoded password in DATABASE_URL which fails with Prisma.

## Current (Broken)
```
DATABASE_URL="postgresql://postgres.cafugvuaatsgihrsmvvl:%21EH4TtrJ2-V%215b_@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

## Required (Working)
```
DATABASE_URL="postgresql://postgres.cafugvuaatsgihrsmvvl:!EH4TtrJ2-V!5b_@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

## Manual Fix via Vercel Dashboard
1. Go to: https://vercel.com/danman60s-projects/comp-portal/settings/environment-variables
2. Edit `DATABASE_URL` environment variable
3. Replace value with: `postgresql://postgres.cafugvuaatsgihrsmvvl:!EH4TtrJ2-V!5b_@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
4. Apply to: Production, Preview, Development
5. Redeploy

## CLI Fix (Alternative)
```bash
vercel env rm DATABASE_URL production
vercel env add DATABASE_URL production
# Paste: postgresql://postgres.cafugvuaatsgihrsmvvl:!EH4TtrJ2-V!5b_@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Key Differences
- Password: `!EH4TtrJ2-V!5b_` (unencoded) NOT `%21EH4TtrJ2-V%215b_` (URL-encoded)
- Username: `postgres.cafugvuaatsgihrsmvvl` (with project ref for pooler)
- Connection: `pgbouncer=true` (required for serverless)
- Remove: `connection_limit=1` parameter (not needed)
