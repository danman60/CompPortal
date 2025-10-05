import { render } from '@react-email/components';
import RegistrationConfirmation from '@/emails/RegistrationConfirmation';
import InvoiceDelivery from '@/emails/InvoiceDelivery';
import ReservationApproved from '@/emails/ReservationApproved';
import ReservationRejected from '@/emails/ReservationRejected';
import EntrySubmitted from '@/emails/EntrySubmitted';
import StudioApproved from '@/emails/StudioApproved';
import StudioRejected from '@/emails/StudioRejected';

/**
 * Render email templates to HTML
 */

export interface RegistrationConfirmationData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  competitionDate?: string;
  contactEmail: string;
}

export interface InvoiceDeliveryData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  invoiceNumber: string;
  totalAmount: number;
  entryCount: number;
  invoiceUrl: string;
  dueDate?: string;
}

export interface ReservationApprovedData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  spacesConfirmed: number;
  portalUrl: string;
  nextSteps?: string[];
}

export interface ReservationRejectedData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  reason?: string;
  portalUrl: string;
  contactEmail: string;
}

export interface EntrySubmittedData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  entryTitle: string;
  entryNumber?: number;
  category: string;
  sizeCategory: string;
  participantCount: number;
  entryFee: number;
}

export interface StudioApprovedData {
  studioName: string;
  ownerName?: string;
  portalUrl: string;
}

export interface StudioRejectedData {
  studioName: string;
  ownerName?: string;
  reason?: string;
  portalUrl: string;
  contactEmail: string;
}

/**
 * Render registration confirmation email
 */
export async function renderRegistrationConfirmation(data: RegistrationConfirmationData) {
  return render(<RegistrationConfirmation {...data} />);
}

/**
 * Render invoice delivery email
 */
export async function renderInvoiceDelivery(data: InvoiceDeliveryData) {
  return render(<InvoiceDelivery {...data} />);
}

/**
 * Render reservation approved email
 */
export async function renderReservationApproved(data: ReservationApprovedData) {
  return render(<ReservationApproved {...data} />);
}

/**
 * Render reservation rejected email
 */
export async function renderReservationRejected(data: ReservationRejectedData) {
  return render(<ReservationRejected {...data} />);
}

/**
 * Render entry submitted email
 */
export async function renderEntrySubmitted(data: EntrySubmittedData) {
  return render(<EntrySubmitted {...data} />);
}

/**
 * Render studio approved email
 */
export async function renderStudioApproved(data: StudioApprovedData) {
  return render(<StudioApproved {...data} />);
}

/**
 * Render studio rejected email
 */
export async function renderStudioRejected(data: StudioRejectedData) {
  return render(<StudioRejected {...data} />);
}

/**
 * Get email subject for template
 */
export function getEmailSubject(
  template: 'registration' | 'invoice' | 'reservation-approved' | 'reservation-rejected' | 'entry' | 'studio-approved' | 'studio-rejected',
  data: { [key: string]: any }
): string {
  const subjects = {
    registration: `Registration Confirmed - ${data.competitionName} (${data.competitionYear})`,
    invoice: `Invoice ${data.invoiceNumber} - ${data.competitionName} (${data.competitionYear})`,
    'reservation-approved': `Reservation Approved - ${data.competitionName} (${data.competitionYear})`,
    'reservation-rejected': `Reservation Status Update - ${data.competitionName} (${data.competitionYear})`,
    entry: `Entry Submitted: ${data.entryTitle} - ${data.competitionName}`,
    'studio-approved': `Welcome to the Platform - ${data.studioName}`,
    'studio-rejected': `Studio Registration Status Update`,
  };

  return subjects[template];
}
