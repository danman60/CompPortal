# CompPortal Pre-Production Audit - OPUS Task

**Production Launch:** Tuesday, October 27, 2025 (3 days)
**Environment:** https://www.compsync.net
**Database:** Supabase PostgreSQL with RLS
**Stack:** Next.js 15.5.6 App Router, tRPC, Prisma, TypeScript

---

## Mission Critical Context

After Tuesday's demo, this system goes into **production with real users and real money**. Zero tolerance for:
- Cross-tenant data leaks
- Missing RLS policies
- Hardcoded values
- Schema mismatches between frontend/backend
- Unprotected admin routes
- Sample/placeholder data in calculations

**Current State:**
- Capacity system just rewritten (Session 9 - see PROJECT_STATUS.md)
- Schema 80% matches Phase 1 spec (see PHASE1_SPEC.md lines 1-1040)
- Multi-tenant infrastructure 90% complete but has hardcoded EMPWR fallbacks (see MULTI_TENANT_MIGRATION_AUDIT.md)
- Demo prep partially complete (see DEMO_PREP_PLAN.md)

---

## Your Tools (MCP Access)

**Supabase MCP:**
- `supabase:execute_sql` - Query database directly
- `supabase:list_tables` - List all tables with schema
- `supabase:get_advisors` - Security & performance checks
- `supabase:apply_migration` - Apply schema changes (ONLY if critical)

**File Tools:**
- `Read` - Read source code files
- `Grep` - Search for patterns in code
- `Glob` - Find files by pattern

**DO NOT use:**
- Vercel MCP (deployment status irrelevant for audit)
- Playwright (testing happens after audit)

---

## Audit Phases (Execute Sequentially)

### Phase 1: Database Schema Audit (BLOCKER Priority)

**Objective:** Ensure database schema matches Phase 1 spec exactly

**Method:**
1. Read `PHASE1_SPEC.md` lines 1-1040 (complete schema definition)
2. Use `supabase:list_tables` to get actual schema
3. Use `supabase:execute_sql` to check:
   - Data types (Int vs Decimal, String vs Text)
   - Nullable vs required fields
   - Default values
   - Foreign key constraints
   - Indexes for performance
   - Unique constraints

**Check Each Domain Table:**
- competitions (lines 50-120 in spec)
- reservations (lines 200-280 in spec)
- competition_entries (lines 300-400 in spec)
- studios (lines 120-180 in spec)
- dancers (lines 450-520 in spec)
- invoices (lines 650-720 in spec)
- invoice_items (lines 720-780 in spec)
- user_profiles (lines 30-50 in spec)

**Output: `SCHEMA_AUDIT.md`**

```markdown
# Database Schema Audit

## Executive Summary
- Total mismatches: [number]
- BLOCKER issues: [number]
- Schema compliance: [percentage]%

## Critical Mismatches (BLOCKER - Production Risk)

### [Table Name]
**Field:** [field_name]
**Spec:** [expected type/constraint]
**Actual:** [actual type/constraint]
**Risk:** [explain production impact]
**Fix:** [SQL migration snippet or Prisma change]

## Non-Critical Mismatches (Medium Priority)

## Missing Indexes (Performance Risk)

## Recommendations
1. [Prioritized list of fixes]
```

---

### Phase 2: Multi-Tenant Security Audit (BLOCKER Priority)

**Objective:** Verify zero cross-tenant data leaks before production

**Context:**
- Read `MULTI_TENANT_MIGRATION_AUDIT.md` (previous migration attempt, rolled back)
- Multi-tenant architecture uses `tenant_id` on all domain tables
- Current fallback: Hardcoded EMPWR tenant UUID (MUST BE REMOVED)
- Subdomain-based tenant detection (e.g., empwr.compsync.net, client2.compsync.net)

**Method:**
1. Use `Grep` to find all hardcoded tenant UUIDs:
   ```
   Pattern: tenant_id.*=.*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   Pattern: tenantId.*=.*"[0-9a-f]{8}-
   Pattern: EMPWR
   ```

