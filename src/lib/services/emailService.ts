/**
 * Email Service Layer
 *
 * High-level email service providing business-logic email methods.
 * Centralizes email sending logic from routers.
 *
 * Created: Wave 3.1 (Email Service Refactor)
 */

import { sendEmail } from '../email';

export interface ReservationApprovedEmailParams {
  studioEmail: string;
  studioName: string;
  competitionName: string;
  spacesAllocated: number;
  competitionId: string;
  studioId: string;
}

export interface ReservationRejectedEmailParams {
  studioEmail: string;
  studioName: string;
  competitionName: string;
  reason?: string;
  competitionId: string;
  studioId: string;
}

export interface InvoiceSentEmailParams {
  studioEmail: string;
  studioName: string;
  competitionName: string;
  invoiceUrl: string;
  totalAmount: number;
  competitionId: string;
  studioId: string;
}

export class EmailService {
  /**
   * Send reservation approval email
   */
  static async sendReservationApproved(params: ReservationApprovedEmailParams) {
    const { studioEmail, studioName, competitionName, spacesAllocated, competitionId, studioId } = params;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">🎉 Reservation Approved!</h2>
        <p>Hello ${studioName},</p>
        <p>Great news! Your reservation for <strong>${competitionName}</strong> has been approved.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Allocated Routines:</strong> ${spacesAllocated}</p>
        </div>
        <p>You can now start creating routines for this competition.</p>
        <p>If you have any questions, please don't hesitate to reach out.</p>
        <p>Best regards,<br/>CompPortal Team</p>
      </div>
    `;

    return sendEmail({
      to: studioEmail,
      subject: `Reservation Approved - ${competitionName}`,
      html,
      templateType: 'reservation-approved',
      studioId,
      competitionId,
    });
  }

  /**
   * Send reservation rejected email
   */
  static async sendReservationRejected(params: ReservationRejectedEmailParams) {
    const { studioEmail, studioName, competitionName, reason, competitionId, studioId } = params;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Reservation Update</h2>
        <p>Hello ${studioName},</p>
        <p>Unfortunately, your reservation request for <strong>${competitionName}</strong> could not be approved at this time.</p>
        ${reason ? `<div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
        <p>Please feel free to reach out if you have any questions or would like to discuss alternative options.</p>
        <p>Best regards,<br/>CompPortal Team</p>
      </div>
    `;

    return sendEmail({
      to: studioEmail,
      subject: `Reservation Status - ${competitionName}`,
      html,
      templateType: 'reservation-declined',
      studioId,
      competitionId,
    });
  }

  /**
   * Send invoice to studio
   */
  static async sendInvoice(params: InvoiceSentEmailParams) {
    const { studioEmail, studioName, competitionName, invoiceUrl, totalAmount, competitionId, studioId } = params;

    const formattedAmount = totalAmount.toFixed(2);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">📄 Invoice Ready</h2>
        <p>Hello ${studioName},</p>
        <p>Your invoice for <strong>${competitionName}</strong> is ready for review.</p>
        <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Total Amount:</strong> $${formattedAmount}</p>
          <a href="${invoiceUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Invoice</a>
        </div>
        <p>Please review and process payment at your earliest convenience.</p>
        <p>Best regards,<br/>CompPortal Team</p>
      </div>
    `;

    return sendEmail({
      to: studioEmail,
      subject: `Invoice - ${competitionName}`,
      html,
      templateType: 'invoice-delivery',
      studioId,
      competitionId,
    });
  }
}
