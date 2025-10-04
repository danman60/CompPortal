# ⚡ Quick Reference - CompPortal

**Last Updated**: October 3, 2025
**Purpose**: Fast lookup for common commands, credentials, and operations

---

## 🔑 Test Credentials

```
Studio Director (limited access):
  Email: demo.studio@gmail.com
  Password: StudioDemo123!
  Studio: Demo Dance Studio
  Access: Own studio data only

Competition Director (admin access):
  Email: demo.director@gmail.com
  Password: DirectorDemo123!
  Access: All studios, competitions, system-wide data

Super Admin (full access):
  Email: demo.admin@gmail.com
  Password: AdminDemo123!
  Access: Everything + exclusive Settings card
```

---

## 🔗 Important URLs

```
Production:  https://comp-portal-one.vercel.app
GitHub:      https://github.com/danman60/CompPortal.git
Supabase:    https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl
Vercel:      https://vercel.com/danman60s-projects/comp-portal
```

---

## 💻 Common Commands

### Development
```bash
# Navigate to project
cd /d/ClaudeCode/CompPortal

# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Run production build locally
npm start
```

### Database (Prisma)
```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma client (after schema changes)
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Push schema changes (dev only)
npx prisma db push

# View current migrations
npx prisma migrate status
```

### Git Operations
```bash
# Check status
git status

# View recent commits
git log --oneline -10

# Stage all changes
git add .

# Commit with message
git commit -m "feat: Your descriptive message"

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main

# View current branch
git branch

# View file changes
git diff
```

### Deployment (Vercel)
```bash
# Vercel auto-deploys on git push to main
# No manual deployment needed

# Check deployment status (via Vercel MCP)
# Use Vercel MCP tools in Claude Code

# View build logs
# Visit Vercel dashboard or use Vercel MCP
```

---

## 🗄️ Database Connection

### Supabase Credentials
```
Project ID: cafugvuaatsgihrsmvvl
Region: AWS US-West-1
URL: https://cafugvuaatsgihrsmvvl.supabase.co

Pooler (Port 6543):
postgresql://postgres.cafugvuaatsgihrsmvvl:!EH4TtrJ2-V!5b_@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

Direct (Port 5432):
postgresql://postgres:!EH4TtrJ2-V!5b_@db.cafugvuaatsgihrsmvvl.supabase.co:5432/postgres?sslmode=require
```

### Environment Variables (.env.local)
```env
DATABASE_URL="postgresql://postgres.cafugvuaatsgihrsmvvl:!EH4TtrJ2-V!5b_@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

NEXT_PUBLIC_SUPABASE_URL="https://cafugvuaatsgihrsmvvl.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhZnVndnVhYXRzZ2locnNtdnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTk5MzksImV4cCI6MjA3NDgzNTkzOX0.WqX70GzRkDRhcurYeEnqG8YFniTYFqpjv6u3mPlbdoc"

# Optional (for email system)
RESEND_API_KEY="re_your_key_here"
EMAIL_FROM="noreply@glowdance.com"
```

---

## 🧪 Testing Commands

### Playwright Testing
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/rbac/studio-director.spec.ts

# Run tests in UI mode
npx playwright test --ui

# Run tests with browser visible
npx playwright test --headed

# Generate test code
npx playwright codegen https://comp-portal-one.vercel.app
```

### Manual Testing Workflow
```bash
1. npm run build                    # Build project
2. git add . && git commit -m "..."  # Commit changes
3. git push origin main             # Push to trigger Vercel deploy
4. Wait for deployment (30-60 sec)
5. Test in production URL
6. Use Playwright MCP for automated testing
```

---

## 📁 Key File Locations

### Backend (tRPC Routers)
```
src/server/routers/
├── _app.ts           # Main router (registers all routers)
├── test.ts
├── studio.ts         # Studio CRUD
├── dancer.ts         # Dancer CRUD + age calculations
├── competition.ts    # Competition management
├── reservation.ts    # Reservation workflow + token allocation
├── entry.ts          # Entry creation + music upload
├── lookup.ts         # Dropdown options (categories, age groups)
├── invoice.ts        # Invoice generation
├── email.ts          # Email notifications
└── scheduling.ts     # Scheduling + conflict detection
```

### Frontend (Pages)
```
src/app/
├── dashboard/
│   ├── page.tsx              # Main dashboard (role-based routing)
│   ├── dancers/
│   │   ├── page.tsx          # Dancers list
│   │   ├── new/page.tsx      # Create dancer
│   │   └── [id]/page.tsx     # ❌ MISSING - Dancer edit
│   ├── entries/
│   │   ├── page.tsx          # Entries list
│   │   ├── create/page.tsx   # Create entry (multi-step)
│   │   ├── [id]/page.tsx     # Entry view
│   │   ├── [id]/edit/page.tsx # Entry edit
│   │   └── [id]/music/page.tsx # Music upload
│   ├── reservations/
│   │   ├── page.tsx          # Reservations list
│   │   └── new/page.tsx      # ❌ MISSING - Create reservation
│   ├── invoices/
│   ├── emails/
│   ├── scheduling/
│   ├── judges/
│   ├── scoring/
│   └── scoreboard/
├── login/page.tsx
└── signup/page.tsx
```

### Components (Major)
```
src/components/
├── DashboardStats.tsx           # Stats cards (role-aware)
├── StudioDirectorDashboard.tsx  # SD dashboard
├── CompetitionDirectorDashboard.tsx # CD/SA dashboard
├── DancersList.tsx              # Dancer table + filters
├── DancerForm.tsx               # Create dancer form
├── EntriesList.tsx              # Entry cards + filters
├── EntryForm.tsx                # Multi-step entry wizard (create + edit)
├── EntryDetails.tsx             # Entry view page
├── ReservationsList.tsx         # Reservation cards + approve/reject
├── InvoicesList.tsx             # Invoice browser
├── EmailManager.tsx             # Email preview UI
├── MusicUploader.tsx            # Music upload component
├── SchedulingManager.tsx        # Scheduling UI
└── LiveScoreboard.tsx           # ❌ TODO - Real-time scoreboard
```

---

## 🐛 Common Debugging

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear Prisma client
rm -rf node_modules/.prisma
npx prisma generate
```

