import { router } from '../trpc';
import { testRouter } from './test';
import { studioRouter } from './studio';

/**
 * Main tRPC router
 * All routers should be added here
 */
export const appRouter = router({
  test: testRouter,
  studio: studioRouter,
  // Additional routers will be added here:
  // dancer: dancerRouter,
  // competition: competitionRouter,
  // etc.
});

// Export type definition of API
export type AppRouter = typeof appRouter;
