# CompPortal - Project-Specific Configuration

Project-specific rules, patterns, and constants for CompPortal.

---

## Project Constants (Hardcoded - Don't Query MCP)

**URLs:**
- Production: `http://compsync.net`
- Vercel: `https://comp-portal-one.vercel.app`

**⚠️ CRITICAL: Production Login Methods**
- **Competition Director (CD)**: 1-click login button on homepage - NO password required
  - Click 🎯 "Competition Director" button on `http://compsync.net`
  - Instant login via `demoLoginAction()` in `src/app/actions/auth.ts`
- **Studio Director (SD)**: Manual login required
  - Use real credentials (e.g., danieljohnabrahamson@gmail.com)
  - No demo button available for SD role currently
- **Super Admin (SA)**: 1-click login button on homepage (if available)
  - Click 👑 "Super Admin" button on homepage

**For Testing:**
- CD testing: Use 1-click button (fastest, no credentials needed)
- SD testing: Requires user to provide valid login credentials

**Stack:**
- Next.js 14
- tRPC
- Prisma
- Tailwind CSS
- Supabase (PostgreSQL)

**Common Paths:**
- Components: `src/components/`
- Routers: `src/server/routers/`
- Server: `src/server/`
- Lib: `src/lib/`

**Database:**
- Supabase (project_ref in `.env`)
- Schema: `prisma/schema.prisma`

---

## Prisma Schema Patterns (CRITICAL)

**ALWAYS use exact field names from schema:**

```typescript
// ✅ CORRECT - Exact schema names
competition.competition_start_date
competition.competition_end_date
competition.competition_location
competition.competition_name
competition.dance_categories
competition.space_limit

entry.routine_title
entry.dance_category
entry.entry_participants
entry.music_file_url

// ❌ WRONG - Guessing field names
competition.start_date
competition.categories
entry.participants
```

**If uncertain**: Read `prisma/schema.prisma` with grep:
```bash
grep -A 15 "^model Competition" prisma/schema.prisma
grep -A 10 "^model Entry" prisma/schema.prisma
```

---

## UI Design System (Glassmorphic)

### Required Patterns

**Glassmorphic Cards:**
```typescript
<div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
  {/* Content */}
</div>
```

**Gradient Backgrounds:**
```typescript
<div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
  {/* Content */}
</div>
```

**Emoji Icons (NO external libraries):**
```typescript
<span className="text-4xl">🎭</span>
<span className="text-2xl">🏆</span>
<span className="text-xl">📅</span>
```

**Color Coding:**
- Purple/Indigo: Primary brand colors
- White/10-20: Glassmorphic overlays
- Green: Success states
- Red: Error states
- Yellow: Warning states

---

## tRPC Router Patterns

### Router Structure

```typescript
// Standard router pattern
export const routerName = t.router({
  list: publicProcedure
    .query(async ({ ctx }) => {
      // Query logic
    }),

  create: publicProcedure
    .input(zodSchema)
    .mutation(async ({ ctx, input }) => {
      // Create logic
    }),

  update: publicProcedure
    .input(zodSchema)
    .mutation(async ({ ctx, input }) => {
      // Update logic
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Delete logic
    })
})
```

### Router Registration (MANDATORY)

**After creating new tRPC router, MUST update `src/server/routers/_app.ts`:**

```typescript
import { newRouter } from './newRouter'

export const appRouter = router({
  // ... existing routers
  newRouter: newRouter,  // ← ADD THIS
})
```

**Forgetting this = build will pass but routes won't be available**

---

## Form Patterns

### React Hook Form + Zod

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  routine_title: z.string().min(1, 'Required'),
  dance_category: z.string().min(1, 'Required'),
  entry_participants: z.number().min(1).max(20)
})

const form = useForm({
  resolver: zodResolver(schema)
})
```

### Toast Notifications

```typescript
import { toast } from 'react-hot-toast'

// Success
toast.success('Entry created successfully', { position: 'top-right' })

// Error
toast.error('Failed to create entry', { position: 'top-right' })

// Loading
const toastId = toast.loading('Creating entry...')
// Later:
toast.dismiss(toastId)
```

---

## Error Handling Standards

### Safe Navigation

```javascript
// Always check for undefined/null
value?.toLocaleString?.() || 'N/A'

// Array operations
entries?.length > 0 ? entries.map(...) : <EmptyState />
```

### API Error Handling

```typescript
try {
  const data = await api.fetch()
  return data
} catch (error) {
  console.error('API Error:', error)
  toast.error('Failed to load data')
  return fallbackData  // Don't break UI
}
```

### Form Submission Errors

```typescript
const onSubmit = async (data) => {
  try {
    await mutation.mutateAsync(data)
    toast.success('Success!')
    form.reset()
  } catch (error) {
    console.error('Submission error:', error)
    toast.error(error.message || 'Failed to submit')
  }
}
```

---

## Testing Protocols

### Production Testing (Playwright MCP)

**ALWAYS test on production URL:**
```typescript
const PROD_URL = 'http://compsync.net'

// Navigate
await playwright.navigate(`${PROD_URL}/dashboard/entries`)

// Interact
await playwright.click('button:has-text("Create Entry")')
await playwright.fill('input[name="routine_title"]', 'Test Routine')
await playwright.click('button[type="submit"]')

// Verify
await playwright.waitFor('text=Entry created successfully')
await playwright.screenshot('entry-created-verified.png')
```

**NEVER test local servers in current phase**

### Deployment Verification (Vercel MCP)

**AFTER every push:**
```typescript
const deploy = await vercel:get_deployments({ limit: 1 })

if (deploy.state === "ERROR") {
  const logs = await vercel:get_build_logs({ deploymentId: deploy.id })
  // Fix immediately before continuing
}
```

### Database Verification (Supabase MCP)

**After schema changes:**
```typescript
await supabase:get_advisors({ type: "security" })
await supabase:get_advisors({ type: "performance" })
await supabase:generate_typescript_types()
```

---

## Build & Deployment

### Build Command
```bash
npm run build
```

**Must pass before committing**

### Common Build Errors

1. **Prisma field names** - Check against schema.prisma
2. **Import paths** - Verify relative paths are correct
3. **Circular dependencies** - Check import chains
4. **Missing router registration** - Add to _app.ts

### Rollback Strategy

If deployment fails:
```bash
git revert HEAD
git push origin main
```

Wait for Vercel to deploy reverted version.

---

## Codex Configuration

**Codex config location:** `D:\ClaudeCode\CompPortal\codex.config.json`

**Communication directories:**
- Tasks: `codex-tasks/`
- Outputs: `codex-tasks/outputs/`
- Questions: `codex-tasks/questions/`
- Blockers: `codex-tasks/blockers/`

**Quality gates for Codex outputs:**
1. Prisma field names exact match
2. TypeScript compiles
3. Glassmorphic pattern followed
4. Form validation present
5. Error handling complete
6. Router registered (if new router)

---

## Development Workflow

1. Read `PROJECT_STATUS.md` or `CURRENT_WORK.md`
2. Grep for relevant code sections
3. Make changes
4. Run `npm run build`
5. Test with Playwright on production
6. Commit (8-line format)
7. Push
8. Verify with `vercel:get_deployments`
9. Update `PROJECT_STATUS.md`

---

## Platform-Specific Notes

**For Android APK development:** See `DEVELOPMENT_PROTOCOLS.md` (kept separate during non-Android phases)

---

*This file contains CompPortal-specific rules. Generic protocols in CLAUDE.md.*
