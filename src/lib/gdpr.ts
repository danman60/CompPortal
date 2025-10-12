/**
 * GDPR Compliance Library
 * Implements data export and right-to-be-forgotten functionality
 */

import { prisma } from '@/lib/prisma';
import { logger } from './logger';

/**
 * User data export format
 */
export interface UserDataExport {
  personal_information: {
    user_id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    role: string | null;
    timezone: string | null;
    created_at: Date | null;
  };
  profile: {
    tenant_id: string | null;
    notification_preferences: any;
    two_factor_enabled: boolean | null;
  };
  studios: Array<{
    id: string;
    name: string;
    code: string | null;
    status: string | null;
    role: string;
  }>;
  dancers: Array<{
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: Date | null;
    created_at: Date | null;
  }>;
  entries: Array<{
    id: string;
    title: string;
    competition_name: string;
    status: string | null;
    created_at: Date | null;
  }>;
  reservations: Array<{
    id: string;
    competition_name: string;
    spaces_requested: number;
    status: string | null;
    created_at: Date | null;
  }>;
  invoices: Array<{
    id: string;
    competition_name: string;
    total: number;
    status: string;
    created_at: Date | null;
  }>;
  activity_logs: Array<{
    action: string;
    details: string | null;
    timestamp: Date;
  }>;
  metadata: {
    export_date: Date;
    export_version: string;
    format: 'json' | 'pdf';
  };
}

/**
 * Export all user data in GDPR-compliant format
 */
export async function exportUserData(userId: string): Promise<UserDataExport> {
  // Get user and profile
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      created_at: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const profile = await prisma.user_profiles.findUnique({
    where: { id: userId },
    select: {
      tenant_id: true,
      role: true,
      first_name: true,
      last_name: true,
      phone: true,
      timezone: true,
      notification_preferences: true,
      two_factor_enabled: true,
      created_at: true,
    },
  });

  // Get studios (owned or associated)
  const studioOwnership = await prisma.studios.findMany({
    where: { owner_id: userId },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
    },
  });

  const studios = studioOwnership.map((studio) => ({
    ...studio,
    role: 'owner',
  }));

  // Get dancers created by user's studio
  const dancers = await prisma.dancers.findMany({
    where: {
      studio_id: {
        in: studioOwnership.map((s) => s.id),
      },
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      date_of_birth: true,
      created_at: true,
    },
  });

  // Get entries from user's studios
  const entries = await prisma.competition_entries.findMany({
    where: {
      studio_id: {
        in: studioOwnership.map((s) => s.id),
      },
    },
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      competitions: {
        select: {
          name: true,
        },
      },
    },
  });

  // Get reservations
  const reservations = await prisma.reservations.findMany({
    where: {
      studio_id: {
        in: studioOwnership.map((s) => s.id),
      },
    },
    select: {
      id: true,
      spaces_requested: true,
      status: true,
      created_at: true,
      competitions: {
        select: {
          name: true,
        },
      },
    },
  });

  // Get invoices
  const invoices = await prisma.invoices.findMany({
    where: {
      studio_id: {
        in: studioOwnership.map((s) => s.id),
      },
    },
    select: {
      id: true,
      total: true,
      status: true,
      created_at: true,
      competitions: {
        select: {
          name: true,
        },
      },
    },
  });

  // Get activity logs (if exists)
  let activityLogs: any[] = [];
  try {
    activityLogs = await prisma.$queryRaw`
      SELECT action, details, timestamp
      FROM public.activity_logs
      WHERE user_id = ${userId}::uuid
      ORDER BY timestamp DESC
      LIMIT 1000
    `;
  } catch (error) {
    logger.warn('Activity logs table not found or query failed', { error: error instanceof Error ? error : new Error(String(error)) });
  }

  return {
    personal_information: {
      user_id: user.id,
      email: user.email || '',
      first_name: profile?.first_name || null,
      last_name: profile?.last_name || null,
      phone: profile?.phone || null,
      role: profile?.role || null,
      timezone: profile?.timezone || null,
      created_at: user.created_at,
    },
    profile: {
      tenant_id: profile?.tenant_id || null,
      notification_preferences: profile?.notification_preferences || {},
      two_factor_enabled: profile?.two_factor_enabled || false,
    },
    studios,
    dancers,
    entries: entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      competition_name: entry.competitions.name,
      status: entry.status,
      created_at: entry.created_at,
    })),
    reservations: reservations.map((res) => ({
      id: res.id,
      competition_name: res.competitions.name,
      spaces_requested: res.spaces_requested,
      status: res.status,
      created_at: res.created_at,
    })),
    invoices: invoices.map((inv) => ({
      id: inv.id,
      competition_name: inv.competitions.name,
      total: Number(inv.total),
      status: inv.status,
      created_at: inv.created_at,
    })),
    activity_logs: activityLogs.map((log: any) => ({
      action: log.action,
      details: log.details,
      timestamp: log.timestamp,
    })),
    metadata: {
      export_date: new Date(),
      export_version: '1.0',
      format: 'json',
    },
  };
}

