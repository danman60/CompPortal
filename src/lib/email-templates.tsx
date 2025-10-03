import { render } from '@react-email/components';
import RegistrationConfirmation from '@/emails/RegistrationConfirmation';
import InvoiceDelivery from '@/emails/InvoiceDelivery';
import ReservationApproved from '@/emails/ReservationApproved';
import EntrySubmitted from '@/emails/EntrySubmitted';

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
 * Render entry submitted email
 */
export async function renderEntrySubmitted(data: EntrySubmittedData) {
  return render(<EntrySubmitted {...data} />);
}

/**
 * Get email subject for template
 */
export function getEmailSubject(
  template: 'registration' | 'invoice' | 'reservation' | 'entry',
  data: { competitionName: string; competitionYear: number; [key: string]: any }
): string {
  const subjects = {
    registration: `Registration Confirmed - ${data.competitionName} (${data.competitionYear})`,
    invoice: `Invoice ${data.invoiceNumber} - ${data.competitionName} (${data.competitionYear})`,
    reservation: `Reservation Approved - ${data.competitionName} (${data.competitionYear})`,
    entry: `Entry Submitted: ${data.entryTitle} - ${data.competitionName}`,
  };

  return subjects[template];
}
