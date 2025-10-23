import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const testRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().nullish() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.name ?? 'World'}!`,
        timestamp: new Date().toISOString(),
        status: 'tRPC is working! 🎉',
      };
    }),

  getServerStatus: publicProcedure.query(() => {
    return {
      status: 'online',
      message: 'GlowDance API Server is running',
      version: '1.0.0',
      features: {
        nextjs: true,
        trpc: true,
        prisma: true, // ✅ Prisma is set up!
        auth: false, // Will be true once we set it up
      },
    };
  }),

  checkEnv: publicProcedure.query(() => {
    return {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      DIRECT_URL: process.env.DIRECT_URL ? 'SET' : 'MISSING',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'MISSING',
    };
  }),
});