/**
 * Deletion result
 */
export interface DeletionResult {
  success: boolean;
  deleted_records: {
    user_profiles: number;
    studios: number;
    dancers: number;
    entries: number;
    reservations: number;
    invoices: number;
    activity_logs: number;
    documents: number;
    email_logs: number;
    two_factor_audit: number;
  };
  error?: string;
}

/**
 * Permanently delete user and all associated data (GDPR Right to be Forgotten)
 *
 * IMPORTANT: This is irreversible. User will be completely removed from the system.
 */
export async function deleteUserData(userId: string): Promise<DeletionResult> {
  try {
    const deletionCounts = {
      user_profiles: 0,
      studios: 0,
      dancers: 0,
      entries: 0,
      reservations: 0,
      invoices: 0,
      activity_logs: 0,
      documents: 0,
      email_logs: 0,
      two_factor_audit: 0,
    };

    // Get user's studios
    const userStudios = await prisma.studios.findMany({
      where: { owner_id: userId },
      select: { id: true },
    });

    const studioIds = userStudios.map((s) => s.id);

    // Delete in correct order (respecting foreign key constraints)

    // 1. Delete documents
    if (studioIds.length > 0) {
      const docsResult = await prisma.documents.deleteMany({
        where: {
          OR: [
            { studio_id: { in: studioIds } },
            { uploaded_by: userId },
          ],
        },
      });
      deletionCounts.documents = docsResult.count;
    }

    // 2. Delete email logs
    if (studioIds.length > 0) {
      const emailResult = await prisma.email_logs.deleteMany({
        where: { studio_id: { in: studioIds } },
      });
      deletionCounts.email_logs = emailResult.count;
    }

    // 3. Delete invoices (entries will cascade)
    if (studioIds.length > 0) {
      const invoiceResult = await prisma.invoices.deleteMany({
        where: { studio_id: { in: studioIds } },
      });
      deletionCounts.invoices = invoiceResult.count;
    }

    // 4. Delete entries (entry_participants will cascade)
    if (studioIds.length > 0) {
      const entriesResult = await prisma.competition_entries.deleteMany({
        where: { studio_id: { in: studioIds } },
      });
      deletionCounts.entries = entriesResult.count;
    }

    // 5. Delete reservations
    if (studioIds.length > 0) {
      const reservationsResult = await prisma.reservations.deleteMany({
        where: { studio_id: { in: studioIds } },
      });
      deletionCounts.reservations = reservationsResult.count;
    }

    // 6. Delete dancers
    if (studioIds.length > 0) {
      const dancersResult = await prisma.dancers.deleteMany({
        where: { studio_id: { in: studioIds } },
      });
      deletionCounts.dancers = dancersResult.count;
    }

    // 7. Delete studios
    if (studioIds.length > 0) {
      const studiosResult = await prisma.studios.deleteMany({
        where: { id: { in: studioIds } },
      });
      deletionCounts.studios = studiosResult.count;
    }

    // 8. Delete activity logs
    try {
      const activityResult = await prisma.$executeRaw`
        DELETE FROM public.activity_logs
        WHERE user_id = ${userId}::uuid
      `;
      deletionCounts.activity_logs = Number(activityResult);
    } catch (error) {
      logger.warn('Activity logs deletion failed (table may not exist)', { error: error instanceof Error ? error : new Error(String(error)) });
    }

    // 9. Delete 2FA audit logs
    try {
      const twoFactorResult = await prisma.$executeRaw`
        DELETE FROM public.two_factor_audit_log
        WHERE user_id = ${userId}::uuid
      `;
      deletionCounts.two_factor_audit = Number(twoFactorResult);
    } catch (error) {
      logger.warn('2FA audit logs deletion failed (table may not exist)', { error: error instanceof Error ? error : new Error(String(error)) });
    }

    // 10. Delete user profile (will cascade to some relations)
    const profileResult = await prisma.user_profiles.delete({
      where: { id: userId },
    });
    deletionCounts.user_profiles = 1;

    // 11. Finally, delete user from auth schema (Supabase handles this)
    // We don't delete from auth.users directly - Supabase admin API should be used
    // Or user account deletion should be initiated from Supabase dashboard

    return {
      success: true,
      deleted_records: deletionCounts,
    };
  } catch (error: any) {
    logger.error('User data deletion failed', { error: error instanceof Error ? error : new Error(String(error)) });
    return {
      success: false,
      deleted_records: {
        user_profiles: 0,
        studios: 0,
        dancers: 0,
        entries: 0,
        reservations: 0,
        invoices: 0,
        activity_logs: 0,
        documents: 0,
        email_logs: 0,
        two_factor_audit: 0,
      },
      error: error.message,
    };
  }
}

