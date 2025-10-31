# Session Startup Playbook - CompPortal Launch (Nov 1-8)

**Last Updated:** October 30, 2025
**Status:** 2-3 days from production launch
**Next Milestone:** November 1 (accounts + dancers only, routines disabled until Nov 8)

---

## 🚨 Critical Context (Read This First)

### What Is This Project?
**CompPortal** - Multi-tenant dance competition management system
- **Real Clients:** EMPWR Dance Experience + Glow Dance Competition
- **Real Stakes:** Real data, real money, thousands of entries
- **Zero Tolerance:** Data loss, cross-tenant leaks, payment failures

### Current Phase
**PRE-LAUNCH MODE (Feature Freeze Active)**
- ✅ Bug fixes for reported issues ONLY
- ✅ P0 launch blockers (data migration, testing, monitoring)
- ❌ NO new features until MVP confirmed working

### Two Production Tenants

**EMPWR Dance Experience:**
- Tenant ID: `00000000-0000-0000-0000-000000000001`
- Subdomain: `empwr.compsync.net`
- CD: Emily (`empwrdance@gmail.com`)
- Status: Established, has production data

**Glow Dance Competition:**
- Tenant ID: `4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5`
- Subdomain: `glow.compsync.net`
- CD: Selena (`glowdance@gmail.com`)
- Status: New competition, clean slate

---

## 📋 Quick Start (First 5 Minutes)

### 1. Load Critical Files (In Order)
```bash
# Session start protocol
1. CLAUDE.md (pre-launch section FIRST)
2. LAUNCH_PLAYBOOK/PHASE5_SESSION_STARTUP_PLAYBOOK.md (this file)
3. git log -3 --oneline (recent commits)
4. LAUNCH_PLAYBOOK/PHASE3_DEVTEAM_TASK_DIVISION.md (current task breakdown)
```

### 2. Check Current Status
```bash
# Where are we in the timeline?
git log -1 --oneline  # What was last completed?
npm run build         # Does build pass?
```

### 3. Identify Active Work
- Check todo list status (from system reminder)
- Read Phase 3 task division to see what's pending
- Check for any BLOCKER.md files

---

## 📅 Timeline Overview

### October 30 (Tonight) - Data Preparation
- ✅ Emily sends spreadsheet template to Selena
- ⏳ Selena fills GLOW reservation data (studios, deposits, credits, discounts)
- ⏳ Selena fills question marks for early studio contacts
- ⏳ Emily merges Selena's data with email spreadsheet

### October 31 (Day 2) - Foundation
**DB_AGENT (6 hours):**
- Database migrations for all new fields
- Seed EMPWR + GLOW reservation data from spreadsheets
- Remove Orlando canceled event from GLOW
- Add "Production" classification to BOTH tenants
- Populate time limits for all entry sizes

### November 1 (Day 3) - LAUNCH + Backend Start
**MILESTONE:** Accounts + Dancers ONLY (routine creation disabled)
- Send account claiming emails to all studios
- Studios can log in, create dancers
- Routine creation button shows "Opens November 8th"

**BACKEND_AGENT (6 hours):**
- Age calculation utilities
- Classification validation utilities
- Update dancer.ts router (block classification changes if entries exist)
- Update entry.ts router (Part 1: classification enforcement)

### November 2-7 (Days 4-8) - Full Implementation
- Backend completion (entry validations, extended time)
- Frontend components (forms, validations, UI updates)
- UX polish (error messages, email templates)
- Deploy and testing

### November 8 (Day 9) - Routine Creation Opens
**MILESTONE:** Studio directors can create routines
- All validations active
- All business logic enforced
- Full regression testing complete

### December 23 - Payment Deadline
Studios need invoices with time to pay before this date

---

## 🎯 P0 Business Logic (Must-Haves for Nov 8)

