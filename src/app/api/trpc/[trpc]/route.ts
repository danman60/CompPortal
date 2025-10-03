import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';
import { prisma } from '@/lib/prisma';
import type { Context } from '@/server/trpc';

const handler = async (req: Request) => {
  const supabase = await createServerSupabaseClient();

  const createContext = async (): Promise<Context> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { userId: null, userRole: null, studioId: null };
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

      return {
        userId: user.id,
        userRole: userProfile?.role || null,
        studioId,
      };
    } catch (error) {
      console.error('Error creating tRPC context:', error);
      return { userId: null, userRole: null, studioId: null };
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
