import { user_role } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export type UserRole = user_role;

/**
 * Permission helper to check if user has required role
 */
export function hasRole(userRole: UserRole | null | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

/**
 * Permission helper to check if user is studio director
 */
export function isStudioDirector(userRole: UserRole | null | undefined): boolean {
  return userRole === 'studio_director';
}

/**
 * Permission helper to check if user is competition director
 */
export function isCompetitionDirector(userRole: UserRole | null | undefined): boolean {
  return userRole === 'competition_director';
}

/**
 * Permission helper to check if user is super admin
 */
export function isSuperAdmin(userRole: UserRole | null | undefined): boolean {
  return userRole === 'super_admin';
}

/**
 * Permission helper to check if user has admin privileges (competition director or super admin)
 */
export function isAdmin(userRole: UserRole | null | undefined): boolean {
  return hasRole(userRole, ['competition_director', 'super_admin']);
}

/**
 * Throws UNAUTHORIZED error if user doesn't have required role
 */
export function requireRole(userRole: UserRole | null | undefined, allowedRoles: UserRole[], message?: string) {
  if (!hasRole(userRole, allowedRoles)) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: message || `Required role: ${allowedRoles.join(' or ')}`,
    });
  }
}

/**
 * Throws UNAUTHORIZED error if user is not admin
 */
export function requireAdmin(userRole: UserRole | null | undefined, message?: string) {
  if (!isAdmin(userRole)) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: message || 'Admin access required',
    });
  }
}
