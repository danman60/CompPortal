import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { Context } from '@/server/trpc';
import type { TenantData } from '@/lib/tenant-context';

const handler = async (req: Request) => {
  const supabase = await createServerSupabaseClient();

  const createContext = async (): Promise<Context> => {
    try {
      // Extract tenant context from headers (injected by middleware)
      const tenantId = req.headers.get('x-tenant-id');
      const tenantDataStr = req.headers.get('x-tenant-data');
      let tenantData: TenantData | null = null;

      if (tenantDataStr) {
        try {
          tenantData = JSON.parse(tenantDataStr) as TenantData;
        } catch (error) {
          logger.warn('Failed to parse tenant data from headers', { error: error instanceof Error ? error : new Error(String(error)) });
        }
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { userId: null, userRole: null, studioId: null, tenantId, tenantData };
      }

      // Fetch user profile with role and studio information
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: user.id },
        select: { role: true, tenant_id: true },
      });

      // If user is a studio director, fetch their studio
      let studioId: string | null = null;
      if (userProfile?.role === 'studio_director' && userProfile?.tenant_id) {
        const studio = await prisma.studios.findFirst({
          where: {
            tenant_id: userProfile.tenant_id,  // Tenant isolation
            owner_id: user.id                   // Studio isolation (prevent cross-contamination)
          },
          select: { id: true },
        });
        studioId = studio?.id || null;
      }

      // Fallback: Use tenant_id from user profile if header is missing
      const effectiveTenantId = tenantId || userProfile?.tenant_id || null;

      return {
        userId: user.id,
        userRole: userProfile?.role || null,
        studioId,
        tenantId: effectiveTenantId,
        tenantData,
      };
    } catch (error) {
      logger.error('Error creating tRPC context', { error: error instanceof Error ? error : new Error(String(error)) });
      return { userId: null, userRole: null, studioId: null, tenantId: null, tenantData: null };
    }
  };

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });
};

export { handler as GET, handler as POST };
