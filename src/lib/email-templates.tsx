import { render } from '@react-email/components';
import RegistrationConfirmation from '@/emails/RegistrationConfirmation';
import InvoiceDelivery from '@/emails/InvoiceDelivery';
import ReservationApproved from '@/emails/ReservationApproved';
import ReservationRejected from '@/emails/ReservationRejected';
import ReservationSubmitted from '@/emails/ReservationSubmitted';
import RoutineSummarySubmitted from '@/emails/RoutineSummarySubmitted';
import StudioProfileSubmitted from '@/emails/StudioProfileSubmitted';
import EntrySubmitted from '@/emails/EntrySubmitted';
import StudioApproved from '@/emails/StudioApproved';
import StudioRejected from '@/emails/StudioRejected';
import PaymentConfirmed from '@/emails/PaymentConfirmed';
import MissingMusicReminder from '@/emails/MissingMusicReminder';
import WelcomeEmail from '@/emails/WelcomeEmail';
import DailyDigest from '@/emails/DailyDigest';
import AccountRecovery from '@/emails/AccountRecovery';

/**
 * Render email templates to HTML
 */

export interface TenantBranding {
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string | null;
  tenantName?: string;
}

export interface RegistrationConfirmationData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  competitionDate?: string;
  contactEmail: string;
  portalUrl?: string;
  tenantBranding?: TenantBranding;
}

export interface InvoiceDeliveryData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  invoiceNumber: string;
  totalAmount: number;
  routineCount: number;
  invoiceUrl: string;
  dueDate?: string;
  portalUrl?: string;
  tenantBranding?: TenantBranding;
}

export interface ReservationApprovedData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  spacesConfirmed: number;
  portalUrl: string;
  nextSteps?: string[];
  tenantBranding?: TenantBranding;
}

export interface ReservationRejectedData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  reason?: string;
  portalUrl: string;
  contactEmail: string;
  tenantBranding?: TenantBranding;
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
  portalUrl?: string;
  tenantBranding?: TenantBranding;
}

export interface StudioApprovedData {
  studioName: string;
  ownerName?: string;
  portalUrl: string;
  tenantBranding?: TenantBranding;
}

export interface StudioRejectedData {
  studioName: string;
  ownerName?: string;
  reason?: string;
  portalUrl: string;
  contactEmail: string;
  tenantBranding?: TenantBranding;
}

export interface PaymentConfirmedData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  amount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded' | 'cancelled';
  invoiceNumber?: string;
  paymentDate: string;
  portalUrl?: string;
  tenantBranding?: TenantBranding;
}

export interface MissingMusicReminderData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  routinesWithoutMusic: Array<{
    title: string;
    entryNumber?: number;
    category: string;
  }>;
  portalUrl: string;
  daysUntilCompetition?: number;
  tenantBranding?: TenantBranding;
}

export interface WelcomeEmailData {
  name: string;
  email: string;
  dashboardUrl?: string;
  tenantBranding?: TenantBranding;
}

export interface ReservationSubmittedData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  spacesRequested: number;
  studioEmail: string;
  portalUrl: string;
  tenantBranding?: TenantBranding;
}

export interface RoutineSummarySubmittedData {
  studioName: string;
  competitionName: string;
  competitionYear: number;
  routineCount: number;
  totalFees: number;
  studioEmail: string;
  portalUrl: string;
  tenantBranding?: TenantBranding;
}

export interface StudioProfileSubmittedData {
  studioName: string;
  studioEmail: string;
  ownerName?: string;
  city?: string;
  province?: string;
  portalUrl: string;
  tenantBranding?: TenantBranding;
}

export interface AccountRecoveryData {
  studioName: string;
  recoveryUrl: string;
  tenantName: string;
  tenantBranding?: TenantBranding;
}

export interface DailyDigestData {
  userName: string;
  tenantName: string;
  portalUrl: string;
  pendingActions: {
    classificationRequests: Array<{
      id: string;
      entryTitle: string;
      studioName: string;
      requestedClassification: string;
      submittedAt: Date;
    }>;
    reservationReviews: Array<{
      id: string;
      studioName: string;
      competitionName: string;
      entriesRequested: number;
      submittedAt: Date;
    }>;
  };
  upcomingEvents: Array<{
    id: string;
    name: string;
    startDate: Date;
    daysUntil: number;
  }>;
  recentActivity: Array<{
    action: string;
    description: string;
    timestamp: Date;
  }>;
  tenantBranding?: TenantBranding;
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
 * Render payment confirmed email
 */
export async function renderPaymentConfirmed(data: PaymentConfirmedData) {
  return render(<PaymentConfirmed {...data} />);
}

/**
 * Render missing music reminder email
 */
export async function renderMissingMusicReminder(data: MissingMusicReminderData) {
  return render(<MissingMusicReminder {...data} />);
}

/**
 * Render welcome email
 */
export async function renderWelcomeEmail(data: WelcomeEmailData) {
  return render(<WelcomeEmail {...data} />);
}

/**
 * Render reservation submitted email (for CD)
 */
export async function renderReservationSubmitted(data: ReservationSubmittedData) {
  return render(<ReservationSubmitted {...data} />);
}

/**
 * Render routine summary submitted email (for CD)
 */
export async function renderRoutineSummarySubmitted(data: RoutineSummarySubmittedData) {
  return render(<RoutineSummarySubmitted {...data} />);
}

/**
 * Render studio profile submitted email (for CD)
 */
export async function renderStudioProfileSubmitted(data: StudioProfileSubmittedData) {
  return render(<StudioProfileSubmitted {...data} />);
}

/**
 * Render daily digest email (for CD)
 */
export async function renderDailyDigest(data: DailyDigestData) {
  return render(<DailyDigest {...data} />);
}

/**
 * Render account recovery email
 */
export async function renderAccountRecovery(data: AccountRecoveryData) {
  return render(<AccountRecovery {...data} />);
}

/**
 * Get email subject for template
 */
export function getEmailSubject(
  template: 'registration' | 'invoice' | 'reservation-approved' | 'reservation-rejected' | 'reservation-submitted' | 'routine-summary-submitted' | 'studio-profile-submitted' | 'entry' | 'studio-approved' | 'studio-rejected' | 'payment-confirmed' | 'missing-music' | 'daily-digest',
  data: { [key: string]: any }
): string {
  const subjects = {
    registration: `Registration Confirmed - ${data.competitionName} (${data.competitionYear})`,
    invoice: `Invoice ${data.invoiceNumber} - ${data.competitionName} (${data.competitionYear})`,
    'reservation-approved': `Reservation Approved - ${data.competitionName} (${data.competitionYear})`,
    'reservation-rejected': `Reservation Status Update - ${data.competitionName} (${data.competitionYear})`,
    'reservation-submitted': `New Reservation from ${data.studioName} - ${data.competitionName}`,
    'routine-summary-submitted': `Routine Summary Ready from ${data.studioName} - ${data.competitionName}`,
    'studio-profile-submitted': `New Studio Registration - ${data.studioName}`,
    entry: `Routine Submitted: ${data.entryTitle} - ${data.competitionName}`,
    'studio-approved': `Welcome to the Platform - ${data.studioName}`,
    'studio-rejected': `Studio Registration Status Update`,
    'payment-confirmed': `Payment ${data.paymentStatus ? data.paymentStatus.toUpperCase() : 'CONFIRMED'} - ${data.competitionName} (${data.competitionYear})`,
    'missing-music': `⏰ Reminder: Upload Music Files - ${data.competitionName}`,
    'daily-digest': `${data.tenantName} Daily Digest - ${new Date().toLocaleDateString()}`,
  };

  return subjects[template];
}