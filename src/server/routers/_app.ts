import { router } from '../trpc';
import { testRouter } from './test';
import { studioRouter } from './studio';
import { dancerRouter } from './dancer';
import { competitionRouter } from './competition';
import { reservationRouter } from './reservation';

/**
 * Main tRPC router
 * All routers should be added here
 */
export const appRouter = router({
  test: testRouter,
  studio: studioRouter,
  dancer: dancerRouter,
  competition: competitionRouter,
  reservation: reservationRouter,
  // Additional routers will be added here:
  // entry: entryRouter,
  // etc.
});

// Export type definition of API
export type AppRouter = typeof appRouter;
