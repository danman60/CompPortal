/**
 * Analytics tracking utilities for CompPortal
 *
 * Integrates with Vercel Analytics for custom event tracking
 * Tracks critical business operations without PII
 */

import { track } from '@vercel/analytics';

/**
 * Track custom events in Vercel Analytics
 *
 * IMPORTANT: Never pass PII (names, emails, birth dates) to analytics
 * Only pass IDs, counts, and business metrics
 */

export const analytics = {
  /**
   * Track when a studio creates a new reservation
   *
   * @param data - Reservation metadata (no PII)
   */
  reservationCreated: (data: {
    reservationId: string;
    competitionId: string;
    studioId: string;
    entryCount: number;
    status: string;
  }) => {
    track('reservation_created', {
      reservation_id: data.reservationId,
      competition_id: data.competitionId,
      studio_id: data.studioId,
      entry_count: data.entryCount,
      status: data.status,
    });
  },

  /**
   * Track when a studio submits an entry
   *
   * @param data - Entry metadata (no PII)
   */
  entrySubmitted: (data: {
    entryId: string;
    competitionId: string;
    studioId: string;
    category?: string;
    ageGroup?: string;
  }) => {
    const properties: Record<string, string | number> = {
      entry_id: data.entryId,
      competition_id: data.competitionId,
      studio_id: data.studioId,
    };

    if (data.category) properties.category = data.category;
    if (data.ageGroup) properties.age_group = data.ageGroup;

    track('entry_submitted', properties);
  },

  /**
   * Track when an invoice is sent to a studio
   *
   * @param data - Invoice metadata (no PII)
   */
  invoiceSent: (data: {
    invoiceId: string;
    studioId: string;
    competitionId: string;
    totalAmount: number;
    entryCount: number;
    method: 'email' | 'manual';
  }) => {
    track('invoice_sent', {
      invoice_id: data.invoiceId,
      studio_id: data.studioId,
      competition_id: data.competitionId,
      total_amount: data.totalAmount,
      entry_count: data.entryCount,
      method: data.method,
    });
  },

  /**
   * Track when a reservation is approved by CD
   *
   * @param data - Approval metadata
   */
  reservationApproved: (data: {
    reservationId: string;
    competitionId: string;
    studioId: string;
    approvedBy: string; // User ID, not name
  }) => {
    track('reservation_approved', {
      reservation_id: data.reservationId,
      competition_id: data.competitionId,
      studio_id: data.studioId,
      approved_by: data.approvedBy,
    });
  },

  /**
   * Track when a reservation is rejected by CD
   *
   * @param data - Rejection metadata
   */
  reservationRejected: (data: {
    reservationId: string;
    competitionId: string;
    studioId: string;
    rejectedBy: string; // User ID, not name
    reason?: string;
  }) => {
    const properties: Record<string, string | number> = {
      reservation_id: data.reservationId,
      competition_id: data.competitionId,
      studio_id: data.studioId,
      rejected_by: data.rejectedBy,
    };

    if (data.reason) properties.reason = data.reason;

    track('reservation_rejected', properties);
  },

  /**
   * Track when a competition is created
   *
   * @param data - Competition metadata
   */
  competitionCreated: (data: {
    competitionId: string;
    createdBy: string; // User ID
    hasRegistrationOpen: boolean;
  }) => {
    track('competition_created', {
      competition_id: data.competitionId,
      created_by: data.createdBy,
      has_registration_open: data.hasRegistrationOpen,
    });
  },

  /**
   * Track when a studio signs up (onboarding)
   *
   * @param data - Signup metadata
   */
  studioSignup: (data: {
    studioId: string;
    userId: string;
    source?: string;
  }) => {
    const properties: Record<string, string | number> = {
      studio_id: data.studioId,
      user_id: data.userId,
    };

    if (data.source) properties.source = data.source;

    track('studio_signup', properties);
  },

  /**
   * Track when a user completes onboarding
   *
   * @param data - Onboarding metadata
   */
  onboardingComplete: (data: {
    userId: string;
    studioId: string;
    timeTaken?: number; // seconds
  }) => {
    const properties: Record<string, string | number> = {
      user_id: data.userId,
      studio_id: data.studioId,
    };

    if (data.timeTaken !== undefined) properties.time_taken = data.timeTaken;

    track('onboarding_complete', properties);
  },

  /**
   * Track CSV import operations
   *
   * @param data - Import metadata
   */
  csvImported: (data: {
    type: 'dancers' | 'entries' | 'routines';
    studioId: string;
    rowCount: number;
    successCount: number;
    errorCount: number;
  }) => {
    track('csv_imported', {
      import_type: data.type,
      studio_id: data.studioId,
      row_count: data.rowCount,
      success_count: data.successCount,
      error_count: data.errorCount,
    });
  },

  /**
   * Track scoring operations (for judges)
   *
   * @param data - Scoring metadata
   */
  scoreSubmitted: (data: {
    entryId: string;
    competitionId: string;
    judgeId: string;
    scoreCount: number;
  }) => {
    track('score_submitted', {
      entry_id: data.entryId,
      competition_id: data.competitionId,
      judge_id: data.judgeId,
      score_count: data.scoreCount,
    });
  },
};

/**
 * Track page views (automatically handled by Vercel Analytics)
 * This is here for documentation purposes only
 */
export const trackPageView = () => {
  // Page views are automatically tracked by the <Analytics /> component
  // No need to call this manually
};

/**
 * Example usage:
 *
 * import { analytics } from '@/lib/analytics';
 *
 * // After creating a reservation
 * analytics.reservationCreated({
 *   reservationId: reservation.id,
 *   competitionId: competition.id,
 *   studioId: studio.id,
 *   entryCount: 15,
 *   status: 'pending',
 * });
 */
