import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { prisma } from '@/lib/prisma';
import { mapActionToType, generateEntityUrl } from '@/lib/activity';

export const activityRouter = router({
  /**
   * Get activities for current user
   * Paginated and filterable by entity type
   */
  getActivities: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      entityType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) throw new Error('Not authenticated');

      // Use raw SQL to query activity_logs (not in Prisma schema)
      const activities = await prisma.$queryRaw<any[]>`
        SELECT id, user_id, studio_id, action, entity_type, entity_id, entity_name, details, created_at
        FROM public.activity_logs
        WHERE user_id = ${userId}::uuid
          ${input.entityType ? prisma.$queryRaw`AND entity_type = ${input.entityType}` : prisma.$queryRaw``}
        ORDER BY created_at DESC
        LIMIT ${input.limit}
        OFFSET ${input.offset}
      `;

      return {
        activities: activities.map(a => ({
          id: a.id,
          type: mapActionToType(a.action),
          actor: {
            id: userId,
            name: 'You',
          },
          action: a.action,
          target: {
            type: a.entity_type,
            id: a.entity_id || '',
            name: a.entity_name || '',
            url: generateEntityUrl(a.entity_type, a.entity_id),
          },
          timestamp: new Date(a.created_at).getTime(),
          metadata: a.details,
        })),
        hasMore: activities.length === input.limit,
      };
    }),

  /**
   * Log a new activity
   * Called by mutations to track user actions
   */
  logActivity: publicProcedure
    .input(z.object({
      action: z.string(),
      entityType: z.string(),
      entityId: z.string().optional(),
      entityName: z.string().optional(),
      details: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) throw new Error('Not authenticated');

      // Get studio_id from context if available
      const studioId = ctx.studioId;

      await prisma.$executeRaw`
        INSERT INTO public.activity_logs (user_id, studio_id, action, entity_type, entity_id, entity_name, details)
        VALUES (
          ${userId}::uuid,
          ${studioId || null}::uuid,
          ${input.action},
          ${input.entityType},
          ${input.entityId || null}::uuid,
          ${input.entityName || null},
          ${input.details ? JSON.stringify(input.details) : null}::jsonb
        )
      `;

      return { success: true };
    }),
});
