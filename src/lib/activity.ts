import { prisma } from './prisma';
import { logger } from './logger';

interface LogActivityParams {
  userId: string;
  tenantId?: string;
  studioId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
  ipAddress?: string; // Security: Track IP for audit trail
}

/**
 * Log an activity to the activity_logs table
 * Uses raw SQL since activity_logs is not in Prisma schema
 *
 * @param params - Activity details including IP address for security audit
 */
export async function logActivity(params: LogActivityParams) {
  try {
    // Get tenant_id from studio if not provided
    let tenantId = params.tenantId;
    if (!tenantId && params.studioId) {
      const studio = await prisma.studios.findUnique({
        where: { id: params.studioId },
        select: { tenant_id: true },
      });
      tenantId = studio?.tenant_id;
    }

    // If still no tenant_id, get from user profile
    if (!tenantId) {
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: params.userId },
        select: { tenant_id: true },
      });
      tenantId = userProfile?.tenant_id || undefined;
    }

    // Throw error if tenant_id is still missing (required by table schema)
    if (!tenantId) {
      throw new Error(`Cannot log activity: tenant_id is required but could not be determined for user ${params.userId}`);
    }

    await prisma.$executeRaw`
      INSERT INTO public.activity_logs (user_id, tenant_id, studio_id, action, entity_type, entity_id, entity_name, details, ip_address)
      VALUES (
        ${params.userId}::uuid,
        ${tenantId}::uuid,
        ${params.studioId || null}::uuid,
        ${params.action},
        ${params.entityType},
        ${params.entityId || null}::uuid,
        ${params.entityName || null},
        ${params.details ? JSON.stringify(params.details) : null}::jsonb,
        ${params.ipAddress || null}
      )
    `;
  } catch (error) {
    logger.error('Failed to log activity', { error: error instanceof Error ? error : new Error(String(error)) });
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

/**
 * Extract IP address from request headers
 * Checks common proxy headers first (X-Forwarded-For, X-Real-IP)
 *
 * @param headers - Next.js request headers
 * @returns IP address or undefined if not found
 */
export function extractIpAddress(headers: Headers | Record<string, string | string[] | undefined>): string | undefined {
  // Check if headers is a Headers object or plain object
  const getHeader = (key: string): string | undefined => {
    if (headers instanceof Headers) {
      return headers.get(key) || undefined;
    }
    const value = headers[key];
    return Array.isArray(value) ? value[0] : value;
  };

  // Check X-Forwarded-For (most common proxy header)
  const forwarded = getHeader('x-forwarded-for');
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, first is client
    return forwarded.split(',')[0].trim();
  }

  // Check X-Real-IP (alternative proxy header)
  const realIp = getHeader('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Check CF-Connecting-IP (Cloudflare)
  const cfIp = getHeader('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  // Fallback to direct connection IP
  const remoteAddr = getHeader('x-forwarded-host');
  return remoteAddr?.trim();
}
