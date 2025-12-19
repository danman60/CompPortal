/**
 * Pipeline V2 Type Definitions
 * All types for the new CRM-style pipeline interface
 */

// Display status - human-readable stage (not raw DB status)
export type DisplayStatus =
  | 'pending_review'
  | 'approved'
  | 'ready_to_invoice'
  | 'invoice_sent'
  | 'paid_complete'
  | 'rejected';

// Raw reservation status from database
export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'summarized' | 'invoiced' | 'closed';

// Invoice status from database
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'UNPAID' | 'VOIDED' | null;

// Pipeline reservation with all fields needed for display
export interface PipelineReservation {
  id: string;
  studioId: string;
  studioName: string;
  studioCode: string | null;
  studioCity: string;
  studioProvince: string;
  studioAddress: string;
  studioCreatedAt: Date | null;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string;
  competitionId: string;
  competitionName: string;
  competitionYear: number;
  spacesRequested: number;
  spacesConfirmed: number;
  entryCount: number;
  status: ReservationStatus;
  // Deposit
  depositAmount: number;
  depositPaidAt: Date | null;
  // Approval
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  internalNotes: string | null;
  // Summary
  hasSummary: boolean;
  summaryId: string | null;
  summarySubmittedAt: Date | null;
  // Invoice
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: InvoiceStatus;
  invoiceAmount: number | null;
  invoiceAmountPaid: number | null;
  invoiceBalanceRemaining: number | null;
  invoiceSentAt: Date | null;
  invoicePaidAt: Date | null;
  invoiceDueDate: Date | null;
  // Derived
  displayStatus: DisplayStatus;
  hasIssue: string | null;
  // Last action
  lastAction: string | null;
  lastActionDate: Date | null;
  // Pending space request
  pendingAdditionalSpaces: number | null;
  pendingSpacesJustification: string | null;
  pendingSpacesRequestedAt: Date | null;
  pendingSpacesRequestedBy: string | null;
  // Studio claim status
  isStudioClaimed: boolean;
}

// Competition capacity for overview section
export interface CompetitionCapacity {
  id: string;
  name: string;
  year: number;
  dates: string;
  location: string;
  totalCapacity: number;
  used: number;
  remaining: number;
  percentage: number;
  studioCount: number;
  pendingCount: number;
}

// Activity log entry
export interface ActivityEntry {
  id: string;
  action: string;
  description: string;
  createdAt: Date;
  userId: string | null;
  userName: string | null;
}

// Mutations interface for Pipeline V2
export interface PipelineMutations {
  // Reservation mutations
  approve: (input: { id: string; spacesConfirmed: number }) => Promise<void>;
  reject: (input: { id: string; reason?: string }) => Promise<void>;
  adjustSpaces: (input: { id: string; newSpaces: number }) => Promise<void>;
  updateDeposit: (input: { id: string; depositAmount: number; depositPaidAt?: Date }) => Promise<void>;
  // reopenSummary removed - feature disabled
  // Space request mutations
  approveSpaceRequest: (input: { reservationId: string }) => Promise<void>;
  denySpaceRequest: (input: { reservationId: string; reason?: string }) => Promise<void>;
  // Invoice mutations
  createInvoice: (input: { reservationId: string }) => Promise<void>;
  sendInvoice: (input: { invoiceId: string }) => Promise<void>;
  markAsPaid: (input: { invoiceId: string }) => Promise<void>;
  voidInvoice: (input: { invoiceId: string; reason?: string }) => Promise<void>;
  applyPayment: (input: { invoiceId: string; amount: number; paymentDate: Date; paymentMethod?: string; notes?: string }) => Promise<void>;
  // Modal openers
  openApprovalModal: (reservation: PipelineReservation) => void;
  openSpacesModal: (reservationId: string) => void;
  openDepositModal: (reservationId: string) => void;
  openPaymentModal: (invoiceId: string) => void;
  // Loading states
  isApproving: boolean;
  isRejecting: boolean;
  isCreatingInvoice: boolean;
  isSendingInvoice: boolean;
  isMarkingPaid: boolean;
  isVoidingInvoice: boolean;
  isApplyingPayment: boolean;
  isApprovingSpaceRequest: boolean;
  isDenyingSpaceRequest: boolean;
}

// Filter state for pipeline
export interface FilterState {
  search: string;
  competition: string | null;
  status: DisplayStatus | null;
  hideCompleted: boolean;
}

// Sort configuration for pipeline table
export type SortField = 'studio' | 'status' | 'competition' | 'progress' | 'entries' | 'balance';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

// Stats for KPI cards
export interface PipelineStats {
  total: number;
  pending: number;
  approved: number;
  readyToInvoice: number;
  awaitingPayment: number;
  paidComplete: number;
}

// Props for various components
export interface PipelineRowProps {
  reservation: PipelineReservation;
  isExpanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  mutations: PipelineMutations;
}

export interface PipelineExpandedRowProps {
  reservation: PipelineReservation;
  mutations: PipelineMutations;
  activities?: ActivityEntry[];
}

export interface PipelineStatusBadgeProps {
  status: DisplayStatus;
}

export interface PipelineBeadProgressProps {
  status: DisplayStatus;
  hasIssue: string | null;
}

export interface PipelineKPICardsProps {
  stats: PipelineStats;
  onFilterClick: (status: DisplayStatus | null) => void;
  activeFilter: DisplayStatus | null;
}

export interface PipelineFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  competitions: CompetitionCapacity[];
}

export interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}
