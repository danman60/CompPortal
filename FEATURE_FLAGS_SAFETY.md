# Feature Flags Safety Guidelines

**Created:** November 4, 2025
**Purpose:** Address common feature flag pitfalls and establish safety protocols

---

## ⚠️ Known Risks (From Reddit Post)

### Risk 1: Unintended Side Effects
**Problem:** Two unrelated flags affecting the same workflow create untested permutations

**Example Scenario:**
```typescript
// Flag A: NEW_ROUTINE_PAGE changes entry creation flow
// Flag B: APPROVAL_SYSTEM_V2 changes how entries are validated
// Unexpected: What if both are enabled but weren't tested together?
```

**Our Mitigation:**
1. ✅ **Limited Scope:** We only have 2 active flags (NEW_ROUTINE_PAGE, APPROVAL_SYSTEM_V2)
2. ✅ **Independent Features:** These flags control completely separate workflows:
   - NEW_ROUTINE_PAGE: Entry creation (SD side)
   - APPROVAL_SYSTEM_V2: Approval process (CD side)
   - **No overlap** between these two features
3. ✅ **Test Matrix Required:** Before adding more flags, document interactions

---

### Risk 2: Feature Flag System Failure
**Problem:** What if `isFeatureEnabled()` throws an error or returns wrong value?

**Our Mitigation:**
1. ✅ **Safe Defaults:** All flags default to `false` if lookup fails
   ```typescript
   export const isFeatureEnabled = (featureKey, userRole) => {
     const config = FEATURE_CONFIG[featureKey];
     if (!config) {
       console.warn(`Unknown feature: ${featureKey}`);
       return false; // ← Safe default
     }
     return config.roles.includes(userRole);
   };
   ```

2. ✅ **No External Dependencies:** Flags are code-based, not database/API
   - No network calls
   - No database queries
   - Simple in-memory lookup

3. ✅ **Graceful Degradation:** If flag system breaks, users see OLD version
   ```typescript
   if (isFeatureEnabled(FEATURES.NEW_ROUTINE_PAGE, userRole)) {
     return <NewVersion />; // If flag fails, this doesn't render
   }
   return <OldVersion />; // ← Users always get working version
   ```

4. ⚠️ **Monitor Console Warnings:** Watch for "Unknown feature" warnings in logs

---

### Risk 3: Rollback Complexity
**Problem:** Multiple teams, multiple flags - who flipped what?

**Our Mitigation:**
1. ✅ **Single Team:** Only one development team (us)
2. ✅ **Code-Based Flags:** All changes go through git
   - Every flag change = git commit
   - Full audit trail in git history
   - Easy rollback via `git revert`

3. ✅ **Simple Rollback Process:**
   ```bash
   # To disable a feature immediately:
   # Option 1: Change roles array and redeploy (5 min)
   roles: ['super_admin'], // Remove 'studio_director'

   # Option 2: Comment out flag check (30 sec)
   // if (isFeatureEnabled(FEATURES.NEW_ROUTINE_PAGE, userRole)) {
   //   return <NewVersion />;
   // }
   return <OldVersion />; // Everyone sees old version
   ```

4. ✅ **Flag Ownership:** Document who owns each flag
   ```typescript
   [FEATURES.NEW_ROUTINE_PAGE]: {
     roles: ['super_admin', 'competition_director'],
     description: 'New routine creation page',
     owner: 'daniel@streamstage.live', // ← Who to ask
     created: '2025-11-04',
     status: 'testing',
   },
   ```

---

## 🎯 Our Safety Protocol

### Rule 1: One Flag Per Workflow
**DO:** One flag controls one complete user workflow
- ✅ NEW_ROUTINE_PAGE = entire entry creation flow
- ✅ APPROVAL_SYSTEM_V2 = entire approval flow

**DON'T:** Multiple flags in same workflow
- ❌ FLAG_A = new form UI
- ❌ FLAG_B = new validation logic
- ❌ FLAG_C = new submission handler
- **Problem:** 2^3 = 8 permutations to test!

---

### Rule 2: Test All Roles Before Launch
**Before enabling flag for studio_director:**
1. [ ] Test as super_admin (SA sees new version)
2. [ ] Test as competition_director (CD sees new version)
3. [ ] Test as studio_director with flag enabled (simulate launch)
4. [ ] Verify old version still works (flag disabled)

**Test Matrix:**
| Role | Flag Status | Expected Behavior |
|------|-------------|-------------------|
| SA | Enabled | ✅ See new version |
| CD | Enabled | ✅ See new version |
| SD | Disabled | ✅ See old version |
| SD | Enabled | ✅ See new version (launch day) |

---

### Rule 3: Flag Hygiene (Cleanup)
**Lifecycle:**
1. **Week 1:** Flag created, SA + CD testing
2. **Week 2:** Flag enabled for SD, monitoring
3. **Week 3-4:** Feature stable, no issues
4. **Week 5:** Remove flag, delete old code

