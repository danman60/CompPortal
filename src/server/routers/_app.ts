import { router } from '../trpc';
import { testRouter } from './test';
import { userRouter } from './user';
import { studioRouter } from './studio';
import { dancerRouter } from './dancer';
import { competitionRouter } from './competition';
import { reservationRouter } from './reservation';
import { entryRouter } from './entry';
import { lookupRouter } from './lookup';
import { invoiceRouter } from './invoice';
import { emailRouter } from './email';
import { schedulingRouter } from './scheduling';
import { scoringRouter } from './scoring';
import { judgesRouter } from './judges';
import { analyticsRouter } from './analytics';
import { reportsRouter } from './reports';
import { settingsRouter } from './settings';
import { musicRouter } from './music';
import { adminRouter } from './admin';
import { activityRouter } from './activity';
import { ipWhitelistRouter } from './ipWhitelist';
import { performanceRouter } from './performance';
import { twoFactorRouter } from './twoFactor';

/**
 * Main tRPC router
 * All routers should be added here
 */
export const appRouter = router({
  test: testRouter,
  user: userRouter,
  studio: studioRouter,
  dancer: dancerRouter,
  competition: competitionRouter,
  reservation: reservationRouter,
  entry: entryRouter,
  lookup: lookupRouter,
  invoice: invoiceRouter,
  email: emailRouter,
  scheduling: schedulingRouter,
  scoring: scoringRouter,
  judges: judgesRouter,
  analytics: analyticsRouter,
  reports: reportsRouter,
  settings: settingsRouter,
  music: musicRouter,
  admin: adminRouter,
  activity: activityRouter,
  ipWhitelist: ipWhitelistRouter,
  performance: performanceRouter,
  twoFactor: twoFactorRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
