## Task: Activity Feed Backend (Database + Mutation)

**Context:**
- Files:
  - Migration: prisma/migrations/YYYYMMDD_create_activity_logs/migration.sql
  - Backend: src/server/routers/activity.ts
- Feature: Track user actions for activity feed display
- UI: Already exists (ActivityFeed.tsx from previous session)

**Requirements:**
1. Database table for activity logs
2. tRPC router with getActivities query
3. Auto-logging of key actions (entry created, invoice paid, etc.)

**Deliverables:**
- Migration SQL file
- Complete activity.ts router
- Helper function to log activities

**Part 1: Database Migration**
```sql
-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  studio_id UUID REFERENCES studios(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_studio_id ON activity_logs(studio_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- RLS policies (enable row-level security)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can see their own activities
CREATE POLICY "Users can view own activities"
  ON activity_logs FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Studios can see their studio's activities
CREATE POLICY "Studios can view studio activities"
  ON activity_logs FOR SELECT
  USING (
    studio_id IN (
      SELECT id FROM studios WHERE owner_id = (SELECT auth.uid())
    )
  );

-- System can insert activity logs
CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**Part 2: Activity Router**
```typescript
// src/server/routers/activity.ts
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { prisma } from '@/lib/prisma';

export const activityRouter = router({
  getActivities: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      entityType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const activities = await prisma.activity_logs.findMany({
        where: {
          user_id: userId,
          ...(input.entityType && { entity_type: input.entityType }),
        },
        orderBy: {
          created_at: 'desc',
        },
        take: input.limit,
        skip: input.offset,
      });

      return {
        activities: activities.map(a => ({
          id: a.id,
          type: mapActionToType(a.action), // 'create' | 'update' | 'delete' etc.
          actor: {
            id: userId,
            name: ctx.session.user.name || 'You',
          },
          action: a.action,
          target: {
            type: a.entity_type,
            id: a.entity_id || '',
            name: a.entity_name || '',
            url: generateEntityUrl(a.entity_type, a.entity_id),
          },
          timestamp: a.created_at.getTime(),
          metadata: a.details,
        })),
        hasMore: activities.length === input.limit,
      };
    }),

  logActivity: publicProcedure
    .input(z.object({
      action: z.string(),
      entityType: z.string(),
      entityId: z.string().optional(),
      entityName: z.string().optional(),
      details: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      // Get studio_id if user is a studio director
      const profile = await prisma.user_profiles.findUnique({
        where: { id: userId },
        include: { studios: { select: { id: true } } },
      });

      const studioId = profile?.studios?.[0]?.id;

      await prisma.activity_logs.create({
        data: {
          user_id: userId,
          studio_id: studioId,
          action: input.action,
          entity_type: input.entityType,
          entity_id: input.entityId,
          entity_name: input.entityName,
          details: input.details,
        },
      });

      return { success: true };
    }),
});

// Helper: Map action to activity type
function mapActionToType(action: string): 'create' | 'update' | 'delete' | 'approve' | 'reject' {
  if (action.includes('create')) return 'create';
  if (action.includes('update') || action.includes('edit')) return 'update';
  if (action.includes('delete') || action.includes('remove')) return 'delete';
  if (action.includes('approve')) return 'approve';
  if (action.includes('reject')) return 'reject';
  return 'update';
}

// Helper: Generate entity URL
function generateEntityUrl(entityType: string, entityId?: string): string | undefined {
  if (!entityId) return undefined;

  const urlMap: Record<string, string> = {
    'entry': `/dashboard/entries/${entityId}`,
    'dancer': `/dashboard/dancers/${entityId}`,
    'invoice': `/dashboard/invoices`,
    'reservation': `/dashboard/reservations`,
  };

  return urlMap[entityType];
}
```

**Part 3: Helper for Auto-Logging**
```typescript
// src/lib/activity-logger.ts
import { prisma } from './prisma';

export async function logActivity(params: {
  userId: string;
  studioId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
}) {
  try {
    await prisma.activity_logs.create({
      data: params,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging should never block main operations
  }
}

// Usage example in entry.ts:
// await logActivity({
//   userId: ctx.session.user.id,
//   studioId: studioId,
//   action: 'created_entry',
//   entityType: 'entry',
//   entityId: entry.id,
//   entityName: input.routine_title,
//   details: { category: input.dance_category },
// });
```

**Actions to Log:**
- `created_entry`, `updated_entry`, `deleted_entry`
- `created_dancer`, `updated_dancer`
- `paid_invoice`, `sent_invoice`
- `created_reservation`, `approved_reservation`
- `uploaded_music`, `uploaded_document`

**Codex will**: Create migration + router + helper
**Claude will**: Apply migration, integrate router, add logging calls to existing mutations