**Cleanup Checklist:**
- [ ] Feature stable for 2+ weeks
- [ ] No rollback needed
- [ ] Remove `if (isFeatureEnabled(...))` checks
- [ ] Delete old version components
- [ ] Remove flag from FEATURE_CONFIG
- [ ] Deploy cleaned code

**Timeline:** Don't let flags live >4 weeks

---

### Rule 4: Document Flag Interactions
**When adding new flag, check:**
```typescript
// NEW FLAG CHECKLIST
// 1. What workflow does it affect?
// 2. Does it touch same code as existing flags?
// 3. If yes, document the interaction:

// INTERACTION WARNING:
// NEW_ROUTINE_PAGE + VIDEO_UPLOAD both affect entry creation
// Test combinations:
// - NEW_ROUTINE_PAGE=on, VIDEO_UPLOAD=off ✓
// - NEW_ROUTINE_PAGE=on, VIDEO_UPLOAD=on ✓
// - NEW_ROUTINE_PAGE=off, VIDEO_UPLOAD=on ✗ (not supported)
```

---

### Rule 5: Emergency Disable Process
**If feature causes issues in production:**

**Option A: Quick Disable (5 minutes)**
```typescript
// In feature-flags.ts, change roles:
[FEATURES.PROBLEMATIC_FEATURE]: {
  roles: [], // ← Empty array = nobody sees it
  description: 'DISABLED DUE TO PROD ISSUE',
  status: 'disabled',
},

// Commit and deploy
git add src/lib/feature-flags.ts
git commit -m "emergency: Disable PROBLEMATIC_FEATURE due to [issue]"
git push
```

**Option B: Code Bypass (30 seconds)**
```typescript
// In component, force old version:
// if (isFeatureEnabled(FEATURES.NEW_ROUTINE_PAGE, userRole)) {
//   return <NewVersion />;
// }
return <OldVersion />; // ← Everyone sees safe version
```

**Option C: Rollback Commit (1 minute)**
```bash
# Find commit that added flag
git log --oneline | grep "NEW_ROUTINE_PAGE"

# Revert it
git revert abc123
git push
```

---

## 📊 Flag Monitoring

### What to Monitor:
1. **Error Rate by Feature:**
   ```sql
   -- Check if new feature has higher error rate
   SELECT
     'new_routine_page' as feature,
     COUNT(*) as errors
   FROM error_logs
   WHERE page_path LIKE '%entries/create%'
     AND created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Usage Statistics:**
   ```sql
   -- How many users seeing new vs old version?
   SELECT
     CASE
       WHEN user_role IN ('super_admin', 'competition_director')
         THEN 'new_version'
       ELSE 'old_version'
     END as version,
     COUNT(DISTINCT user_id) as users
   FROM activity_logs
   WHERE action LIKE '%entry_create%'
   GROUP BY version;
   ```

3. **Flag Status Dashboard:** (Future enhancement)
   ```typescript
   // /dashboard/admin/feature-flags
   // Show:
   // - Which flags are active
   // - Who can see each flag
   // - Usage statistics
   // - Error rates per flag
   ```

---

## ✅ Our Current Safe State

### Active Flags: 2
1. **NEW_ROUTINE_PAGE** - Isolated to entry creation workflow
2. **APPROVAL_SYSTEM_V2** - Isolated to approval workflow
3. **No interactions** between these two flags

### Risk Level: 🟢 LOW
- Single team
- Code-based flags (not database)
- Independent workflows
- Simple rollback (git revert)
- Safe defaults (false = old version)

### When Risk Increases: 🟡 MEDIUM
- Adding 3+ flags
- Flags affecting same workflow
- Multiple teams deploying
- Database-backed flags (future)

**Action:** Revisit this document before adding more flags

---

## 🎓 Lessons from Reddit Post

### What We're Doing Right:
✅ Small team (no coordination overhead)
✅ Code-based flags (simple, git-tracked)
✅ Safe defaults (failures show old version)
✅ Limited scope (2 flags, no interactions)
✅ Clear cleanup plan (4-week lifecycle)

### What We Need to Watch:
⚠️ Don't let flags accumulate (clean up after 4 weeks)
⚠️ Test all role combinations before launch
⚠️ Document flag interactions if adding more
⚠️ Monitor error rates per feature

### When to Skip Feature Flags:
- Critical security features (use RLS instead)
- Simple changes (just deploy)
- Single-file changes (low risk)
- Breaking changes (need migration, not flag)

---

## 📋 Pre-Launch Checklist (Use This!)

Before enabling any flag for `studio_director`:

- [ ] Tested as SA (new version works)
- [ ] Tested as CD (new version works)
- [ ] Tested with flag disabled (old version works)
- [ ] No interactions with other active flags
- [ ] Rollback plan documented
- [ ] Error monitoring in place
- [ ] Cleanup date scheduled (max 4 weeks)

**If any checkbox fails:** Don't launch, fix issue first

---

**TL;DR:** Feature flags are safe IF:
1. Limited to 2-3 at a time
2. Independent workflows (no interactions)
3. Safe defaults (false = old version)
4. Clean up within 4 weeks
5. Single team with git audit trail

We meet all 5 criteria. ✅ Safe to use!
