/**
 * Email Service Layer
 *
 * High-level email service providing business-logic email methods.
 * Centralizes email sending logic from routers.
 *
 * Created: Wave 3.1 (Email Service Refactor)
 * Updated: Wave 3.2 (Failure Tracking)
 */

import { sendEmail } from '../email';
import { trackFailure } from './failureTracker';

export interface ReservationApprovedEmailParams {
  studioEmail: string;
  studioName: string;
  studioPublicCode?: string;
  competitionName: string;
  spacesAllocated: number;
  competitionId: string;
  studioId: string;
  tenantName?: string;
}

export interface ReservationRejectedEmailParams {
  studioEmail: string;
  studioName: string;
  studioPublicCode?: string;
  competitionName: string;
  reason?: string;
  competitionId: string;
  studioId: string;
  tenantName?: string;
}

export interface InvoiceSentEmailParams {
  studioEmail: string;
  studioName: string;
  studioPublicCode?: string;
  competitionName: string;
  invoiceUrl: string;
  totalAmount: number;
  competitionId: string;
  studioId: string;
  tenantName?: string;
}

export interface SummaryReopenedEmailParams {
  studioEmail: string;
  studioName: string;
  studioPublicCode?: string;
  competitionName: string;
  competitionId: string;
  studioId: string;
  tenantName?: string;
  dashboardUrl?: string;
  reason?: string;
}

export class EmailService {
  /**
   * Send reservation approval email
   */
  static async sendReservationApproved(params: ReservationApprovedEmailParams) {
    const { studioEmail, studioName, studioPublicCode, competitionName, spacesAllocated, competitionId, studioId, tenantName } = params;
    const teamName = tenantName || 'Competition';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">🎉 Reservation Approved!</h2>
        <p>Hello ${studioName}${studioPublicCode ? ` <span style="color: #9333ea; font-weight: 600;">(Code: ${studioPublicCode})</span>` : ''},</p>
        <p>Great news! Your reservation for <strong>${competitionName}</strong> has been approved.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Allocated Routines:</strong> ${spacesAllocated}</p>
        </div>
        <p>You can now start creating routines for this competition.</p>
        <p>If you have any questions, please don't hesitate to reach out.</p>
        <p>Best regards,<br/>${teamName} Team</p>
      </div>
    `;

    try {
      return await sendEmail({
        to: studioEmail,
        subject: `Reservation Approved - ${competitionName}`,
        html,
        templateType: 'reservation-approved',
        studioId,
        competitionId,
      });
    } catch (error) {
      // Track failure for visibility and retry capability
      await trackFailure({
        operationType: 'email',
        operationName: 'sendReservationApproved',
        entityType: 'reservation',
        entityId: studioId,
        error,
      });

      // Re-throw so caller knows email failed
      throw error;
    }
  }

  /**
   * Send reservation rejected email
   */
  static async sendReservationRejected(params: ReservationRejectedEmailParams) {
    const { studioEmail, studioName, studioPublicCode, competitionName, reason, competitionId, studioId, tenantName } = params;
    const teamName = tenantName || 'Competition';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Reservation Update</h2>
        <p>Hello ${studioName}${studioPublicCode ? ` <span style="color: #9333ea; font-weight: 600;">(Code: ${studioPublicCode})</span>` : ''},</p>
        <p>Unfortunately, your reservation request for <strong>${competitionName}</strong> could not be approved at this time.</p>
        ${reason ? `<div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
        <p>Please feel free to reach out if you have any questions or would like to discuss alternative options.</p>
        <p>Best regards,<br/>${teamName} Team</p>
      </div>
    `;

    try {
      return await sendEmail({
        to: studioEmail,
        subject: `Reservation Status - ${competitionName}`,
        html,
        templateType: 'reservation-declined',
        studioId,
        competitionId,
      });
    } catch (error) {
      // Track failure for visibility and retry capability
      await trackFailure({
        operationType: 'email',
        operationName: 'sendReservationRejected',
        entityType: 'reservation',
        entityId: studioId,
        error,
      });

      // Re-throw so caller knows email failed
      throw error;
    }
  }

  /**
   * Send invoice to studio
   */
  static async sendInvoice(params: InvoiceSentEmailParams) {
    const { studioEmail, studioName, studioPublicCode, competitionName, invoiceUrl, totalAmount, competitionId, studioId, tenantName } = params;
    const teamName = tenantName || 'Competition';

    const formattedAmount = totalAmount.toFixed(2);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">📄 Invoice Ready</h2>
        <p>Hello ${studioName}${studioPublicCode ? ` <span style="color: #9333ea; font-weight: 600;">(Code: ${studioPublicCode})</span>` : ''},</p>
        <p>Your invoice for <strong>${competitionName}</strong> is ready for review.</p>
        <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Total Amount:</strong> $${formattedAmount}</p>
          <a href="${invoiceUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Invoice</a>
        </div>
        <p>Please review and process payment at your earliest convenience.</p>
        <p>Best regards,<br/>${teamName} Team</p>
      </div>
    `;

    try {
      return await sendEmail({
        to: studioEmail,
        subject: `Invoice - ${competitionName}`,
        html,
        templateType: 'invoice-delivery',
        studioId,
        competitionId,
      });
    } catch (error) {
      // Track failure for visibility and retry capability
      await trackFailure({
        operationType: 'email',
        operationName: 'sendInvoice',
        entityType: 'invoice',
        entityId: competitionId,
        error,
      });

      // Re-throw so caller knows email failed
      throw error;
    }
  }

  /**
   * Send summary reopened notification
   * Notifies studio that their summary has been reopened for editing
   */
  static async sendSummaryReopened(params: SummaryReopenedEmailParams) {
    const { studioEmail, studioName, studioPublicCode, competitionName, competitionId, studioId, tenantName, dashboardUrl, reason } = params;
    const teamName = tenantName || 'Competition';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">📝 Action Required: Summary Reopened</h2>
        <p>Hello ${studioName}${studioPublicCode ? ` <span style="color: #9333ea; font-weight: 600;">(Code: ${studioPublicCode})</span>` : ''},</p>
        <p>Your entry summary for <strong>${competitionName}</strong> has been reopened by the Competition Director.</p>
        ${reason ? `<div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;"><p style="margin: 0;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
        <div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>What this means:</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Your previous submission has been reset</li>
            <li>You can now make changes to your entries</li>
            <li>Please review and resubmit when ready</li>
          </ul>
        </div>
        ${dashboardUrl ? `<p><a href="${dashboardUrl}" style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a></p>` : ''}
        <p>If you have any questions about what changes need to be made, please contact the Competition Director.</p>
        <p>Best regards,<br/>${teamName} Team</p>
      </div>
    `;

    try {
      return await sendEmail({
        to: studioEmail,
        subject: `Action Required: Summary Reopened - ${competitionName}`,
        html,
        templateType: 'summary-reopened',
        studioId,
        competitionId,
      });
    } catch (error) {
      // Track failure for visibility and retry capability
      await trackFailure({
        operationType: 'email',
        operationName: 'sendSummaryReopened',
        entityType: 'reservation',
        entityId: studioId,
        error,
      });

      // Re-throw so caller knows email failed
      throw error;
    }
  }
}