2. Check RLS policies exist on all tables:
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;
   ```

3. Verify middleware tenant detection:
   - Read `middleware.ts`
   - Check subdomain extraction logic
   - Verify tenant lookup from database
   - Check error handling for unknown subdomains

4. Check all tRPC routers inject tenant_id:
   - Search `src/server/routers/*.ts`
   - Verify `ctx.tenantId` used in all queries
   - Check for raw Prisma queries without tenant filter

5. Frontend route protection:
   - Check `middleware.ts` protects `/dashboard/*`
   - Verify super_admin-only routes (e.g., `/dashboard/admin/*`)
   - Verify competition_director routes reject studio_director

**Output: `MULTI_TENANT_SECURITY_AUDIT.md`**

```markdown
# Multi-Tenant Security Audit

## Executive Summary
- Hardcoded tenant references: [number]
- Missing RLS policies: [number]
- Unprotected routes: [number]
- Security score: [percentage]%

## BLOCKER: Hardcoded Tenant References

### [File Path:Line]
**Code:** `tenantId = "uuid-here"`
**Risk:** All queries return EMPWR data only, other tenants invisible
**Fix:** Use `ctx.tenantId` from middleware

## BLOCKER: Missing RLS Policies

### [Table Name]
**Current:** No RLS policy
**Risk:** Cross-tenant data leak via direct database access
**Fix:**
```sql
ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON [table]
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

## BLOCKER: Unprotected Routes

### [Route Path]
**Risk:** [explain who shouldn't access]
**Fix:** [middleware or page-level protection]

## Middleware Audit

### Subdomain Extraction
**Status:** [Working / Broken]
**Code Location:** [file:lines]
**Issues:** [list any problems]

### Tenant Lookup
**Status:** [Working / Broken]
**Fallback Behavior:** [what happens for unknown subdomain?]

## tRPC Router Audit

### Routers WITHOUT tenant_id filter:
1. [router.procedure] - [file:lines]
2. ...

### Routers with CORRECT tenant_id filter:
✅ [list for reference]

## Recommendations (Prioritized)
1. [Fix in this order]
```

---

### Phase 3: Frontend-Backend Synchronization Audit (HIGH Priority)

**Objective:** Ensure frontend TypeScript types match backend exactly

**Method:**
1. Check Prisma client generation:
   - Read `node_modules/.prisma/client/index.d.ts` (check if exists)
   - Verify types exported match schema

2. Check tRPC type safety:
   - Read `src/lib/trpc.ts`
   - Verify `AppRouter` type exported
   - Check all frontend uses typed hooks

3. Find frontend type mismatches:
   - Search for `as any` or `@ts-ignore` in frontend code
   - Check for manual type assertions (potential mismatch)
   - Look for optional chaining on required fields (?.  when field is NOT nullable)

4. Validate form schemas match database:
   - Search `src/components/**/*.tsx` for zod schemas
   - Compare against Prisma schema
   - Check field names, types, validation rules

5. Check data transformation inconsistencies:
   - Search for `.map()`, `.reduce()`, `.filter()` in components
   - Verify calculations match backend logic
   - Look for client-side data aggregation (should be server-side)

**Output: `FRONTEND_BACKEND_SYNC_AUDIT.md`**

```markdown
# Frontend-Backend Synchronization Audit

## Executive Summary
- Type mismatches: [number]
- Unsafe type assertions: [number]
- Client-side calculations: [number]
- Type safety score: [percentage]%

## Type Mismatches

### [Component/File:Line]
**Frontend Type:** [TypeScript type]
**Backend Type:** [Prisma model field]
**Risk:** [runtime error scenario]
**Fix:** [code change]

## Unsafe Type Assertions

### [File:Line]
**Code:** `data as SomeType` or `// @ts-ignore`
**Why Unsafe:** [explain actual type]
**Fix:** [proper type handling]

## Client-Side Calculations (Should Be Server-Side)

