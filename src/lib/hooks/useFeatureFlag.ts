/**
 * Feature Flags - Simple Re-Export
 *
 * Use directly in server components, tRPC procedures, or anywhere you have user role.
 * No React hooks needed - just pass the role directly.
 *
 * Usage Examples:
 *
 * 1. In Server Component:
 * ```typescript
 * import { FEATURES, isFeatureEnabled } from '@/lib/hooks/useFeatureFlag';
 *
 * export default async function Page() {
 *   const userRole = 'competition_director'; // from your auth
 *   const canSee = isFeatureEnabled(FEATURES.NEW_ROUTINE_PAGE, userRole);
 *
 *   if (canSee) return <NewVersion />;
 *   return <OldVersion />;
 * }
 * ```
 *
 * 2. In tRPC Procedure:
 * ```typescript
 * import { FEATURES, isFeatureEnabled } from '@/lib/hooks/useFeatureFlag';
 *
 * .query(async ({ ctx }) => {
 *   if (!isFeatureEnabled(FEATURES.NEW_ROUTINE_PAGE, ctx.userRole)) {
 *     throw new TRPCError({ code: 'FORBIDDEN' });
 *   }
 *   // ... proceed
 * })
 * ```
 *
 * 3. For Client Components (when you have user role from props/context):
 * ```typescript
 * 'use client';
 * import { FEATURES, isFeatureEnabled } from '@/lib/hooks/useFeatureFlag';
 *
 * export function MyComponent({ userRole }: { userRole: string }) {
 *   const canSee = isFeatureEnabled(FEATURES.NEW_ROUTINE_PAGE, userRole);
 *   // ... render based on canSee
 * }
 * ```
 */

import {
  FEATURES,
  isFeatureEnabled,
  getAllFeatureFlags,
  hasAnyFeatures,
  hasAllFeatures,
  type FeatureKey,
} from '@/lib/feature-flags';

// Re-export everything for convenience
export {
  FEATURES,
  isFeatureEnabled,
  getAllFeatureFlags,
  hasAnyFeatures,
  hasAllFeatures,
  type FeatureKey,
};
