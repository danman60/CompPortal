# CompPortal Quick Start (Oct 2, 2025)

**READ THIS FILE FIRST - Don't read long session logs**

## Current Status: 95% Complete - Database Connection Issue

### What's Working
- ✅ Next.js 15.5.4 backend with tRPC v11
- ✅ Prisma v6 ORM with pg adapter
- ✅ 4 routers: test, studio, dancer, reservation, entry
- ✅ Local development works perfectly
- ✅ Railway deployment successful
- ✅ Supabase PostgreSQL database with 41 models

### Current Blocker
❌ Railway production API returns: `ENETUNREACH 2600:1f16:...IPv6...5432`
- Railway trying IPv6, Supabase direct connection might be IPv4 only
- **Next Fix**: Add `?sslmode=require` to DATABASE_URL in Railway

### Railway Info
- **URL**: https://compportal-production.up.railway.app
- **Repo**: github.com/danman60/CompPortal (main branch)
- **Current DATABASE_URL**: `postgresql://postgres:!EH4TtrJ2-V!5b_@db.cafugvuaatsgihrsmvvl.supabase.co:5432/postgres`
- **Fix Needed**: Add `?sslmode=require` to end

### What We Tried (All Failed)
1. Vercel serverless - Can't reach DB or pooler auth fails
2. Pooler (6543) - "Tenant or user not found" on all platforms
3. Direct (5432) - Works locally, IPv6 issue on Railway

### Connection Details
- **Direct (working locally)**: `db.cafugvuaatsgihrsmvvl.supabase.co:5432`
- **Username**: `postgres`
- **Password**: `!EH4TtrJ2-V!5b_`
- **Database**: `postgres`

### Test Endpoints
```bash
# Test server status (works)
curl https://compportal-production.up.railway.app/api/trpc/test.getServerStatus

# Test database (currently failing)
curl https://compportal-production.up.railway.app/api/trpc/studio.getStats
```

### Project Structure
```
D:\ClaudeCode\CompPortal\
├── src/
│   ├── lib/prisma.ts          # Prisma client with pg adapter
│   ├── server/routers/        # tRPC routers
│   └── providers/             # tRPC provider
├── prisma/schema.prisma       # 41 models, driverAdapters enabled
└── .env                       # Local env (direct connection works)
```

### Next Steps
1. Railway Dashboard → Variables → Edit DATABASE_URL
2. Add `?sslmode=require` to end of URL
3. Redeploy
4. Test `/api/trpc/studio.getStats`
5. If still fails: Try `?connect_timeout=10` or explore IPv4-only options

### Key Files
- `COMPPORTAL.txt` - Project tracker (needs update)
- `SESSION_LOG_2025-10-02.md` - Detailed session log
- `QUICKSTART.md` - This file

### Git Status
- Latest commit: `234ee7a` - Prisma v6 upgrade
- Branch: main
- All changes pushed

### Important Note
Supabase pooler authentication is completely broken. Don't waste time trying pooler URLs. Direct connection is the only option.