/**
 * Get summary of user data (for deletion preview)
 */
export async function getUserDataSummary(userId: string) {
  const userStudios = await prisma.studios.findMany({
    where: { owner_id: userId },
    select: { id: true },
  });

  const studioIds = userStudios.map((s) => s.id);

  const counts = {
    studios: userStudios.length,
    dancers: 0,
    entries: 0,
    reservations: 0,
    invoices: 0,
  };

  if (studioIds.length > 0) {
    counts.dancers = await prisma.dancers.count({
      where: { studio_id: { in: studioIds } },
    });

    counts.entries = await prisma.competition_entries.count({
      where: { studio_id: { in: studioIds } },
    });

    counts.reservations = await prisma.reservations.count({
      where: { studio_id: { in: studioIds } },
    });

    counts.invoices = await prisma.invoices.count({
      where: { studio_id: { in: studioIds } },
    });
  }

  return counts;
}

/**
 * Format user data export as JSON string (pretty-printed)
 */
export function formatAsJSON(data: UserDataExport): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Convert user data export to CSV format
 * (Simplified version - only includes basic info)
 */
export function formatAsCSV(data: UserDataExport): string {
  let csv = '';

  // Personal Information
  csv += 'Personal Information\n';
  csv += 'Field,Value\n';
  csv += `User ID,${data.personal_information.user_id}\n`;
  csv += `Email,${data.personal_information.email}\n`;
  csv += `First Name,${data.personal_information.first_name || ''}\n`;
  csv += `Last Name,${data.personal_information.last_name || ''}\n`;
  csv += `Phone,${data.personal_information.phone || ''}\n`;
  csv += `Role,${data.personal_information.role || ''}\n`;
  csv += `Created At,${data.personal_information.created_at}\n`;
  csv += '\n';

  // Studios
  csv += 'Studios\n';
  csv += 'ID,Name,Code,Status,Role\n';
  data.studios.forEach((studio) => {
    csv += `${studio.id},${studio.name},${studio.code || ''},${studio.status || ''},${studio.role}\n`;
  });
  csv += '\n';

  // Dancers
  csv += 'Dancers\n';
  csv += 'ID,First Name,Last Name,Date of Birth,Created At\n';
  data.dancers.forEach((dancer) => {
    csv += `${dancer.id},${dancer.first_name},${dancer.last_name},${dancer.date_of_birth || ''},${dancer.created_at}\n`;
  });
  csv += '\n';

  // Entries
  csv += 'Competition Entries\n';
  csv += 'ID,Title,Competition,Status,Created At\n';
  data.entries.forEach((entry) => {
    csv += `${entry.id},${entry.title},${entry.competition_name},${entry.status || ''},${entry.created_at}\n`;
  });
  csv += '\n';

  return csv;
}

/**
 * Log GDPR action for audit trail
 */
export async function logGDPRAction(
  userId: string,
  action: 'export' | 'delete_request' | 'delete_confirmed',
  details?: string
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO public.activity_logs (user_id, action, details, timestamp)
      VALUES (${userId}::uuid, ${`gdpr_${action}`}, ${details || null}, NOW())
    `;
  } catch (error) {
    logger.error('Failed to log GDPR action', { error: error instanceof Error ? error : new Error(String(error)) });
    // Don't throw - logging failure shouldn't block GDPR operations
  }
}
