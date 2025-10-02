# Instructions for Next Claude Session

## IMPORTANT: Read This First

**DO NOT read long session logs first.** Read `QUICKSTART.md` instead.

```bash
# Your first action should be:
Read: D:\ClaudeCode\CompPortal\QUICKSTART.md
```

This file contains everything you need in 2 minutes vs 30+ minutes reading full session logs.

## Quick Context
- **Project**: CompPortal (GlowDance competition management)
- **Status**: 95% complete, one DB connection fix needed
- **Location**: `D:\ClaudeCode\CompPortal`
- **Railway URL**: https://compportal-production.up.railway.app

## Immediate Task
Railway production failing with IPv6 connection error. Fix by adding `?sslmode=require` to DATABASE_URL.

## After Reading QUICKSTART.md
1. Use Railway MCP tools to update DATABASE_URL
2. Test `/api/trpc/studio.getStats` endpoint
3. If successful, update trackers and celebrate 🎉

## Files to Update After Success
- `COMPPORTAL.txt` - Mark as 100% complete
- `SESSION_LOG_2025-10-02.md` - Add success entry
- `QUICKSTART.md` - Update status

## Don't Waste Time On
- Vercel serverless (already tried, doesn't work)
- Supabase pooler (authentication broken)
- Reading full session logs (use QUICKSTART.md)
