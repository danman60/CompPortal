# Autonomous Agent Instructions for CompPortal Development

## Purpose
This document instructs an autonomous agent on how to prompt Claude Code to continue building the CompPortal project autonomously, following established patterns and priorities.

---

## Critical Context to Include in Every Prompt

### 1. Project Identity & Location
```
Project: GlowDance Competition Portal (CompPortal)
Location: D:\ClaudeCode\CompPortal
Tracker: D:\ClaudeCode\COMPPORTAL.txt
Status Doc: D:\ClaudeCode\CompPortal\PROJECT_STATUS.md
Current Phase: Backend Feature Development - 70% Complete
```

### 2. Current Architecture & Tech Stack
```
Framework: Next.js 15 (App Router)
Language: TypeScript
Database: PostgreSQL (Supabase)
ORM: Prisma
API: tRPC
Auth: Supabase Auth
Storage: Supabase Storage
Email: Resend + React Email
Styling: Tailwind CSS with glassmorphic design
```

### 3. Established Design Patterns

**UI/UX Standards**:
- Glassmorphic design: `bg-white/10 backdrop-blur-md rounded-xl border border-white/20`
- Gradient backgrounds: `bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900`
- Color scheme: Purple/pink/blue gradients with white text
- Icons: Emoji-based (🎭, 📅, 🏢, etc.)
- No external icon libraries
- Responsive: Mobile-first with Tailwind breakpoints

**Code Organization**:
- tRPC routers in `src/server/routers/`
- All routers must be added to `src/server/routers/_app.ts`
- React components in `src/components/`
- Utility libraries in `src/lib/`
- Page routes in `src/app/dashboard/[feature]/page.tsx`
- Server components for auth-protected pages
- Client components (`'use client'`) for interactive UI

**Naming Conventions**:
- Prisma relations: Use exact schema names (e.g., `dance_categories`, `entry_participants`, `competition_entries`)
- Field names: Use snake_case for database fields, match Prisma schema exactly
- Functions: camelCase
- Components: PascalCase
- Files: kebab-case for utilities, PascalCase for components

**Critical Prisma Schema Notes**:
- `competition_start_date` NOT `start_date`
- `dance_categories` NOT `categories`
- `entry_participants` NOT `competition_entry_participants`
- `competitions` is the relation name, not `competition`

---

## Roadmap Priority Queue

### Immediate Next Tasks (In Order)
1. **Schedule Export (PDF/CSV)** - High priority, completes Phase 3
2. **Judge Tablet Scoring Interface** - Starts Phase 4
3. **Admin Analytics Dashboard** - Completes core feature set

### Phase 3 Remaining: Scheduling & Music (80% → 100%)
- [x] Music upload system (COMPLETE)
- [x] Competition scheduling system (COMPLETE)
- [ ] Schedule export functionality (PDF/CSV)
  - Print-friendly schedule layout
  - Running order sheets
  - Session summaries
  - CSV export for spreadsheet import

### Phase 4: Tabulation & Reporting (0% → Start)
- [ ] Judge tablet interface (touch-optimized web app)
  - Score entry forms (technical, artistic, performance)
  - Entry navigation (prev/next)
  - Offline-first capability
  - Real-time sync when online
- [ ] Live score sync system
- [ ] Competition day reports
- [ ] Studio performance reports

### Phase 5: Advanced Features
- [ ] Analytics dashboard
  - Revenue tracking
  - Registration trends
  - Studio performance metrics
  - Competition statistics

---

## Prompt Structure for Autonomous Development

### Template for Agent to Use

```markdown
**Project Context**: CompPortal (GlowDance Competition Portal)
**Location**: D:\ClaudeCode\CompPortal
**Current Status**: Phase 2 MVP - 70% Complete

**Last Completed**: [Previous feature name from COMPPORTAL.txt]
**Latest Commit**: [Commit hash from COMPPORTAL.txt]

**Next Priority**: [Next item from roadmap priority queue above]

**Instructions**:
Continue autonomous development following the established patterns.
Build the next priority feature from the roadmap: [Feature name]

**Requirements**:
1. Follow established UI/UX patterns (glassmorphic design, emoji icons)
2. Use existing tech stack (Next.js 15, tRPC, Prisma, Supabase)
3. Match naming conventions (Prisma schema field names)
4. Create all necessary files (router, components, pages)
5. Update _app.ts to include any new routers
6. Build completes without errors
7. Update COMPPORTAL.txt with session details
8. Commit with detailed message following established format
9. Push to GitHub

**Expected Deliverables**:
- [List specific files that should be created]
- Full build success (all routes compile)
- Git commit with detailed changelog
- Updated project tracker

Please proceed with implementation.
```

---

## Critical Rules for Autonomous Development

### DO ✅
1. **Always read COMPPORTAL.txt first** to understand current status
2. **Check latest commit** to know what was last completed
3. **Follow established patterns** for UI, code structure, naming
4. **Build and verify** before committing (run `npm run build`)
5. **Use TodoWrite tool** to track multi-step work
6. **Update tracker files** (COMPPORTAL.txt, PROJECT_STATUS.md)
7. **Write detailed commit messages** with feature descriptions
8. **Test that all 17+ routes compile** successfully
9. **Push to GitHub** after successful commit
10. **Use exact Prisma field names** from schema (read it if unsure)

