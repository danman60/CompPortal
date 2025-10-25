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
import { scheduleBuilderRouter } from './scheduleBuilder';
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
import { gdprRouter } from './gdpr';
import { cdnRouter } from './cdn';
import { cacheRouter } from './cache';
import { liveCompetitionRouter } from './liveCompetition';
import { chatRouter } from './chat';
import { tenantSettingsRouter } from './tenantSettings';
import { failureRouter } from './failure';
import { testingRouter } from './testing';
import { emailPreferencesRouter } from './emailPreferences';
import { superAdminRouter } from './superAdmin';
import { summaryRouter } from './summary';

/**
 * Main tRPC router
 * All routers should be added here
 */
export const appRouter = router({
  test: testRouter,
  testing: testingRouter,
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
  scheduleBuilder: scheduleBuilderRouter,
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
  gdpr: gdprRouter,
  cdn: cdnRouter,
  cache: cacheRouter,
  liveCompetition: liveCompetitionRouter,
  chat: chatRouter,
  tenantSettings: tenantSettingsRouter,
  failure: failureRouter,
  emailPreferences: emailPreferencesRouter,
  superAdmin: superAdminRouter,
  summary: summaryRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
