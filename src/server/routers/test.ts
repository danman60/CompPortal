import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const testRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
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
});