### Database Issues
```bash
# Check Prisma schema is valid
npx prisma validate

# View database in GUI
npx prisma studio

# Reset database (DESTRUCTIVE - dev only)
npx prisma migrate reset
```

### TypeScript Errors
```bash
# Check for type errors
npx tsc --noEmit

# Build with type checking
npm run build
```

### Runtime Errors
```bash
# Check browser console (F12)
# Check Vercel logs (deployment page)
# Check Supabase logs (Supabase dashboard)
```

---

## 🔧 Common Gotchas

### Prisma Decimal Types
```typescript
// ❌ WRONG - Will throw TypeError
entry.entry_fee.toFixed(2)

// ✅ CORRECT - Wrap in Number()
Number(entry.entry_fee || 0).toFixed(2)
```

### tRPC Context
```typescript
// ✅ Available in all protectedProcedure
ctx.userId    // UUID of authenticated user
ctx.userRole  // 'studio_director' | 'competition_director' | 'super_admin'
ctx.studioId  // UUID of user's studio (null for admins)
```

### Music File Naming
```typescript
// Industry standard format
[EntryNumber]_[RoutineTitle]_[StudioCode].mp3
// Example: 156_ShineBright_SDA.mp3

// System uses unique paths
entries/{entryId}/{timestamp}-{filename}
```

### Age Calculations
```typescript
// Always "age as of January 1" of competition year
// Groups: Average all ages, drop decimal
// Guardrail: Cannot compete >1 division below oldest dancer
```

---

## 📊 Quick Stats

**Database Tables**: 38+
**tRPC Routers**: 12
**React Components**: 25+
**Routes**: 24
**Lines of Code**: ~17,500+

**RBAC Coverage**: 73% (22/30 tests passed)
**Bugs**: 0 active (2 fixed)
**Missing Features**: 3 (Dancer Edit, Reservation Create, API Testing)

---

## 🚀 Quick Deploy Workflow

```bash
1. Make changes in src/
2. npm run build                    # Verify builds locally
3. git add .
4. git commit -m "feat: Description"
5. git push origin main
6. Wait 30-60 seconds
7. Test at https://comp-portal-one.vercel.app
8. Use Playwright MCP for automated testing
```

---

## 📞 When Things Break

**Build Fails**:
1. Check error message in terminal
2. Clear `.next` folder and rebuild
3. Verify all imports are correct
4. Check TypeScript errors with `npx tsc --noEmit`

**Database Errors**:
1. Check DATABASE_URL in .env.local
2. Verify Prisma schema is valid
3. Regenerate Prisma client (`npx prisma generate`)
4. Check Supabase dashboard for connection issues

**Production Errors**:
1. Check Vercel deployment logs
2. Check browser console (F12)
3. Verify environment variables in Vercel dashboard
4. Check Supabase logs for database errors

**Authentication Issues**:
1. Check Supabase Auth settings
2. Verify NEXT_PUBLIC_SUPABASE_* env vars
3. Clear browser cookies and try again
4. Check user exists in database (Prisma Studio)

---

**Need more details?** → See relevant documentation:
- Tasks: `NEXT_SESSION.md`
- Features: `BUGS_AND_FEATURES.md`
- Workflow: `COMPETITION_WORKFLOW.md`
- History: `CompPortal.txt`
