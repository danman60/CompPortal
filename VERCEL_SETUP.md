# Vercel Environment Variables Setup

## CRITICAL: DATABASE_URL Username Format

The DATABASE_URL **MUST** use the format `postgres.PROJECT_REF` for the username.

### ❌ INCORRECT (will fail with "Tenant or user not found"):
```
DATABASE_URL="postgresql://postgres:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=no-verify&pgbouncer=true&connection_limit=1"
```

### ✅ CORRECT:
```
DATABASE_URL="postgresql://postgres.cafugvuaatsgihrsmvvl:!EH4TtrJ2-V!5b_@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

**Key Changes**:
1. Username: `postgres` → `postgres.cafugvuaatsgihrsmvvl`
2. Removed `sslmode=no-verify` (not needed with pooler)
3. Kept `pgbouncer=true&connection_limit=1` (required for Prisma on serverless)

---

## Required Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

### Database (Prisma)
```bash
DATABASE_URL="postgresql://postgres.cafugvuaatsgihrsmvvl:!EH4TtrJ2-V!5b_@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:!EH4TtrJ2-V!5b_@db.cafugvuaatsgihrsmvvl.supabase.co:5432/postgres"
```

### Supabase Auth
```bash
NEXT_PUBLIC_SUPABASE_URL="https://cafugvuaatsgihrsmvvl.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhZnVndnVhYXRzZ2locnNtdnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTk5MzksImV4cCI6MjA3NDgzNTkzOX0.WqX70GzRkDRhcurYeEnqG8YFniTYFqpjv6u3mPlbdoc"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_4awE8z8fbv-bk2KSYjSp_Q_T_zpXh25"
```

### Application
```bash
NEXT_PUBLIC_APP_URL="https://comp-portal-one.vercel.app"
```

---

## How to Update Variables in Vercel

1. Go to https://vercel.com/danman60s-projects/comp-portal/settings/environment-variables
2. Find the `DATABASE_URL` variable
3. Click "Edit"
4. **CRITICAL**: Paste the value exactly as shown above - do NOT URL-encode special characters
   - Password must be `!EH4TtrJ2-V!5b_` (with ! characters, NOT %21)
   - If you see %21 in the password, it's wrong - delete and re-paste
5. Full value should be:
   ```
   postgresql://postgres.cafugvuaatsgihrsmvvl:!EH4TtrJ2-V!5b_@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```
6. Click "Save"
7. **Verify**: Check that Vercel didn't auto-encode the password (it should still show ! not %21)
8. Redeploy from Deployments tab

---

## Testing Checklist

After updating environment variables and redeploying:

1. **Test API Endpoints**:
   - https://comp-portal-one.vercel.app/api/trpc/studio.getStats
   - https://comp-portal-one.vercel.app/api/trpc/dancer.getStats
   - https://comp-portal-one.vercel.app/api/trpc/competition.getStats

2. **Test Authentication**:
   - https://comp-portal-one.vercel.app/login
   - https://comp-portal-one.vercel.app/signup

3. **Expected Results**:
   - API endpoints return JSON data (not 500 error)
   - Login/signup pages load without errors
   - Browser console has no authentication errors

---

## Troubleshooting

### "Tenant or user not found" Error

**Cause 1**: USERNAME format is incorrect in DATABASE_URL
**Solution**: Ensure username is `postgres.cafugvuaatsgihrsmvvl` (not just `postgres`)

**Cause 2**: PASSWORD is URL-encoded in Vercel dashboard
**Solution**:
- Check if password shows `%21` instead of `!` in Vercel dashboard
- Delete the DATABASE_URL variable entirely
- Re-create it with plain text password: `!EH4TtrJ2-V!5b_`
- Verify Vercel didn't auto-encode it after saving
- **IMPORTANT**: Some browsers or Vercel's UI may auto-encode on paste - always verify after saving

### "self-signed certificate" Error
**Cause**: `sslmode=no-verify` parameter present

**Solution**: Remove `sslmode` parameter entirely from DATABASE_URL (pooler handles SSL automatically)

### Authentication not working
**Cause**: Missing or incorrect Supabase keys

**Solution**: Verify all `NEXT_PUBLIC_SUPABASE_*` variables are set correctly

---

## Reference

- Supabase Docs: https://supabase.com/docs/guides/database/prisma
- CompPortal Progress Log: PROGRESS_LOG.md
- Blocker Documentation: BLOCKERS.md

*Last Updated: October 3, 2025 04:30 UTC*