### [Component:Lines]
**Calculation:** [describe what's being calculated]
**Risk:** [inconsistency with backend, performance, security]
**Fix:** [move to tRPC router]

## Form Validation Mismatches

### [Form Component]
**Field:** [field_name]
**Frontend Validation:** [zod schema]
**Backend Validation:** [Prisma schema + tRPC input]
**Mismatch:** [describe difference]
**Risk:** [validation bypass scenario]
**Fix:** [align schemas]

## Data Fetching Audit

### Missing Refetches After Mutations:
1. [Component] - [mutation] doesn't refetch [query]
   - **Impact:** Stale UI data
   - **Fix:** Add refetch() to onSuccess

### Excessive Refetches:
1. [Component] - refetches on every render
   - **Impact:** Performance degradation
   - **Fix:** [proper dependency array]

## Recommendations
1. [Prioritized fixes]
```

---

### Phase 4: Hardcoded Values Audit (BLOCKER Priority)

**Objective:** Ensure ZERO hardcoded/sample data in production

**Context:**
- Pricing MUST come from competition settings
- Age divisions MUST come from tenant settings
- Categories MUST come from tenant settings
- Skill levels MUST come from tenant settings
- Awards MUST come from competition settings

**Method:**
1. Search for hardcoded prices:
   ```
   Pattern: \$\d+|\d+\.\d{2}
   Pattern: price.*=.*\d+
   Pattern: fee.*=.*\d+
   Pattern: total.*=.*\d+.*\*
   ```

2. Search for hardcoded categories/divisions:
   ```
   Pattern: 'Solo'|'Duet'|'Group'
   Pattern: categories.*=.*\[
   Pattern: ageDivisions.*=.*\[
   ```

3. Check invoice calculation logic:
   - Read `src/server/routers/invoice.ts`
   - Verify all pricing comes from database
   - Check for sample totals or placeholder calculations

4. Check entry validation:
   - Read `src/server/routers/entry.ts`
   - Verify age/category/skill validation uses tenant settings
   - Check for hardcoded validation rules

**Output: `HARDCODED_VALUES_AUDIT.md`**

```markdown
# Hardcoded Values Audit

## Executive Summary
- Hardcoded prices: [number]
- Hardcoded categories: [number]
- Sample data references: [number]
- Production readiness: [PASS/FAIL]

## BLOCKER: Hardcoded Prices

### [File:Lines]
**Code:** `const total = entries.length * 50`
**Risk:** Incorrect charges in production
**Fix:** `const total = entries.reduce((sum, e) => sum + Number(e.total_fee || 0), 0)`

## BLOCKER: Hardcoded Categories/Divisions

### [File:Lines]
**Code:** `categories = ['Solo', 'Duet', 'Group']`
**Risk:** Wrong categories for different competitions
**Fix:** `categories = await prisma.competition_categories.findMany({ where: { competition_id } })`

## Sample/Placeholder Data

### [File:Lines]
**Code:** [show sample data code]
**Risk:** [production impact]
**Fix:** [get from database]

## Invoice Calculation Audit

### [Router/Procedure]
**Pricing Source:** [hardcoded / database / mixed]
**Issues:** [list any hardcoded values]
**Fix:** [ensure all from DB]

## Entry Validation Audit

### [Validation Rule:File:Lines]
**Current:** [hardcoded rule]
**Should Be:** [from tenant/competition settings]
**Fix:** [query settings first]

## Recommendations
1. [Critical fixes for production]
```

---

### Phase 5: Email & Notification Audit (MEDIUM Priority)

**Objective:** Verify all email triggers work and log correctly

**Context:**
- Read `RESEND_SETUP_CHECKLIST.md` (9 email triggers defined)
- Email provider: Resend
- Must log to `email_logs` table
- Must log to `activity_logs` table

**Method:**
1. Check each trigger has implementation:
   - reservation.approve → email to SD
   - reservation.reject → email to SD
   - invoice.send → email to SD
   - entry.summary_submit → email to CD
   - payment.received → email to SD
   - reminder.deadline → email to SD
   - studio.approved → email to SD
   - competition.created → email to CDs
   - user.welcome → email to new user

2. Verify logging:
   ```sql
   SELECT trigger_type, COUNT(*) FROM email_logs GROUP BY trigger_type;
   ```

3. Check error handling:
   - Search for try/catch around email sends
   - Verify email errors don't block mutations
   - Check retry logic exists

**Output: `EMAIL_NOTIFICATION_AUDIT.md`**

```markdown
# Email & Notification Audit

## Executive Summary
- Implemented triggers: [X/9]
- Missing triggers: [number]
- Logging coverage: [percentage]%
- Error handling: [ROBUST/WEAK]

## Missing Email Triggers

1. **[Trigger Name]** (defined in RESEND_SETUP_CHECKLIST.md)
   - **Expected:** [when it should send]
   - **Status:** No implementation found
   - **Impact:** [user experience issue]
   - **Fix:** [file to modify]

## Logging Audit

### Email Logs
**Status:** [Working / Not Working]
**Missing Fields:** [list any]

### Activity Logs
**Status:** [Working / Not Working]
**Missing Actions:** [list any]

## Error Handling Audit

### [Trigger:File:Lines]
**Error Handling:** [try/catch / none]
**Blocks Mutation:** [YES/NO]
**Retry Logic:** [YES/NO]
**Risk:** [explain production impact]
**Fix:** [wrap in try/catch, log error, continue]

## Recommendations
1. [Prioritized fixes]
```

---

### Phase 6: Validation & Business Logic Audit (HIGH Priority)

**Objective:** Ensure business rules match Phase 1 spec exactly

**Context:**
- Read `docs/specs/PHASE1_SPEC.md` lines 1-1040
- Read `docs/specs/MASTER_BUSINESS_LOGIC.md` (business rules as implemented)
- Read `src/lib/validators/businessRules.ts` (validation implementations)
- Read `CAPACITY_REWRITE_PLAN.md` (capacity system architecture)
- Focus on critical flows:
  - Reservation approval (lines 442-499 in spec)
  - Entry creation (lines 520-580 in spec)
  - Summary submission with refund (lines 589-651 in spec)
  - Invoice generation (lines 680-750 in spec)

**Method:**
1. Capacity management:
   - Read `src/server/services/capacity.ts`
   - Verify matches spec lines 50-68 (capacity formula)
   - Check idempotency protection exists
   - Verify audit trail (capacity_ledger)

2. Reservation lifecycle:
   - Read `src/server/routers/reservation.ts`
   - Verify approval flow matches spec lines 442-499
   - Check reject flow
   - Verify auto-close logic

3. Entry validation:
   - Read `src/server/routers/entry.ts`
   - Verify summary refund logic matches spec lines 589-651
   - Check entry creation validation

4. Invoice generation:
   - Read `src/server/routers/invoice.ts`
   - Verify only confirmed entries included
   - Check invoice locking on SENT status
   - Verify PAID status is permanent lock

**Output: `BUSINESS_LOGIC_AUDIT.md`**

```markdown
# Business Logic & Validation Audit

## Executive Summary
- Spec compliance: [percentage]%
- Critical deviations: [number]
- Validation gaps: [number]

## Capacity Management Audit

### CapacityService Implementation
**Spec Reference:** PHASE1_SPEC.md lines 50-68
**Status:** [COMPLIANT / DEVIATES]
**Deviations:** [list any]
**Idempotency:** [YES/NO]
**Audit Trail:** [YES/NO]

## Reservation Lifecycle Audit

### Approval Flow
**Spec Reference:** PHASE1_SPEC.md lines 442-499
**Implementation:** [file:lines]
**Deviations:** [list any differences from spec]
**Missing Validation:** [list any]

### Auto-Close Logic
**Spec Reference:** PHASE1_SPEC.md lines 600-620
**Status:** [IMPLEMENTED / MISSING / PARTIAL]
**Issues:** [describe]

## Entry Validation Audit

### Summary Refund Logic
**Spec Reference:** PHASE1_SPEC.md lines 589-651
**Implementation:** [file:lines]
**Formula Correct:** [YES/NO]
**Issues:** [describe any deviations]

### Age/Category/Skill Validation
**Uses Tenant Settings:** [YES/NO]
**Hardcoded Rules:** [list any]

## Invoice Generation Audit

### Entry Filtering
**Spec:** Only confirmed entries
**Actual:** [describe implementation]
**Issues:** [any incorrect filtering]

### Locking Logic
**SENT Status:** [locks / doesn't lock]
**PAID Status:** [locks / doesn't lock]
**Issues:** [any ways to bypass lock]

## Recommendations
1. [Critical fixes for spec compliance]
```

---

## Final Deliverables

Create these 6 markdown files in `CompPortal/audit_reports/`:

1. `SCHEMA_AUDIT.md` - Database schema vs Phase 1 spec
2. `MULTI_TENANT_SECURITY_AUDIT.md` - Cross-tenant isolation, RLS, hardcoded IDs
3. `FRONTEND_BACKEND_SYNC_AUDIT.md` - Type safety, form validation, calculations
4. `HARDCODED_VALUES_AUDIT.md` - Pricing, categories, sample data
5. `EMAIL_NOTIFICATION_AUDIT.md` - Email triggers, logging, error handling
6. `BUSINESS_LOGIC_AUDIT.md` - Reservation lifecycle, capacity, invoices

**Plus:**
7. `EXECUTIVE_SUMMARY.md` - Consolidated view with prioritized action items

---

## Execution Protocol

1. **Work Sequentially** - Complete each phase before moving to next
2. **Be Exhaustive** - Check EVERY file in scope, not samples
3. **Provide Evidence** - Include file:line references for all issues
4. **Prioritize Risk** - Mark BLOCKER vs HIGH vs MEDIUM
5. **Include Fixes** - Provide exact SQL or code changes
6. **Cross-Reference** - Link related issues across audits
7. **Count Everything** - Provide metrics for executive summary

---

## Success Criteria

- All 7 markdown files created
- Every BLOCKER issue has SQL/code fix provided
- No hardcoded values remaining
- Multi-tenant security verified
- Schema 100% matches spec (or deviations justified)
- Frontend types match backend exactly
- Business logic matches Phase 1 spec

---

## Time Budget

**Total:** 3-4 hours for complete audit

- Phase 1: 45 minutes
- Phase 2: 60 minutes (most critical)
- Phase 3: 45 minutes
- Phase 4: 30 minutes
- Phase 5: 20 minutes
- Phase 6: 40 minutes
- Executive Summary: 20 minutes

**Report to user if:**
- Any phase takes >2x estimated time (something deeply wrong)
- Find >20 BLOCKER issues (may need emergency session before production)
- Discover security vulnerability (report immediately, don't wait for full audit)

---

## Notes

- Database credentials: Use MCP tools (already authenticated)
- Don't make schema changes unless explicitly instructed
- If you find a critical security issue, STOP and report immediately
- This audit is DEFENSIVE - find every possible problem before real users arrive
- User has Tuesday demo, then production Wednesday - no room for error

**Questions? Ask before starting audit.**