### 1. Classification Enforcement
**Solo:** Classification locked to dancer's classification (100% match)
**Duet/Trio:** Uses highest dancer level, can bump up ONE level only
**Groups/Lines:** Uses 60% majority count, can bump up ONE level
**Production:** Auto-locks to "Production" classification (level 99)

### 2. Age Calculation
**Solo:** Exact age of dancer (as of Dec 31, 2025)
**Groups:** Floor(average age) - drop decimal
**Override:** Can bump up ONE year only (display: "6 ↑7")
**UI:** Show just the number (e.g., "6"), not "Age 6" or "6 years old"

### 3. Entry Size Auto-Detection
```
1 dancer = Solo
2 dancers = Duet
3 dancers = Trio
4-9 dancers = Small Group
10-14 dancers = Large Group
15-19 dancers = Line
20+ dancers = Superline
```
**Rule:** Locked based on dancer count, cannot manually change

### 4. Extended Time System
**Time Limits:**
- Solo/Duet/Trio/Vocal/Student Choreo: 3:00
- Small Group/Adult Group: 3:30
- Large Group: 4:00
- Line/Superline: 5:00
- Production: 15:00

**Fees (flat per dancer):**
- Solo: $5/dancer
- All other sizes: $2/dancer

**UI:** Checkbox + slider (minutes:seconds)

### 5. Production Auto-Lock
When entry size = "Production":
- Dance style → locked to "Production"
- Classification → locked to "Production" (level 99)
- Both fields disabled/greyed out

### 6. Required Fields Enforcement
**Phase 1 (Nov 1-7):** Choreographer NOT required
**Phase 2 (Nov 8+):** Choreographer REQUIRED for all routines
- Block form submission if missing
- Clear error message: "Choreographer is required"

### 7. Dancer Classification Lock
If dancer has ANY entries:
- Block classification changes
- Error: "Cannot change classification - dancer has existing entries"
- Must delete all entries first

### 8. Dropdown Disabled States
**Production (EMPWR):** "Production (locked)" - greyed out, unclickable
**Routine Creation (Before Nov 8):** Button shows "Opens November 8th" - disabled

### 9. Deposit/Credit/Discount Display
Show on confirmed reservation in routines page:
```
💰 Deposit Paid: $500
🎟️ Credits: $200
🏷️ Discount: 10%
```
Data from seeded reservations (spreadsheet source)

### 10. Tenant-Configurable Architecture
**CRITICAL:** All rules stored in database (tenant-scoped), NOT hardcoded in app
- Feature flags for enabling/disabling validations
- Configuration via tenant settings tables
- Future admin UI for rule management (Phase 2+)

---

## 📁 Key Files Reference

### Documentation (LAUNCH_PLAYBOOK/)
- **PHASE2_BUSINESS_LOGIC_SPECIFICATIONS.md** (970+ lines) - SOURCE OF TRUTH
- **PHASE3_DEVTEAM_TASK_DIVISION.md** - Task breakdown through Nov 7
- **PHASE4_AUTOMATED_TEST_SUITE_SPEC.md** - Test suite for separate instance
- **COMPLETENESS_CHECKLIST.md** - Verification of 100% capture

### Business Logic Specs
**Lines 1-100:** Classification enforcement system
**Lines 101-150:** Entry size auto-detection
**Lines 151-200:** Age calculation logic
**Lines 201-250:** Extended time system
**Lines 251-300:** Production auto-lock
**Lines 301-350:** Required fields enforcement
**Lines 351-400:** Dancer classification lock

### Database Schema
**Lines 450-550:** All SQL migrations needed
**Lines 551-600:** Time limits population
**Lines 601-650:** Classification creation (Production)

---

## 🔧 Common Operations

### Check Build Status
```bash
npm run build
```
**Rule:** Never commit until build passes

### Test on Both Tenants
```bash
# EMPWR
playwright.navigate("https://empwr.compsync.net")

# Glow
playwright.navigate("https://glow.compsync.net")
```
**Rule:** EVERY change tested on BOTH tenants

