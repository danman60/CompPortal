# Blockers - CompPortal MAAD System

Track blockers preventing autonomous development progress.

---

## Format

```markdown
## [DATE] [TIME] - Blocker: [BRIEF]

**Feature**: [feature name]
**Agent**: [which agent is blocked]
**Priority**: 🔴 HIGH / 🟡 MEDIUM / 🟢 LOW

**Issue**:
[Detailed description of what's blocking progress]

**Requires**:
[What's needed to unblock]
- User input?
- External service?
- Manual configuration?
- Additional research?

**Impact**:
[What can't proceed until unblocked]

**Workaround**:
[Temporary solution or "None"]

**Status**: 🔴 BLOCKED / 🟡 IN PROGRESS / ✅ RESOLVED
```

---

## No active blockers

When blockers occur, they will be logged here for user visibility.

---

## Resolution Template

```markdown
### Resolution - [DATE] [TIME]

**Blocker**: [brief]
**How Resolved**: [description]
**Time Blocked**: [duration]
**Status**: ✅ RESOLVED
```

---

## Common Blockers (Reference)

### Missing Environment Variables
- **Blocker**: RESEND_API_KEY not configured
- **Requires**: User to add API key to Vercel
- **Impact**: Email sending features non-functional
- **Workaround**: Development continues, emails stubbed

### External Service Down
- **Blocker**: Supabase database unreachable
- **Requires**: Wait for service restoration
- **Impact**: All database operations fail
- **Workaround**: None - STOP autonomous operation

### User Approval Needed
- **Blocker**: Uncertain about feature requirements
- **Requires**: User clarification
- **Impact**: Cannot proceed with feature
- **Workaround**: Build ahead on other features from roadmap
