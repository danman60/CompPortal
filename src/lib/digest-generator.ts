import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export type DigestContent = {
  userId: string;
  userEmail: string;
  userName: string;
  tenantId: string;
  tenantName: string;
  pendingActions: {
    classificationRequests: Array<{
      id: string;
      entryTitle: string;
      studioName: string;
      requestedClassification: string;
      submittedAt: Date;
    }>;
    reservationReviews: Array<{
      id: string;
      studioName: string;
      competitionName: string;
      entriesRequested: number;
      submittedAt: Date;
    }>;
  };
  upcomingEvents: Array<{
    id: string;
    name: string;
    startDate: Date;
    daysUntil: number;
  }>;
  recentActivity: Array<{
    action: string;
    description: string;
    timestamp: Date;
  }>;
  summary: {
    totalPendingActions: number;
    totalUpcomingEvents: number;
    totalRecentActivity: number;
  };
};

/**
 * Generate digest content for a Competition Director
 * Compiles pending actions, upcoming events, and recent activity
 */
export async function generateDigestForUser(
  userId: string,
  preferences: {
    includeActivities: boolean;
    includeUpcomingEvents: boolean;
    includePendingActions: boolean;
    minimumActivityCount: number;
  }
): Promise<DigestContent | null> {
  try {
    // Get user profile with tenant
    const userProfile = await prisma.user_profiles.findUnique({
      where: { id: userId },
      include: {
        tenants: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!userProfile || userProfile.role !== 'competition_director') {
      logger.warn('Digest generation skipped: user not a Competition Director', { userId });
      return null;
    }

    const userEmail = await getUserEmail(userId);
    if (!userEmail) {
      logger.warn('Digest generation skipped: no email found', { userId });
      return null;
    }

    const tenantId = userProfile.tenant_id || '';
    const content: DigestContent = {
      userId,
      userEmail,
      userName: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Competition Director',
      tenantId,
      tenantName: userProfile.tenants?.name || 'CompSync',
      pendingActions: {
        classificationRequests: [],
        reservationReviews: [],
      },
      upcomingEvents: [],
      recentActivity: [],
      summary: {
        totalPendingActions: 0,
        totalUpcomingEvents: 0,
        totalRecentActivity: 0,
      },
    };

    // 1. Pending Classification Exception Requests
    if (preferences.includePendingActions) {
      const classificationRequests = await prisma.classification_exception_requests.findMany({
        where: {
          tenant_id: tenantId,
          status: 'pending',
        },
        include: {
          competition_entries: {
            select: {
              title: true,
              studios: {
                select: {
                  name: true,
                },
              },
            },
          },
          classifications_classification_exception_requests_requested_classification_idToclassifications: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          created_at: 'asc',
        },
        take: 20,
      });

      content.pendingActions.classificationRequests = classificationRequests.map((req) => ({
        id: req.id,
        entryTitle: req.competition_entries.title,
        studioName: req.competition_entries.studios.name,
        requestedClassification:
          req.classifications_classification_exception_requests_requested_classification_idToclassifications?.name ||
          'Unknown',
        submittedAt: req.created_at!,
      }));
    }

    // 2. Pending Reservation Reviews
    if (preferences.includePendingActions) {
      const reservationReviews = await prisma.reservations.findMany({
        where: {
          tenant_id: tenantId,
          status: 'pending',
        },
        include: {
          studios: {
            select: {
              name: true,
            },
          },
          competitions: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          created_at: 'asc',
        },
        take: 20,
      });

      content.pendingActions.reservationReviews = reservationReviews.map((res) => ({
        id: res.id,
        studioName: res.studios.name,
        competitionName: res.competitions.name,
        entriesRequested: res.spaces_requested,
        submittedAt: res.created_at!,
      }));
    }

    // 3. Upcoming Events (next 30 days)
    if (preferences.includeUpcomingEvents) {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const upcomingCompetitions = await prisma.competitions.findMany({
        where: {
          tenant_id: tenantId,
          competition_start_date: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
          status: { not: 'cancelled' },
        },
        orderBy: {
          competition_start_date: 'asc',
        },
        take: 10,
      });

      content.upcomingEvents = upcomingCompetitions.map((comp) => {
        const startDate = new Date(comp.competition_start_date!);
        const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: comp.id,
          name: comp.name,
          startDate,
          daysUntil,
        };
      });
    }

    // 4. Recent Activity (last 7 days)
    if (preferences.includeActivities) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentLogs = await prisma.activity_logs.findMany({
        where: {
          tenant_id: tenantId,
          created_at: {
            gte: sevenDaysAgo,
          },
          action: {
            in: [
              'reservation.submit',
              'reservation.approve',
              'reservation.adjust',
              'classification.request',
              'classification.approve',
              'invoice.send',
              'invoice.markAsPaid',
            ],
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 15,
      });

      content.recentActivity = recentLogs.map((log) => ({
        action: log.action,
        description: formatActivityDescription(log.action, log.details as any),
        timestamp: log.created_at!,
      }));
    }

    // Calculate summary
    content.summary = {
      totalPendingActions:
        content.pendingActions.classificationRequests.length +
        content.pendingActions.reservationReviews.length,
      totalUpcomingEvents: content.upcomingEvents.length,
      totalRecentActivity: content.recentActivity.length,
    };

    // Check minimum activity threshold
    const totalItems =
      content.summary.totalPendingActions +
      content.summary.totalUpcomingEvents +
      content.summary.totalRecentActivity;

    if (totalItems < preferences.minimumActivityCount) {
      logger.info('Digest generation skipped: below minimum activity threshold', {
        userId,
        totalItems,
        minimumRequired: preferences.minimumActivityCount,
      });
      return null;
    }

    return content;
  } catch (error) {
    logger.error('Failed to generate digest content', {
      error: error instanceof Error ? error : new Error(String(error)),
      userId,
    });
    return null;
  }
}

/**
 * Get user email from Supabase auth
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase-server');
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) {
      logger.error('Failed to fetch user email', { error, userId });
      return null;
    }
    return data.user?.email || null;
  } catch (error) {
    logger.error('Failed to fetch user email', {
      error: error instanceof Error ? error : new Error(String(error)),
      userId,
    });
    return null;
  }
}

/**
 * Format activity log into human-readable description
 */
function formatActivityDescription(action: string, details: any): string {
  switch (action) {
    case 'reservation.submit':
      return `New reservation submitted: ${details?.studio_name || 'Studio'} - ${details?.entries_requested || 0} entries`;
    case 'reservation.approve':
      return `Reservation approved: ${details?.studio_name || 'Studio'}`;
    case 'reservation.adjust':
      return `Reservation adjusted: ${details?.studio_name || 'Studio'}`;
    case 'classification.request':
      return `Classification exception requested for entry: ${details?.entry_title || 'Entry'}`;
    case 'classification.approve':
      return `Classification exception approved for entry: ${details?.entry_title || 'Entry'}`;
    case 'invoice.send':
      return `Invoice sent to studio: ${details?.studio_name || 'Studio'}`;
    case 'invoice.markAsPaid':
      return `Invoice marked as paid: ${details?.studio_name || 'Studio'}`;
    default:
      return `Activity: ${action}`;
  }
}

/**
 * Get all users due for digest today
 */
export async function getUsersDueForDigest(): Promise<
  Array<{
    userId: string;
    preferences: any;
  }>
> {
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0-6
    const currentDayOfMonth = now.getDate(); // 1-31
    const currentHour = now.getHours();

    // Get all users with email digest enabled
    const users = await prisma.user_profiles.findMany({
      where: {
        role: 'competition_director',
      },
      select: {
        id: true,
        notification_preferences: true,
      },
    });

    const usersToSend: Array<{ userId: string; preferences: any }> = [];

    for (const user of users) {
      const prefs = (user.notification_preferences as any)?.email_digest;

      if (!prefs || !prefs.enabled) continue;

      // Parse time (HH:MM)
      const [targetHour] = prefs.time.split(':').map(Number);

      // Check if digest is due based on frequency
      let isDue = false;

      switch (prefs.frequency) {
        case 'daily':
          isDue = currentHour === targetHour;
          break;

        case 'weekly':
          isDue = currentDay === prefs.dayOfWeek && currentHour === targetHour;
          break;

        case 'monthly':
          isDue = currentDayOfMonth === prefs.dayOfMonth && currentHour === targetHour;
          break;
      }

      if (isDue) {
        usersToSend.push({
          userId: user.id,
          preferences: prefs,
        });
      }
    }

    return usersToSend;
  } catch (error) {
    logger.error('Failed to get users due for digest', {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return [];
  }
}
