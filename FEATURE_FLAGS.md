# Feature Flags System

**Created:** November 4, 2025
**Purpose:** Control feature visibility by role for safe testing/demo before public launch

---

## 🎯 Overview

**Problem:** You want to test and demo new features on production (routine creation, approval system) with CDs without SDs seeing incomplete work.

**Solution:** Role-based feature flags that hide/show features based on user role.

**Current Active Flags:**
- `NEW_ROUTINE_PAGE` - New routine creation with improved UX (SA + CD only)
- `APPROVAL_SYSTEM_V2` - Improved approval workflow (SA + CD only)

---

## 🚀 Quick Start

### For Developers (Adding New Feature Flag)

**1. Add feature key to `src/lib/feature-flags.ts`:**
```typescript
export const FEATURES = {
  MY_NEW_FEATURE: 'my-new-feature',
  // ... other features
} as const;
```

**2. Configure allowed roles:**
```typescript
const FEATURE_CONFIG = {
  [FEATURES.MY_NEW_FEATURE]: {
    roles: ['super_admin', 'competition_director'], // Who can see it
    description: 'Description of what this feature does',
    status: 'testing', // or 'beta' or 'released'
  },
};
```

**3. Use in component:**
```typescript
import { useFeatureFlag, FEATURES } from '@/lib/hooks/useFeatureFlag';

function MyComponent() {
  const { isEnabled } = useFeatureFlag(FEATURES.MY_NEW_FEATURE);

  if (!isEnabled) {
    return <OldVersion />; // SD sees this
  }

  return <NewVersion />; // SA + CD see this
}
```

---

## 📋 Current Feature Flags

### 🎬 Routine Creation Features

#### `NEW_ROUTINE_PAGE`
**Status:** 🧪 Testing
**Visible To:** Super Admin, Competition Director
**Hidden From:** Studio Director
**Description:** New routine creation page with improved validation, better UX, and enhanced workflow
**Use Case:** Demo to CDs, test with SA, before opening to all studios
**Launch Plan:** Add `studio_director` to roles array on Nov 8 launch

---

#### `ROUTINE_VIDEO_UPLOAD`
**Status:** 🚧 Development
**Visible To:** Super Admin only
**Description:** Allow video uploads for routine entries
**Use Case:** Development in progress, SA testing only
**Launch Plan:** TBD (post-launch enhancement)

---

#### `MUSIC_FILE_ATTACH`
**Status:** 🚧 Development
**Visible To:** Super Admin only
**Description:** Attach music files to routine entries
**Use Case:** Development in progress, SA testing only
**Launch Plan:** TBD (post-launch enhancement)

---

### ✅ Approval System Features

#### `APPROVAL_SYSTEM_V2`
**Status:** 🧪 Testing
**Visible To:** Super Admin, Competition Director
**Description:** Improved reservation approval workflow with better validation and real-time feedback
**Use Case:** Test and demo improved approval process to CDs
**Launch Plan:** Monitor CD feedback, refine, then mark as released

---

#### `BULK_APPROVAL`
**Status:** 🧪 Testing
**Visible To:** Super Admin, Competition Director
**Description:** Approve multiple reservations at once
**Use Case:** CD efficiency improvement, test before release
**Launch Plan:** TBD based on CD feedback

---

### 🔮 Future Features (Placeholders)

#### `ADVANCED_SCHEDULING`
**Status:** 🔮 Future
**Visible To:** Super Admin only
**Description:** Advanced event scheduling tools
**Use Case:** Reserved for Phase 2

---

#### `SCORE_ENTRY`
**Status:** 🔮 Future
**Visible To:** Super Admin, Competition Director
**Description:** Score entry interface for judges
**Use Case:** Reserved for Phase 2

---

## 💻 Implementation Examples

### Example 1: Conditional Page Rendering

```typescript
// src/app/dashboard/entries/create/page.tsx
import { useFeatureFlag, FEATURES } from '@/lib/hooks/useFeatureFlag';
import NewRoutineCreationPage from '@/components/NewRoutineCreationPage';
import OldRoutineCreationPage from '@/components/OldRoutineCreationPage';

export default function CreateEntryPage() {
  const { isEnabled, loading } = useFeatureFlag(FEATURES.NEW_ROUTINE_PAGE);

  if (loading) {
    return <PageLoader />;
  }

  // SDs see old version, SA + CD see new version
  if (isEnabled) {
    return <NewRoutineCreationPage />;
  }

  return <OldRoutineCreationPage />;
}
```

---

### Example 2: Conditional Feature in Existing Component

```typescript
// src/components/RoutineForm.tsx
import { useFeatureFlag, FEATURES } from '@/lib/hooks/useFeatureFlag';

export function RoutineForm() {
  const { isEnabled: showVideoUpload } = useFeatureFlag(FEATURES.ROUTINE_VIDEO_UPLOAD);

  return (
    <form>
      <TitleInput /> {/* Always visible */}
      <CategoryDropdown /> {/* Always visible */}

      {/* Only SA sees this new feature */}
      {showVideoUpload && (
        <VideoUploadField />
      )}

      <SubmitButton />
    </form>
  );
}
```

---

### Example 3: Conditional Route/Link

```typescript
// src/components/Navigation.tsx
import { useFeatureFlag, FEATURES } from '@/lib/hooks/useFeatureFlag';
import Link from 'next/link';

export function Navigation() {
  const { isEnabled: showNewApproval } = useFeatureFlag(FEATURES.APPROVAL_SYSTEM_V2);

  return (
    <nav>
      {/* SD sees old approval page */}
      {!showNewApproval && (
        <Link href="/dashboard/approvals">Approvals</Link>
      )}

      {/* SA + CD see new approval page */}
      {showNewApproval && (
        <Link href="/dashboard/approvals-v2">Approvals (New)</Link>
      )}
    </nav>
  );
}
```

