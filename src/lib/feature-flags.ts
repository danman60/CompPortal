/**
 * Feature Flags System
 *
 * Purpose: Control feature visibility by role for testing/demo before public launch
 *
 * Usage:
 * 1. Add feature key to FEATURES constant
 * 2. Configure allowed roles in FEATURE_CONFIG
 * 3. Use isFeatureEnabled() to check access
 * 4. When ready to launch: Add 'studio_director' to roles array
 *
 * Example:
 * ```typescript
 * import { FEATURES, isFeatureEnabled } from '@/lib/feature-flags';
 * import { useUser } from '@/lib/hooks/useUser';
 *
 * const { user } = useUser();
 * const canSeeNewFeature = isFeatureEnabled(FEATURES.NEW_ROUTINE_PAGE, user.role);
 *
 * if (canSeeNewFeature) {
 *   return <NewRoutinePage />;
 * }
 * ```
 */

export const FEATURES = {
  // Routine Creation Features
  NEW_ROUTINE_PAGE: 'new-routine-page',
  ROUTINE_VIDEO_UPLOAD: 'routine-video-upload',
  MUSIC_FILE_ATTACH: 'music-file-attach',

  // Approval System Features
  APPROVAL_SYSTEM_V2: 'approval-system-v2',
  BULK_APPROVAL: 'bulk-approval',

  // Future Features (placeholders)
  ADVANCED_SCHEDULING: 'advanced-scheduling',
  SCORE_ENTRY: 'score-entry',
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

interface FeatureConfig {
  roles: string[];
  description: string;
  status: 'testing' | 'beta' | 'released';
  allowedUserIds?: string[]; // Optional: specific user IDs that can access regardless of role
}

/**
 * Feature Configuration
 *
 * Roles:
 * - 'super_admin': Developer (always has access for testing)
 * - 'competition_director': Client (can demo features)
 * - 'studio_director': End users (add when ready to launch)
 *
 * User-Specific Access:
 * - allowedUserIds: Array of user IDs that can access feature regardless of role
 * - Useful for beta testing with specific users
 */
const FEATURE_CONFIG: Record<FeatureKey, FeatureConfig> = {
  // NEW ROUTINE CREATION PAGE
  // Status: Released for all users
  [FEATURES.NEW_ROUTINE_PAGE]: {
    roles: ['super_admin', 'competition_director', 'studio_director'],
    allowedUserIds: [],
    description: 'New routine creation page with improved UX and validation',
    status: 'released',
  },

  // ROUTINE VIDEO UPLOAD
  // Status: Development, SA only
  [FEATURES.ROUTINE_VIDEO_UPLOAD]: {
    roles: ['super_admin'],
    description: 'Allow video uploads for routine entries',
    status: 'testing',
  },

  // MUSIC FILE ATTACHMENT
  // Status: Development, SA only
  [FEATURES.MUSIC_FILE_ATTACH]: {
    roles: ['super_admin'],
    description: 'Attach music files to routine entries',
    status: 'testing',
  },

  // APPROVAL SYSTEM V2
  // Status: Testing with SA + CD, hidden from SD
  [FEATURES.APPROVAL_SYSTEM_V2]: {
    roles: ['super_admin', 'competition_director'],
    description: 'Improved approval workflow with better validation and feedback',
    status: 'testing',
  },

  // BULK APPROVAL
  // Status: Development, SA + CD only
  [FEATURES.BULK_APPROVAL]: {
    roles: ['super_admin', 'competition_director'],
    description: 'Approve multiple reservations at once',
    status: 'testing',
  },

  // ADVANCED SCHEDULING
  // Status: Future, SA only
  [FEATURES.ADVANCED_SCHEDULING]: {
    roles: ['super_admin'],
    description: 'Advanced event scheduling tools',
    status: 'testing',
  },

  // SCORE ENTRY
  // Status: Future, SA + CD only
  [FEATURES.SCORE_ENTRY]: {
    roles: ['super_admin', 'competition_director'],
    description: 'Score entry interface for judges',
    status: 'testing',
  },
};

/**
 * Check if a feature is enabled for a given user role
 *
 * @param featureKey - Feature to check (use FEATURES constants)
 * @param userRole - User's role (super_admin, competition_director, studio_director)
 * @param userId - Optional user ID for user-specific overrides
 * @returns true if feature is enabled for this role
 */
export const isFeatureEnabled = (
  featureKey: FeatureKey,
  userRole: string,
  userId?: string
): boolean => {
  const config = FEATURE_CONFIG[featureKey];

  if (!config) {
    console.warn(`[FeatureFlags] Unknown feature key: ${featureKey}`);
    return false;
  }

  // Check if user ID is specifically allowed (regardless of role)
  if (userId && config.allowedUserIds?.includes(userId)) {
    return true;
  }

  // Check if role is in allowed list
  const isAllowed = config.roles.includes(userRole);

  return isAllowed;
};

/**
 * Get all feature flags for a user (useful for debugging)
 *
 * @param userRole - User's role
 * @returns Object with all feature flags and their status
 */
export const getAllFeatureFlags = (userRole: string): Record<string, boolean> => {
  const flags: Record<string, boolean> = {};

  Object.entries(FEATURES).forEach(([key, featureKey]) => {
    flags[key] = isFeatureEnabled(featureKey, userRole);
  });

  return flags;
};

/**
 * Get feature configuration (for admin UI)
 *
 * @returns All feature configurations
 */
export const getFeatureConfig = (): Record<FeatureKey, FeatureConfig> => {
  return FEATURE_CONFIG;
};

/**
 * Helper: Check if any features are enabled for a role
 * Useful for showing/hiding entire sections
 */
export const hasAnyFeatures = (userRole: string, features: FeatureKey[]): boolean => {
  return features.some(feature => isFeatureEnabled(feature, userRole));
};

/**
 * Helper: Check if ALL features are enabled for a role
 */
export const hasAllFeatures = (userRole: string, features: FeatureKey[]): boolean => {
  return features.every(feature => isFeatureEnabled(feature, userRole));
};
