import { prisma } from './prisma';

interface LogActivityParams {
  userId: string;
  studioId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
}

/**
 * Log an activity to the activity_logs table
 * Uses raw SQL since activity_logs is not in Prisma schema
 */
export async function logActivity(params: LogActivityParams) {
  try {
    await prisma.$executeRaw`
      INSERT INTO public.activity_logs (user_id, studio_id, action, entity_type, entity_id, entity_name, details)
      VALUES (
        ${params.userId}::uuid,
        ${params.studioId || null}::uuid,
        ${params.action},
        ${params.entityType},
        ${params.entityId || null}::uuid,
        ${params.entityName || null},
        ${params.details ? JSON.stringify(params.details) : null}::jsonb
      )
    `;
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging should never block main operations
  }
}

/**
 * Map action string to activity type
 */
export function mapActionToType(action: string): 'create' | 'update' | 'delete' | 'approve' | 'reject' {
  if (action.includes('create')) return 'create';
  if (action.includes('update') || action.includes('edit')) return 'update';
  if (action.includes('delete') || action.includes('remove')) return 'delete';
  if (action.includes('approve')) return 'approve';
  if (action.includes('reject')) return 'reject';
  return 'update';
}

/**
 * Generate entity URL for linking in activity feed
 */
export function generateEntityUrl(entityType: string, entityId?: string): string | undefined {
  if (!entityId) return undefined;

  const urlMap: Record<string, string> = {
    'entry': `/dashboard/entries/${entityId}`,
    'dancer': `/dashboard/dancers/${entityId}`,
    'invoice': `/dashboard/invoices`,
    'reservation': `/dashboard/reservations`,
    'competition': `/dashboard/competitions/${entityId}`,
    'studio': `/dashboard/studios/${entityId}`,
  };

  return urlMap[entityType];
}