### Database Queries
```bash
# Use Supabase MCP (ALWAYS)
mcp__supabase__execute_sql
```

### Verify Tenant Isolation
```sql
-- Should ALWAYS return 0
SELECT COUNT(*) as leaks
FROM table_a a
JOIN table_b b ON a.b_id = b.id
WHERE a.tenant_id != b.tenant_id;
```

---

## 🚨 Emergency Protocols

### P0 (CRITICAL - Stop Everything)
- Data loss or corruption
- Cross-tenant data leak
- Payment processing failure
- Authentication system down

**Action:**
1. STOP all work immediately
2. Create `BLOCKER_[date]_[issue].md`
3. Notify user in chat
4. Do NOT attempt fix without approval

### P1 (HIGH - Fix Within 1 Hour)
- Build failures (3+)
- Deployment failures (3+)
- MCP tool failures (3+)

**Action:**
1. Create `BLOCKER.md` with investigation
2. Attempt fix if obvious
3. Rollback if unclear

### Build Fails Checklist
1. Read error message carefully
2. Check field names against spec AND schema
3. Verify import paths
4. Check circular dependencies
5. Cross-reference spec section

---

## ✅ Verification Checklist (Before Every Commit)

**Pre-Commit:**
- [ ] Build passes: `npm run build`
- [ ] Type check passes: `npm run type-check`
- [ ] Tested on EMPWR tenant
- [ ] Tested on Glow tenant
- [ ] Verified tenant isolation (no cross-tenant data)
- [ ] tenant_id filter in ALL queries
- [ ] Soft delete used (status='cancelled', not hard delete)
- [ ] Matches Phase 2 spec (business logic changes)
- [ ] 8-line commit format with spec references

**Post-Deploy:**
- [ ] Vercel deploy succeeds
- [ ] No errors in Vercel logs
- [ ] Quick smoke test on production
- [ ] Database integrity maintained

---

## 📝 8-Line Commit Format

```
fix: [Brief title]

- Change 1 (file:lines, spec:lines)
- Change 2 (file:lines, spec:lines)

Matches Phase2 spec lines [X]-[Y]. ✅ Build pass.

🤖 Claude Code
```

**Example:**
```
feat: Add classification enforcement for duets

- Implement highest-wins logic (entry.ts:145-178, spec:80-95)
- Add bump-up-one validation (entry.ts:179-192, spec:96-110)
- Update UI with locked/unlocked states (EntryForm.tsx:234-256)

Matches Phase2 spec lines 80-110. ✅ Build + both tenants tested.

🤖 Claude Code
```

---

## 🎯 DevTeam Protocol Quick Reference

### 6 Agents Defined
1. **DB_AGENT** (6 hours) - Database migrations, schema changes
2. **BACKEND_AGENT** (12 hours) - tRPC routers, validation logic
3. **FRONTEND_AGENT** (10 hours) - React components, forms
4. **UX_AGENT** (6 hours) - Styling, error messages, emails
5. **DEPLOY_AGENT** (6 hours) - Build verification, testing, deployment
6. **TEST_AGENT** (8 hours, separate instance) - Automated test suite

### Critical Path
```
DB_AGENT → BACKEND_AGENT → FRONTEND_AGENT → UX_AGENT → DEPLOY_AGENT
(TEST_AGENT runs in parallel, independent)
```

### Launching Agents
```typescript
// Single message, multiple Task calls for parallel execution
Task(subagent_type="general-purpose", prompt="DB_AGENT tasks...")
Task(subagent_type="general-purpose", prompt="BACKEND_AGENT tasks...")
```

---

## 🧪 Testing Strategy

### Automated Test Suite (Separate Instance)
- 50+ tests specified in PHASE4_AUTOMATED_TEST_SUITE_SPEC.md
- Run in separate Claude Code instance
- Playwright E2E tests
- Covers all P0 business logic

