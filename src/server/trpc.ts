import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { user_role } from '@prisma/client';
import type { TenantData } from '@/lib/tenant-context';
import { logger } from '@/lib/logger';

/**
 * Context type for tRPC procedures
 */
export interface Context {
  userId: string | null;
  userRole: user_role | null;
  studioId: string | null;
  tenantId: string | null;
  tenantData: TenantData | null;
}

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Log tRPC errors (but filter out validation errors)
    const isValidationError = error.cause instanceof ZodError;
    const isAuthError = error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN';

    // Log non-validation, non-auth errors (actual bugs/issues)
    if (!isValidationError && !isAuthError) {
      logger.error('tRPC Error', {
        error: error.cause instanceof Error ? error.cause : new Error(error.message),
        code: error.code,
        message: error.message,
      });
    }

    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Authenticated procedure - requires user to be logged in
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

/**
 * Admin procedure - requires user to be competition director or super admin
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});
