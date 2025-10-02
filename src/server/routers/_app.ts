import { router } from '../trpc';
import { testRouter } from './test';
import { studioRouter } from './studio';
import { dancerRouter } from './dancer';
import { competitionRouter } from './competition';
import { reservationRouter } from './reservation';
import { entryRouter } from './entry';

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
  entry: entryRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