### Manual Testing Checklist
1. Solo classification locks to dancer
2. Duet/Trio uses highest, allows +1 bump
3. Group uses 60% majority, allows +1 bump
4. Production auto-locks style + classification
5. Age calculation correct (floor for groups)
6. Entry size auto-detects from dancer count
7. Extended time fees calculate correctly
8. Choreographer required (after Nov 8)
9. Dancer classification locked if entries exist
10. Tenant isolation verified

---

## 📊 Data Sources

### Reservation Seeding
**Source:** Emily's merged spreadsheet (Emily data + Selena's GLOW data)
**Fields:**
- Studio name, email
- Approved slots count
- Deposit paid amount
- Credits owed (optional)
- Discount percentage (optional)

**Status:** Waiting on Selena to complete GLOW data tonight (Oct 30)

### Time Limits
**Source:** Glow website (user provided)
Already documented in Phase 2 spec lines 201-240

### Classifications
**Source:** Existing EMPWR data + manual "Production" addition
Must add "Production" (level 99) to BOTH tenants

---

## 🎓 Key Architectural Principles

### Multi-Tenant Safety
**EVERY query MUST filter by tenant_id:**
```typescript
const data = await prisma.table.findMany({
  where: {
    tenant_id: ctx.tenantId,  // MANDATORY
    // ... other filters
  }
});
```

### Soft Delete Only
```typescript
// ✅ CORRECT
await prisma.table.update({
  where: { id },
  data: { status: 'cancelled' }
});

// ❌ WRONG
await prisma.table.delete({ where: { id } });
```

### State Machines
Always validate state transitions:
```typescript
if (!isValidTransition(currentStatus, newStatus)) {
  throw new TRPCError({ code: 'BAD_REQUEST' });
}
```

### Audit Trails
Log every state change for debugging

---

## 💡 Quick Troubleshooting

### "Changes won't appear despite correct build"
**Cause:** JavaScript chunk cache issue
**Fix:** Add cache buster comment + change UI element (emoji/text)

### "Query returns wrong tenant's data"
**Cause:** Missing tenant_id filter
**Fix:** Add `where: { tenant_id: ctx.tenantId }` to ALL queries

### "Build fails with field not found"
**Cause:** Schema drift (Prisma vs database mismatch)
**Fix:** Run `npx prisma db pull` then `npx prisma generate`

### "Classification validation not working"
**Cause:** Check if rule is tenant-configurable (database-driven)
**Fix:** Query tenant settings, don't hardcode logic

---

## 📞 User Availability

**User Status:** Available async through Nov 7
**User Authority:** Can make reasonable decisions autonomously
**Communication:** Report blockers immediately via BLOCKER.md

---

## 🎯 Success Criteria for Nov 8 Launch

- ✅ All P0 business logic implemented and tested
- ✅ Both tenants seeded with reservation data
- ✅ All validations enforced correctly
- ✅ Tenant isolation verified (zero leaks)
- ✅ Build passes, no type errors
- ✅ Email deliverability verified
- ✅ Automated test suite passing (50+ tests)
- ✅ Manual smoke tests passing on both tenants
- ✅ No console errors in production
- ✅ Database backup automation active
- ✅ Error monitoring (Sentry) configured

---

## 📚 Additional Resources

**Load when needed:**
- `CLAUDE.md` - Full development instructions
- `DEBUGGING.md` - Bug investigation protocol
- `GOTCHAS.md` - Common issues and fixes
- `ANTI_PATTERNS.md` - What NOT to do under pressure
- `docs/specs/PHASE1_SPEC.md` - Complete Phase 1 reference (if needed)

---

**Remember:** This is a real business launch with real stakes. When in doubt:
1. Check the spec first
2. Test on BOTH tenants
3. Verify tenant isolation
4. Ask before making breaking changes
5. Document blockers immediately

**You've got this. The documentation is complete and sound. Execute systematically.**
