# Error Log - CompPortal MAAD System

Track all errors, failures, and issues encountered during development.

---

## Format

```markdown
## [DATE] [TIME] - Error: [BRIEF]

**Type**: BUILD_FAILURE / RUNTIME_ERROR / DATABASE_ERROR / TEST_FAILURE

**Feature**: [feature name]
**Agent**: [which agent encountered error]
**Severity**: 🔴 CRITICAL / 🟡 HIGH / 🔵 MEDIUM / ⚪ LOW

**Error Message**:
```
[Full error message]
```

**Stack Trace** (if applicable):
```
[Stack trace]
```

**Context**:
- File: [path]
- Line: [number]
- Function: [name]

**Resolution**:
[What fixed it or "UNRESOLVED"]

**Time to Fix**: [minutes]
```

---

## No errors logged yet

When errors occur, they will be logged here automatically by agents.

---

## Common Error Patterns (Reference)

### TypeScript Errors
- **Issue**: Property 'field_name' does not exist
- **Cause**: Wrong Prisma field name
- **Fix**: Check prisma/schema.prisma for exact field names

### Build Errors
- **Issue**: Module not found
- **Cause**: Incorrect import path
- **Fix**: Verify file exists, check @ alias configuration

### Runtime Errors
- **Issue**: Cannot read property of undefined
- **Cause**: Missing null checks
- **Fix**: Add optional chaining (?.) or null checks

### Database Errors
- **Issue**: Relation does not exist
- **Cause**: Migration not applied
- **Fix**: Apply migration via supabase:apply_migration