### DON'T ❌
1. **Don't create placeholder/dummy data** in production code
2. **Don't use external icon libraries** (use emojis instead)
3. **Don't skip build verification** before committing
4. **Don't assume field names** (competition_start_date not start_date)
5. **Don't forget to add routers** to _app.ts
6. **Don't create files without purpose** (only what's needed)
7. **Don't change established UI patterns** (keep glassmorphic style)
8. **Don't commit without updating tracker** files
9. **Don't skip git push** after successful commit
10. **Don't deviate from roadmap** priorities without reason

---

## Feature Implementation Checklist

For each new feature, ensure:

### Backend
- [ ] Create utility library in `src/lib/` if needed (e.g., `scheduling.ts`)
- [ ] Create tRPC router in `src/server/routers/` (e.g., `scheduling.ts`)
- [ ] Add router to `src/server/routers/_app.ts`
- [ ] Define TypeScript types and Zod schemas
- [ ] Implement CRUD operations with Prisma
- [ ] Handle errors gracefully

### Frontend
- [ ] Create page in `src/app/dashboard/[feature]/page.tsx`
- [ ] Add authentication check and redirect
- [ ] Create main manager component (e.g., `SchedulingManager.tsx`)
- [ ] Create supporting components (cards, lists, forms)
- [ ] Follow glassmorphic UI patterns
- [ ] Use emoji icons consistently
- [ ] Implement loading and error states

### Integration
- [ ] Update dashboard navigation if needed
- [ ] Test all tRPC queries/mutations
- [ ] Verify Prisma relations work correctly
- [ ] Check responsive design (mobile, tablet, desktop)
- [ ] Run `npm run build` - must succeed

### Documentation
- [ ] Update COMPPORTAL.txt with detailed changelog
- [ ] List all files created
- [ ] Document features and technical decisions
- [ ] Update phase completion percentages
- [ ] Update code statistics

### Version Control
- [ ] Stage all files: `git add .`
- [ ] Commit with detailed message (see format below)
- [ ] Push to remote: `git push`

---

## Git Commit Message Format

```
feat: [Brief title describing the feature]

[2-3 sentence description of what was built and why]

New Features:
- Feature 1 description
- Feature 2 description
- Feature 3 description

Files Created:
- path/to/file1.ts - Purpose
- path/to/file2.tsx - Purpose
- path/to/file3.tsx - Purpose

Updated Files:
- path/to/existing.ts - What changed

[Feature Category] Features:
- Bullet list of specific capabilities
- User-facing functionality
- Technical highlights

Technical Implementation:
- Implementation detail 1
- Implementation detail 2
- Key algorithms or patterns used

Build Status: ✅ All [N] routes compile successfully

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Context Refresh Strategy

Since conversations can get summarized, include this context in every prompt:

### Essential Context Block
```markdown
**Critical Context**:
- Project: CompPortal at D:\ClaudeCode\CompPortal
- Tech: Next.js 15, tRPC, Prisma, Supabase, TypeScript
- UI: Glassmorphic purple/pink gradients, emoji icons
- Current: Phase 2 MVP - 70% complete
- Next: [Specific feature from roadmap]
- Patterns: Follow existing code style in src/components/ and src/server/routers/
- Schema: Use exact Prisma field names (read prisma/schema.prisma if unsure)
```

---

## Quality Gates Before Commit

### Must Pass
1. ✅ `npm run build` succeeds
2. ✅ All routes compile (check build output)
3. ✅ No TypeScript errors
4. ✅ All imports resolve
5. ✅ tRPC router added to _app.ts (if new router)
6. ✅ Prisma field names match schema
7. ✅ UI follows glassmorphic pattern
8. ✅ Components use 'use client' where needed
9. ✅ Server components use await for Supabase

### Should Pass
- 🟢 No console errors in development
- 🟢 Responsive design works
- 🟢 Loading states implemented
- 🟢 Error handling implemented
- 🟢 Components follow naming conventions

---

## Recovery Instructions (If Build Fails)

### Common Issues & Fixes

**Issue**: Module not found '@/lib/[something]'
- **Fix**: Check file exists, check import path uses @ alias correctly

**Issue**: Type errors with Prisma relations
- **Fix**: Read `prisma/schema.prisma`, use exact relation names

**Issue**: "createServerClient is not exported"
- **Fix**: Use `createServerSupabaseClient` from '@/lib/supabase-server-client'

**Issue**: React Query deprecated warnings
- **Fix**: Use async/await pattern with refetch() instead of onSuccess callbacks

**Issue**: "can't read property of undefined"
- **Fix**: Add optional chaining `?.` and null checks

**Issue**: Build timeout
- **Fix**: Check for circular dependencies, simplify imports

### Debug Process
1. Read error message carefully
2. Check import paths
3. Verify Prisma field names
4. Check for typos in relation names
5. Read related existing code for patterns
6. Fix and rebuild
7. Don't commit until build succeeds

---

## Example First Prompt for Agent

```markdown
**Project**: CompPortal (D:\ClaudeCode\CompPortal)
**Status**: Phase 2 MVP - 70% Complete
**Last Session**: Competition scheduling system (Commit: 214bac0)