---

### Example 4: Multiple Features Check

```typescript
// src/app/dashboard/admin/page.tsx
import { useAllFeatures, FEATURES } from '@/lib/hooks/useFeatureFlag';

export function AdminDashboard() {
  // Check if user has ALL admin features
  const hasAllAdminFeatures = useAllFeatures([
    FEATURES.BULK_APPROVAL,
    FEATURES.ADVANCED_SCHEDULING,
  ]);

  if (hasAllAdminFeatures) {
    return <FullAdminDashboard />;
  }

  return <LimitedAdminDashboard />;
}
```

---

## 🎮 Testing on Production

### As Super Admin:
1. Login with `danieljohnabrahamson@gmail.com` / `123456`
2. Navigate to flagged features
3. ✅ You should see ALL new features
4. Test functionality end-to-end

### As Competition Director:
1. Login with `empwrdance@gmail.com` / `1CompSyncLogin!`
2. Navigate to flagged features
3. ✅ You should see NEW_ROUTINE_PAGE and APPROVAL_SYSTEM_V2
4. ❌ You should NOT see ROUTINE_VIDEO_UPLOAD or MUSIC_FILE_ATTACH
5. Demo features to client

### As Studio Director:
1. Login with test SD account
2. Navigate to entry creation
3. ❌ You should see OLD version only
4. ❌ No new features visible

---

## 🚀 Launch Workflow

### Phase 1: Testing (Current)
```typescript
roles: ['super_admin', 'competition_director']
```
- SA tests functionality
- CD demos and provides feedback
- SD doesn't see anything yet

---

### Phase 2: Beta Testing (Optional)
```typescript
roles: ['super_admin', 'competition_director', 'test-studio-id-123']
```
- Enable for specific test studios
- Gather feedback from real users
- Fix issues before full launch

---

### Phase 3: Full Launch
```typescript
roles: ['super_admin', 'competition_director', 'studio_director']
```
- Add `studio_director` to roles array
- Commit and deploy
- Feature now visible to everyone

---

### Phase 4: Cleanup (Optional)
Once feature is stable and released:
1. Remove feature flag checks from code
2. Delete old version components
3. Remove feature key from FEATURE_CONFIG
4. Deploy cleaned-up code

---

## 🔧 Admin Debug Panel (Optional)

Create a debug panel to see all feature flags:

```typescript
// src/app/dashboard/admin/feature-flags/page.tsx
import { useAllFeatureFlags } from '@/lib/hooks/useFeatureFlag';
import { getFeatureConfig } from '@/lib/feature-flags';

export default function FeatureFlagsDebugPage() {
  const flags = useAllFeatureFlags();
  const config = getFeatureConfig();

  return (
    <div>
      <h1>Feature Flags Status</h1>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Enabled for You</th>
            <th>Status</th>
            <th>Allowed Roles</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(config).map(([key, cfg]) => (
            <tr key={key}>
              <td>{cfg.description}</td>
              <td>{flags[key] ? '✅ Yes' : '❌ No'}</td>
              <td>{cfg.status}</td>
              <td>{cfg.roles.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## ⚠️ Important Notes

### DO:
- ✅ Use feature flags for incomplete/testing features
- ✅ Test with multiple roles before launch
- ✅ Document what each flag controls
- ✅ Clean up flags after features are stable
- ✅ Use meaningful feature key names

### DON'T:
- ❌ Use flags for critical security features (use RLS instead)
- ❌ Create too many nested flag checks (hard to maintain)
- ❌ Leave old code around forever (clean up after launch)
- ❌ Forget to test with all role combinations
- ❌ Use flags for A/B testing (this is for phased rollouts)

---

## 🗓️ Launch Schedule

### Week 1 (Nov 4-8): Testing Phase
- **NEW_ROUTINE_PAGE:** SA + CD testing and demo
- **APPROVAL_SYSTEM_V2:** SA + CD testing
- **Status:** Hidden from SDs

### Week 2 (Nov 8+): Routine Creation Launch
- **NEW_ROUTINE_PAGE:** Add `studio_director` to roles
- **Status:** Visible to everyone

### Week 3+: Post-Launch
- Monitor feedback on new features
- Plan next feature rollouts using same system
- Clean up flags for stable features

---

## 📊 Current Status Summary

| Feature | SA | CD | SD | Status | Launch Date |
|---------|----|----|----|---------| ------------|
| NEW_ROUTINE_PAGE | ✅ | ✅ | ❌ | Testing | Nov 8 |
| APPROVAL_SYSTEM_V2 | ✅ | ✅ | ❌ | Testing | TBD |
| ROUTINE_VIDEO_UPLOAD | ✅ | ❌ | ❌ | Dev | TBD |
| MUSIC_FILE_ATTACH | ✅ | ❌ | ❌ | Dev | TBD |
| BULK_APPROVAL | ✅ | ✅ | ❌ | Testing | TBD |

---

## 🔗 Related Files

- `src/lib/feature-flags.ts` - Feature flag configuration
- `src/lib/hooks/useFeatureFlag.ts` - React hook for components
- `PROCESS_IMPROVEMENTS.md` - Original feature flag recommendation

---

**Questions?** See examples above or check existing usage in codebase.
**To Launch a Feature:** Just add `'studio_director'` to the roles array and deploy!
