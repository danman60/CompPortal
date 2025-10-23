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
        select: { role: true },
      });

      // If user is a studio director, fetch their studio
      let studioId: string | null = null;
      if (userProfile?.role === 'studio_director') {
        const studio = await prisma.studios.findFirst({
          where: { owner_id: user.id },
          select: { id: true },
        });
        studioId = studio?.id || null;
      }

      // TEMPORARY: Default to EMPWR tenant if none detected (for demo)
      const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
      const finalTenantData = tenantData || {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'EMPWR Dance Experience',
        subdomain: 'demo',
        slug: 'empwr',
        branding: {},
      };

      return {
        userId: user.id,
        userRole: userProfile?.role || null,
        studioId,
        tenantId: finalTenantId,
        tenantData: finalTenantData,
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
