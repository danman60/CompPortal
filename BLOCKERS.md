# CompPortal - Blockers Log

## Active Blockers

### 1. Prisma + Supabase Pooler Authentication Failure (CRITICAL)
**Date**: October 3, 2025
**Status**: BLOCKED
**Impact**: All database queries via Prisma fail on Vercel

**Error**: `FATAL: Tenant or user not found`

**Root Cause**:
- Prisma Client (native, without pg adapter) cannot authenticate with Supabase transaction-mode pooler (port 6543)
- Vercel serverless + Prisma + Supabase pooler is a known incompatibility
- The pg adapter also failed with same error
- SSL configuration confirmed working (no longer "self-signed certificate" error)

**Attempted Solutions**:
1. ✅ Fixed SSL certificate validation (`sslmode=no-verify`)
2. ❌ Used pg adapter with custom Pool config (auth failed)
3. ❌ Removed pg adapter, used native Prisma Client (auth failed)
4. ❌ Tried POSTGRES_PRISMA_URL from Vercel integration (variable not set)
5. ❌ Configured PgBouncer-specific settings (statement_cache_size: 0, binary: false)

**Working Solution**:
Switch to **Supabase JS Client** for database operations instead of Prisma:
- Supabase JS Client works perfectly with the pooler
- Already have credentials in environment variables
- Can reuse existing schema knowledge

**Alternative Solutions** (if Supabase JS doesn't work):
1. Use Drizzle ORM (recommended by Vercel docs for Supabase)
2. Use Kysely query builder
3. Deploy to DigitalOcean with Docker (traditional server, not serverless)

**What's Needed to Unblock**:
- Implement Supabase JS Client wrapper for tRPC routers
- Replace Prisma queries with Supabase client queries
- Keep Prisma schema for type generation and migrations

**References**:
- Vercel Docs: https://vercel.com/docs/storage/vercel-postgres/using-an-orm#prisma
- Supabase Docs: https://supabase.com/docs/guides/database/connecting-to-postgres/serverless-drivers
- GitHub Discussion: https://github.com/orgs/supabase/discussions/28239

---

## Resolved Blockers

### 1. SSL Certificate Validation Error (RESOLVED)
**Date**: October 3, 2025
**Resolution**: Changed `sslmode=require` to `sslmode=no-verify` in DATABASE_URL
**Time to Resolve**: 30 minutes

---

*Last Updated: October 3, 2025 03:33 UTC*
