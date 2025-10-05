/**
 * Authentication and authorization utility functions
 */

export type UserRole = 'super_admin' | 'competition_director' | 'studio_director';

/**
 * Check if a role is a studio director
 */
export function isStudioDirector(role: UserRole | string | null | undefined): boolean {
  return role === 'studio_director';
}

/**
 * Check if a role is a competition director
 */
export function isCompetitionDirector(role: UserRole | string | null | undefined): boolean {
  return role === 'competition_director';
}

/**
 * Check if a role is a super admin
 */
export function isSuperAdmin(role: UserRole | string | null | undefined): boolean {
  return role === 'super_admin';
}

/**
 * Check if a role has admin privileges (CD or SA)
 */
export function isAdmin(role: UserRole | string | null | undefined): boolean {
  return isCompetitionDirector(role) || isSuperAdmin(role);
}
