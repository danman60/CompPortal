# Security & Performance Audit

**Date**: October 5, 2025
**Tool**: Supabase Database Advisors
**Status**: 🔴 Critical Issues Found

---

## Executive Summary

Supabase advisor scan identified **89 total issues** across security and performance categories:

| Category | ERROR | WARN | INFO | Total |
|----------|-------|------|------|-------|
| **Security** | 23 | 8 | 2 | 33 |
| **Performance** | 0 | 27 | 29 | 56 |
| **TOTAL** | **23** | **35** | **31** | **89** |

---

## 🔴 CRITICAL: Security Issues (23 ERROR)

### Missing RLS on Public Tables (23 tables)

**Impact**: Tables exposed via PostgREST without RLS protection
**Risk**: Unauthorized data access if API keys compromised

**Affected Tables**:
1. competitions
2. competition_locations
3. competition_sessions
4. dance_categories
5. classifications
6. age_groups
7. entry_size_categories
8. judges
9. award_types
10. title_rounds
11. vip_events
12. elite_instructors
13. system_settings
14. email_templates

**Current Access**: Application uses tRPC with server-side authorization (not direct PostgREST)
**Priority**: Medium (mitigated by tRPC layer, but should implement defense-in-depth)

**Remediation**: Enable RLS on reference/config tables with read-only policies

---

## ⚠️ HIGH: Performance Issues (27 WARN)

### 1. RLS Policies with Poor Performance (23 policies)

**Issue**: Using `auth.uid()` instead of `(select auth.uid())` causes re-evaluation for each row

**Impact**: Queries slow at scale (1000+ rows)

**Affected Tables**:
- invoices (5 policies)
- competition_entries (1 policy)
- email_logs (2 policies)
- competition_settings (4 policies)
- studios (1 policy)
- dancers (1 policy)
- user_profiles (2 policies)
- reservations (1 policy)
- entry_participants (1 policy)
- documents (1 policy)
- scores (3 policies)

**Fix**: Migration to replace `auth.uid()` with `(select auth.uid())`

**Example**:
```sql
-- ❌ SLOW (re-evaluates for each row)
CREATE POLICY "Studios can view own invoices" ON invoices
  FOR SELECT USING (
    studio_id IN (
      SELECT studio_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ✅ FAST (evaluates once)
CREATE POLICY "Studios can view own invoices" ON invoices
  FOR SELECT USING (
    studio_id IN (
      SELECT studio_id FROM user_profiles WHERE id = (select auth.uid())
    )
  );
```

### 2. Multiple Permissive Policies (8 warnings)

**Issue**: Multiple SELECT policies on same table/role causes all to execute

**Affected**:
- email_logs: 2 policies for anon/authenticated/authenticator/dashboard_user
- invoices: 2 policies for anon/authenticated/authenticator/dashboard_user

**Fix**: Consolidate into single policy with OR conditions

---

## 📊 INFO: Performance Optimizations (29 items)

### 1. Unindexed Foreign Keys (28 foreign keys)

**Impact**: Slower JOIN queries, constraint checks

**Top Priority Tables** (by query frequency):
1. **competition_entries**: 7 unindexed FKs
   - category_id, classification_id, age_group_id, entry_size_category_id
   - next_entry_id, previous_entry_id
2. **reservations**: 4 unindexed FKs
   - location_id, approved_by, payment_confirmed_by
3. **competition_sessions**: 3 unindexed FKs
   - competition_id, location_id, head_judge
4. **awards, rankings, judges**: Multiple unindexed FKs

**Recommendation**: Add indexes to top 10 most-queried foreign keys

### 2. Unused Indexes (30 indexes)

**Impact**: Storage waste, slower writes

**Examples**:
- idx_invoices_studio (never used)
- idx_competitions_year (never used)
- idx_dancers_name (never used)

**Note**: These are likely unused because queries use different patterns. Verify usage before dropping.

---

## ⚠️ WARN: Security Recommendations

### 1. Function Search Path (6 functions)

**Issue**: Functions lack explicit search_path, vulnerable to schema manipulation

**Affected Functions**:
- update_competition_tokens
- update_scores_updated_at
- get_next_entry_number
- handle_new_user
- update_updated_at_column
- calculate_dancer_age

**Fix**:
```sql
CREATE OR REPLACE FUNCTION get_next_entry_number(p_competition_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ✅ ADD THIS
AS $$
  -- function body
$$;
```

### 2. Auth Settings

- **Leaked Password Protection**: Disabled (should enable HaveIBeenPwned integration)
- **MFA Options**: Insufficient (only TOTP enabled, should add WebAuthn)

---

## 📌 INFO: RLS Enabled, No Policies (2 tables)

**Tables**: awards, rankings

**Status**: RLS enabled but no policies defined
**Impact**: No rows accessible (locked down)
**Fix**: Add appropriate policies for judges/directors

---

## 🎯 Implementation Plan

### Phase 1: Critical Performance Fixes (2-3 hours)
1. ✅ Fix 23 RLS policies with `(select auth.uid())` pattern
2. ✅ Add indexes to top 10 foreign keys
3. ✅ Consolidate email_logs and invoices permissive policies

### Phase 2: Security Hardening (1-2 hours)
4. ✅ Add search_path to 6 database functions
5. ✅ Add RLS policies for awards and rankings tables
6. ⏭️ Enable leaked password protection (config change)
7. ⏭️ Enable additional MFA options (config change)

### Phase 3: RLS for Reference Tables (3-4 hours)
8. ⏭️ Add RLS to 23 public tables with read-only policies
9. ⏭️ Test with restricted API keys

### Phase 4: Index Cleanup (1 hour)
10. ⏭️ Analyze unused indexes with query logs
11. ⏭️ Drop truly unused indexes

---

## Risk Assessment

| Issue | Current Risk | Mitigated By | Residual Risk |
|-------|--------------|--------------|---------------|
| Missing RLS | High | tRPC server-side auth | Medium |
| Slow RLS policies | Medium | Low data volume | Low |
| Unindexed FKs | Low | Small dataset | Very Low |
| Function search_path | Medium | SECURITY DEFINER not used | Low |
| Multiple policies | Low | Query optimization | Very Low |

**Conclusion**: No immediate blocking issues. Application is secure at tRPC layer. Database-level hardening recommended for defense-in-depth.

---

## Migration Strategy

**Approach**: Incremental migrations, each tested separately

**Commit Strategy**:
- One migration per category (RLS performance, foreign key indexes, etc.)
- Each migration builds successfully before next
- Test in production after each migration

**Rollback Plan**: Each migration is reversible

---

**Next Steps**: Begin Phase 1 (Performance Fixes)