**Next Task**: Build schedule export functionality (PDF/CSV)

**Context**:
- Tech stack: Next.js 15, tRPC, Prisma, Supabase, TypeScript
- UI pattern: Glassmorphic design with purple/pink gradients
- Latest work: Scheduling system with conflict detection complete
- Need: PDF/CSV export for competition schedules

**Requirements**:
1. Create tRPC router for export operations
2. Build export UI in scheduling page
3. Generate PDF with print-friendly schedule layout
4. Support CSV export for spreadsheet import
5. Include: Running order, session details, entry information
6. Follow existing code patterns
7. Update tracker and commit

**Expected Output**:
- src/server/routers/export.ts (or add to scheduling.ts)
- Export UI components
- PDF generation logic
- CSV generation logic
- Build success
- Git commit with details
- Updated COMPPORTAL.txt

Please proceed with implementation following autonomous development protocol.
```

---

## Tracker Update Template

After each feature completion, add to COMPPORTAL.txt:

```markdown
### [Date] (Autonomous Development Session #N) - [Feature Name] ✅

**Session Goal**: [One sentence description]

**Completed Work**:

#### 1. [Component Name] (Commit: [hash])
- [Key feature 1]
- [Key feature 2]
- [Key feature 3]

**Key Files**:
- `path/to/file.ts` - Purpose and description
- `path/to/component.tsx` - Purpose and description

**[Feature Category] Features**:
- Feature detail 1
- Feature detail 2
- Feature detail 3

**Build Status**: ✅ All [N] routes compile successfully

**Git Commit**: [hash] - feat: [Title]

**Technical Implementation**:
- Implementation detail 1
- Implementation detail 2

**Statistics**:
- N new tRPC endpoints
- N new React components
- ~N lines of new code

---
```

---

## Success Metrics

Each session should achieve:

1. ✅ **Feature Complete**: Fully functional, not partial
2. ✅ **Build Success**: All routes compile without errors
3. ✅ **Code Quality**: Follows established patterns
4. ✅ **Documented**: Tracker files updated
5. ✅ **Committed**: Git commit with detailed message
6. ✅ **Pushed**: Changes on GitHub
7. ✅ **Progress**: Phase completion % updated

---

## Critical Files Reference

### Must Read Before Starting
- `D:\ClaudeCode\COMPPORTAL.txt` - Current status and history
- `prisma/schema.prisma` - Database schema (for exact field names)
- `src/server/routers/_app.ts` - Router registry (must update)

### Examples to Reference
- `src/components/SchedulingManager.tsx` - Complex UI pattern
- `src/server/routers/scheduling.ts` - Complex router pattern
- `src/lib/scheduling.ts` - Utility library pattern
- `src/app/dashboard/scheduling/page.tsx` - Protected page pattern

### Always Update
- `D:\ClaudeCode\COMPPORTAL.txt` - Detailed changelog
- `D:\ClaudeCode\CompPortal\PROJECT_STATUS.md` - High-level status

---

## Final Agent Instructions

**Every prompt should**:
1. Include project context block
2. Specify exact next feature from roadmap
3. List expected deliverables
4. Remind about quality gates
5. Request build verification
6. Request tracker updates
7. Request git commit/push

**Every response should**:
1. Confirm understanding of task
2. Read COMPPORTAL.txt first
3. Implement feature completely
4. Run build to verify
5. Update tracker files
6. Commit with detailed message
7. Push to GitHub
8. Summarize what was accomplished

---

## Emergency Protocols

**If build fails repeatedly**:
- Read existing similar code
- Check Prisma schema field names
- Verify import paths
- Simplify implementation
- Ask for help with specific error

**If stuck on feature**:
- Break into smaller subtasks
- Implement minimal version first
- Reference similar existing features
- Use TodoWrite to track progress

**If context lost**:
- Read COMPPORTAL.txt completely
- Check latest git commits
- Review recent code changes
- Understand current phase

---

## Autonomous Development Loop

```
1. Agent sends prompt with context + next task
2. Claude reads COMPPORTAL.txt
3. Claude checks latest commit
4. Claude implements feature
5. Claude verifies build
6. Claude updates tracker
7. Claude commits + pushes
8. Claude reports completion
9. Agent sends next prompt (repeat)
```

This loop continues until roadmap complete or human intervention needed.

---

## Contact/Escalation

**When to pause autonomous development**:
- Build fails after 3 attempts
- Feature requires design decisions
- Unclear requirements
- Need external services setup
- Database migration needed
- Breaking changes required

**Report to human**:
- Current status
- Blockers encountered
- Decisions needed
- Recommended next steps

---

## Version

**Document Version**: 1.0
**Created**: October 3, 2025
**Last Updated**: October 3, 2025
**Project Phase**: Phase 2 MVP - 70% Complete
**Next Feature**: Schedule Export (PDF/CSV)

---

*This document should be updated as patterns evolve and new standards emerge.*
