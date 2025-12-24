'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc';
import { generateInvoicePDF } from '@/lib/pdf-reports';
import toast from 'react-hot-toast';
import SplitInvoiceWizard from '@/components/SplitInvoiceWizard';
import SubInvoiceList from '@/components/SubInvoiceList';
import ApplyPartialPaymentModal from '@/components/ApplyPartialPaymentModal';
import PaymentHistoryTable from '@/components/PaymentHistoryTable';

// Helper functions to format dates (manual formatting to avoid SSR/CSR hydration mismatch)
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatDate(dateValue: any, includeYear: boolean = true): string {
  try {
    if (!dateValue) return includeYear ? 'Date not available' : '';

    let year: number, month: number, day: number;

    // Check if it's already a Date object
    if (dateValue instanceof Date) {
      year = dateValue.getUTCFullYear();
      month = dateValue.getUTCMonth() + 1;
      day = dateValue.getUTCDate();
    } else {
      // Handle string formats (YYYY-MM-DD or ISO timestamp)
      const dateStr = dateValue.toString();

      if (dateStr.includes('-')) {
        // Parse YYYY-MM-DD format manually (avoid timezone offset)
        const [yearStr, monthStr, dayStr] = dateStr.split('T')[0].split('-');
        year = parseInt(yearStr);
        month = parseInt(monthStr);
        day = parseInt(dayStr);
      } else {
        // Fallback: create Date object
        const d = new Date(dateStr);
        year = d.getUTCFullYear();
        month = d.getUTCMonth() + 1;
        day = d.getUTCDate();
      }
    }

    if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
      return includeYear ? 'Date not available' : '';
    }

    if (includeYear) {
      return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
    } else {
      return `${MONTH_NAMES[month - 1]} ${day}`;
    }
  } catch (err) {
    console.error('[formatDate] Error:', err);
    return includeYear ? 'Date not available' : '';
  }
}

function formatCompetitionDate(dateValue: any): string {
  return formatDate(dateValue, true);
}

function formatCompetitionEndDate(dateValue: any): string {
  return formatDate(dateValue, false);
}

type Props = {
  studioId: string;
  competitionId: string;
};

export default function InvoiceDetail({ studioId, competitionId }: Props) {
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [isEditingPrices, setIsEditingPrices] = useState(false);
  const [editableLineItems, setEditableLineItems] = useState<any[]>([]);
  const [showSplitWizard, setShowSplitWizard] = useState(false);
  const [showSubInvoices, setShowSubInvoices] = useState(false);
  const [creditsInput, setCreditsInput] = useState<Array<{ amount: number; note: string }>>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customDiscountInput, setCustomDiscountInput] = useState<string>('');
  const [portalMounted, setPortalMounted] = useState(false);

  // Portal mount for SSR safety
  useEffect(() => {
    setPortalMounted(true);
    return () => setPortalMounted(false);
  }, []);

  // Get current user role
  const { data: userProfile } = trpc.user.getCurrentUser.useQuery();
  const isStudioDirector = ['studio_director', 'super_admin'].includes(userProfile?.role || '');
  const isCompetitionDirector = ['competition_director', 'super_admin'].includes(userProfile?.role || '');

  // Check if there's an existing invoice in the database (primary source of truth)
  const { data: dbInvoice, isLoading: dbLoading, refetch: refetchDb } = trpc.invoice.getByStudioAndCompetition.useQuery({
    studioId,
    competitionId,
  });

  // Only generate from entries if no database invoice exists (fallback for old invoices)
  const { data: generatedInvoice, isLoading: genLoading } = trpc.invoice.generateForStudio.useQuery({
    studioId,
    competitionId,
  }, {
    enabled: !dbInvoice && !dbLoading, // Only run if no DB invoice found
  });

  // Use database invoice if it exists, otherwise use generated
  const invoice = dbInvoice || generatedInvoice;
  const isLoading = dbLoading || genLoading;
  const refetch = refetchDb;

  // Check for existing sub-invoices
  const { data: subInvoicesData } = trpc.invoice.getSubInvoices.useQuery({
    parentInvoiceId: dbInvoice?.id || '',
  }, {
    enabled: !!dbInvoice?.id && isStudioDirector,
  });

  const hasSubInvoices = (subInvoicesData?.sub_invoices?.length || 0) > 0;

  // Populate modal with existing credits when opening
  useEffect(() => {
    if (showCreditModal && dbInvoice) {
      // Load from additional_credits array, or migrate from old single-credit fields
      const existingCredits = (dbInvoice as any).additional_credits as Array<{ amount: number; note: string }> | null;
      if (existingCredits && existingCredits.length > 0) {
        setCreditsInput(existingCredits);
      } else if (Number(dbInvoice.other_credit_amount || 0) > 0) {
        // Migrate old single credit to array format
        setCreditsInput([{
          amount: Number(dbInvoice.other_credit_amount),
          note: dbInvoice.other_credit_reason || '',
        }]);
      } else {
        setCreditsInput([]);
      }
    }
  }, [showCreditModal, dbInvoice]);

  const sendInvoiceMutation = trpc.invoice.sendInvoice.useMutation({
    onSuccess: () => {
      toast.success('Invoice sent to studio!');
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to send invoice: ${error.message}`);
    },
  });

  const markAsPaidMutation = trpc.invoice.markAsPaid.useMutation({
    onSuccess: () => {
      toast.success('Invoice marked as paid!');
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to mark as paid: ${error.message}`);
    },
  });

  const applyDiscountMutation = trpc.invoice.applyDiscount.useMutation({
    onSuccess: (data) => {
      toast.success(data.discountAmount > 0 ? 'Discount applied!' : 'Discount removed!');
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to apply discount: ${error.message}`);
    },
  });

  const applyCustomCreditMutation = trpc.invoice.applyCustomCredit.useMutation({
    onSuccess: (data) => {
      toast.success(data.creditAmount > 0 ? 'Credit applied!' : 'Credit removed!');
      setShowCreditModal(false);
      setCreditsInput([]);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to apply credit: ${error.message}`);
    },
  });

  const updateAdditionalCreditsMutation = trpc.invoice.updateAdditionalCredits.useMutation({
    onSuccess: (data) => {
      toast.success(data.creditsCount > 0 ? `${data.creditsCount} credit(s) saved!` : 'Credits cleared!');
      setShowCreditModal(false);
      setCreditsInput([]);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to save credits: ${error.message}`);
    },
  });

  const updateLineItemsMutation = trpc.invoice.updateLineItems.useMutation({
    onSuccess: () => {
      toast.success('Invoice prices updated!');
      setIsEditingPrices(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to update prices: ${error.message}`);
    },
  });

  const reopenSummaryMutation = trpc.reservation.reopenSummary.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to reopen summary: ${error.message}`);
    },
  });

  // Void invoice without reopening summary
  const voidInvoiceMutation = trpc.invoice.voidInvoice.useMutation({
    onSuccess: () => {
      toast.success('Invoice voided. You can now create a new invoice.');
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to void invoice: ${error.message}`);
    },
  });

  // Create new invoice from voided one
  const createFromVoidedMutation = trpc.invoice.createFromVoided.useMutation({
    onSuccess: () => {
      toast.success('New invoice created!');
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });

  const handleReopenSummary = () => {
    if (!invoice?.reservation?.id) {
      toast.error('No reservation found for this invoice');
      return;
    }

    if (!confirm('Void this invoice and reopen summary?\n\nThis will:\n• Mark this invoice as VOID\n• Allow studio to edit entries again\n• Require studio to resubmit summary\n• Require you to regenerate invoice\n\nContinue?')) {
      return;
    }

    reopenSummaryMutation.mutate({
      reservationId: invoice.reservation.id,
    });
  };

  const handleVoidInvoice = () => {
    if (!dbInvoice) return;
    if (!confirm('Void this invoice?\n\nThis will mark it as VOID. You can then create a new invoice.\n\nSummary stays closed. Continue?')) return;
    voidInvoiceMutation.mutate({ invoiceId: dbInvoice.id });
  };

  const handleCreateFromVoided = () => {
    if (!dbInvoice) return;
    createFromVoidedMutation.mutate({ voidedInvoiceId: dbInvoice.id });
  };

  // Line items come from the invoice (either DB or generated)
  const displayLineItems = invoice?.lineItems || [];

  // Only Competition Directors and Super Admins can edit prices, not Studio Directors
  const canEditPrices = isCompetitionDirector && dbInvoice && dbInvoice.status !== 'PAID';

  const handleStartEditing = () => {
    setEditableLineItems(displayLineItems.map((item: any) => ({ ...item })));
    setIsEditingPrices(true);
  };

  const handleSaveEdits = () => {
    if (!dbInvoice) return;
    updateLineItemsMutation.mutate({
      invoiceId: dbInvoice.id,
      lineItems: editableLineItems,
    });
  };

  const handleCancelEditing = () => {
    setIsEditingPrices(false);
    setEditableLineItems([]);
  };

  const updateLineItem = (index: number, field: 'entryFee' | 'lateFee', value: number) => {
    const updated = [...editableLineItems];
    updated[index][field] = value;
    updated[index].total = updated[index].entryFee + updated[index].lateFee;
    setEditableLineItems(updated);
  };

  // Calculate subtotal from current line items (editable or display)
  const currentLineItems = isEditingPrices ? editableLineItems : displayLineItems;
  const currentSubtotal = currentLineItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
  const taxRate = invoice?.summary?.taxRate || 0;

  // Get discounts and credits from database (source of truth)
  const creditAmount = dbInvoice ? Number(dbInvoice.credit_amount || 0) : 0; // Percentage discount

  // Get additional credits from new array field, or fall back to old single-credit fields
  const additionalCredits = (dbInvoice as any)?.additional_credits as Array<{ amount: number; note: string }> | null;
  const additionalCreditsTotal = additionalCredits?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
  const otherCreditAmount = additionalCreditsTotal > 0
    ? additionalCreditsTotal
    : (dbInvoice ? Number(dbInvoice.other_credit_amount || 0) : 0); // Fallback to old field

  const discountPercent = currentSubtotal > 0 ? (creditAmount / currentSubtotal) * 100 : 0;

  // Sync custom discount input with current database value
  useEffect(() => {
    if (typeof discountPercent === 'number' && !isNaN(discountPercent) && discountPercent > 0) {
      setCustomDiscountInput(discountPercent.toFixed(1));
    } else {
      setCustomDiscountInput('');
    }
  }, [discountPercent]);

  // Debug logging (safe in useEffect to avoid hydration errors)
  useEffect(() => {
    console.log('[InvoiceDetail] Credit/Discount calculation:', {
      hasDbInvoice: !!dbInvoice,
      creditAmountFromDb: dbInvoice?.credit_amount,
      otherCreditAmountFromDb: dbInvoice?.other_credit_amount,
      creditAmountCalculated: creditAmount,
      otherCreditAmountCalculated: otherCreditAmount,
      creditReason: dbInvoice?.credit_reason,
      otherCreditReason: dbInvoice?.other_credit_reason,
      discountPercent,
      currentSubtotal,
      userRole: userProfile?.role
    });
  }, [dbInvoice, creditAmount, otherCreditAmount, discountPercent, currentSubtotal, userProfile]);

  // SOURCE OF TRUTH: Use database values when available, fall back to calculated for old/generated invoices
  const totalAfterAllCredits = currentSubtotal - creditAmount - otherCreditAmount;
  const taxAmount = totalAfterAllCredits * taxRate;
  const calculatedTotal = totalAfterAllCredits + taxAmount;

  // Use database values as source of truth
  const invoiceTotal = dbInvoice ? parseFloat(dbInvoice.total.toString()) : calculatedTotal;
  const depositAmount = dbInvoice && dbInvoice.deposit_amount
    ? parseFloat(dbInvoice.deposit_amount.toString())
    : (invoice?.reservation?.depositAmount || 0);
  const balanceDue = dbInvoice && dbInvoice.amount_due
    ? parseFloat(dbInvoice.amount_due.toString())
    : Math.max(0, calculatedTotal - depositAmount);
  const amountPaid = dbInvoice?.amount_paid ? parseFloat(dbInvoice.amount_paid.toString()) : 0;
  const balanceRemaining = dbInvoice?.balance_remaining ? parseFloat(dbInvoice.balance_remaining.toString()) : balanceDue;
  const hasPayments = amountPaid > 0;
  const isVoided = dbInvoice?.status === 'VOIDED' || dbInvoice?.status === 'VOID';

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
        <div className="animate-spin text-6xl mb-4">⚙️</div>
        <p className="text-white">Generating invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-semibold text-white mb-2">Invoice Not Found</h3>
        <p className="text-gray-400">Unable to generate invoice for this studio and competition.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 max-w-5xl mx-auto relative">
      {/* VOID Watermark */}
      {isVoided && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-red-500/30 font-bold text-[120px] transform -rotate-45">VOID</div>
        </div>
      )}

      {/* Manual Payment Banner */}
      <div className="bg-blue-500/20 border-2 border-blue-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
        <span className="text-2xl">💵</span>
        <div>
          <p className="text-blue-300 font-semibold">Manual Payment Only</p>
          <p className="text-blue-200 text-sm">Payments are handled offline via e-transfer, check, or other methods. Online payment processing coming soon.</p>
        </div>
      </div>

      {/* VOIDED Invoice Banner */}
      {isVoided && (
        <div className="bg-red-500/20 border-2 border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-300 font-semibold">This Invoice Has Been Voided</p>
          <p className="text-red-200 text-sm">Create a new invoice below.</p>
        </div>
      )}

      {/* Invoice Header */}
      <div className="flex justify-between items-start mb-8 pb-8 border-b border-white/20">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">INVOICE</h2>
          <p className="text-gray-300">#{invoice.invoiceNumber}</p>
          <p className="text-sm text-gray-400">
            Date: {formatDate(invoice.invoiceDate, true)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400 mb-1">
            {hasPayments ? 'Balance Remaining' : 'Balance Due'}
          </div>
          <div className="text-4xl font-bold text-green-400">
            ${(hasPayments ? balanceRemaining : balanceDue).toFixed(2)}
          </div>
          {hasPayments && (
            <div className="text-xs text-blue-400 mt-1">
              ${amountPaid.toFixed(2)} paid
            </div>
          )}
          {discountPercent > 0 && !hasPayments && (
            <div className="text-xs text-green-400 mt-1">
              ({discountPercent.toFixed(1)}% discount applied)
            </div>
          )}
        </div>
      </div>

      {/* Bill To / Competition Info */}
      <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-white/20">
        {/* Studio (Bill To) */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">BILL TO</h3>
          <div className="text-white">
            <p className="font-bold text-lg mb-1">
              {invoice.studio.name}
              {invoice.studio.code && <span className="text-sm text-gray-400 ml-2">({invoice.studio.code})</span>}
            </p>
            {invoice.studio.address1 && <p>{invoice.studio.address1}</p>}
            {invoice.studio.address2 && <p>{invoice.studio.address2}</p>}
            {invoice.studio.city && invoice.studio.province && (
              <p>
                {invoice.studio.city}, {invoice.studio.province} {invoice.studio.postal_code}
              </p>
            )}
            {invoice.studio.country && <p>{invoice.studio.country}</p>}
            {invoice.studio.email && <p className="mt-2">Email: {invoice.studio.email}</p>}
            {invoice.studio.phone && <p>Phone: {invoice.studio.phone}</p>}
          </div>
        </div>

        {/* Competition Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">COMPETITION</h3>
          <div className="text-white">
            <p className="font-bold text-lg mb-1">{invoice.competition.name}</p>
            <p>Year: {invoice.competition.year}</p>
            {invoice.competition.startDate && (
              <p>
                Date: {formatCompetitionDate(invoice.competition.startDate)}
                {invoice.competition.endDate && invoice.competition.startDate !== invoice.competition.endDate && (
                  <> - {formatCompetitionEndDate(invoice.competition.endDate)}</>
                )}
              </p>
            )}
            {invoice.competition.location && <p className="mt-2">{invoice.competition.location}</p>}
          </div>
        </div>
      </div>

      {/* Reservation Info (if exists) */}
      {invoice.reservation && (
        <div className="mb-8 pb-8 border-b border-white/20">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">RESERVATION DETAILS</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-black/20 p-4 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Routines Submitted</div>
              <div className="text-xl font-bold text-green-400">{invoice.lineItems.length}</div>
            </div>
            <div className="bg-black/20 p-4 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Deposit</div>
              <div className="text-xl font-bold text-white">
                ${depositAmount.toFixed(2)}
              </div>
            </div>
            <div className="bg-black/20 p-4 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Payment Status</div>
              <div className={`text-sm font-semibold ${
                invoice.reservation.paymentStatus === 'paid'
                  ? 'text-green-400'
                  : invoice.reservation.paymentStatus === 'pending'
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}>
                {invoice.reservation.paymentStatus?.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Line Items */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-400">ROUTINES</h3>
          {canEditPrices && !isEditingPrices && (
            <button
              onClick={handleStartEditing}
              className="px-4 py-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all text-sm font-semibold"
            >
              ✏️ Edit Prices
            </button>
          )}
          {isEditingPrices && (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEditing}
                className="px-4 py-2 bg-white/10 border border-white/20 text-gray-300 rounded-lg hover:bg-white/20 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdits}
                disabled={updateLineItemsMutation.isPending}
                className="px-4 py-2 bg-green-500/20 border border-green-400/30 text-green-300 rounded-lg hover:bg-green-500/30 transition-all text-sm font-semibold disabled:opacity-50"
              >
                {updateLineItemsMutation.isPending ? 'Saving...' : '✓ Save Changes'}
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400 uppercase bg-black/40">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Routine Title</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Size</th>
                <th className="px-4 py-3 text-left">Dancers</th>
                <th className="px-4 py-3 text-right">Routine Fee</th>
                <th className="px-4 py-3 text-right">Late Fee</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(isEditingPrices ? editableLineItems : displayLineItems).map((item, index) => (
                <tr key={item.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3 text-gray-400">{item.entryNumber || index + 1}</td>
                  <td className="px-4 py-3 text-white font-semibold">{item.title}</td>
                  <td className="px-4 py-3 text-gray-300">{item.category}</td>
                  <td className="px-4 py-3 text-gray-300">{item.sizeCategory}</td>
                  <td className="px-4 py-3 text-gray-300">{item.participantCount}</td>
                  <td className="px-4 py-3 text-right text-white">
                    {isEditingPrices ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.entryFee}
                        onChange={(e) => updateLineItem(index, 'entryFee', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 bg-white/10 border border-white/30 rounded text-right text-white"
                      />
                    ) : (
                      `$${(item.entryFee ?? 0).toFixed(2)}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-yellow-400">
                    {isEditingPrices ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.lateFee}
                        onChange={(e) => updateLineItem(index, 'lateFee', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 bg-white/10 border border-white/30 rounded text-right text-white"
                      />
                    ) : (
                      item.lateFee > 0 ? `$${(item.lateFee ?? 0).toFixed(2)}` : '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-white font-semibold">
                    ${(item.total ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discount Input - Only for Competition Directors */}
      {isCompetitionDirector && (
        <div className="mb-6 flex justify-end">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 mr-2">Discount:</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="0"
              value={customDiscountInput}
              onChange={(e) => setCustomDiscountInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && dbInvoice) {
                  const percent = parseFloat(customDiscountInput) || 0;
                  if (percent >= 0 && percent <= 100) {
                    applyDiscountMutation.mutate({
                      invoiceId: dbInvoice.id,
                      discountPercentage: percent,
                    });
                  }
                }
              }}
              disabled={!dbInvoice || applyDiscountMutation.isPending}
              className="w-20 px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-right disabled:opacity-50"
            />
            <span className="text-gray-300">%</span>
            <button
              onClick={() => {
                if (!dbInvoice) return;
                const percent = parseFloat(customDiscountInput) || 0;
                if (percent < 0 || percent > 100) {
                  toast.error('Discount must be between 0% and 100%');
                  return;
                }
                applyDiscountMutation.mutate({
                  invoiceId: dbInvoice.id,
                  discountPercentage: percent,
                });
              }}
              disabled={!dbInvoice || applyDiscountMutation.isPending}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold text-sm hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
            >
              {applyDiscountMutation.isPending ? 'Applying...' : 'Apply'}
            </button>
            {discountPercent > 0.01 && (
              <button
                onClick={() => {
                  if (!dbInvoice) return;
                  setCustomDiscountInput('');
                  applyDiscountMutation.mutate({
                    invoiceId: dbInvoice.id,
                    discountPercentage: 0,
                  });
                }}
                disabled={!dbInvoice || applyDiscountMutation.isPending}
                className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg font-semibold text-sm hover:bg-red-500/30 transition-all disabled:opacity-50"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setShowCreditModal(true)}
              className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg font-semibold text-sm hover:bg-purple-500/30 transition-all ml-4"
            >
              Other Credits
            </button>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full md:w-1/2 lg:w-1/3 space-y-2">
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-gray-300">Subtotal ({currentLineItems.length} routines)</span>
            <span className="text-white font-semibold">${currentSubtotal.toFixed(2)}</span>
          </div>

          {discountPercent > 0 && (
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-green-400">Discount ({discountPercent.toFixed(1)}%)</span>
              <span className="text-green-400">-${creditAmount.toFixed(2)}</span>
            </div>
          )}

          {/* Show each additional credit separately */}
          {additionalCredits && additionalCredits.length > 0 ? (
            additionalCredits.map((credit, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-purple-400">
                  {credit.note || `Credit ${idx + 1}`}
                </span>
                <span className="text-purple-400">-${credit.amount.toFixed(2)}</span>
              </div>
            ))
          ) : otherCreditAmount > 0 && (
            // Fallback: show old single credit field
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-purple-400">Other Credits{dbInvoice?.other_credit_reason && `: ${dbInvoice.other_credit_reason}`}</span>
              <span className="text-purple-400">-${otherCreditAmount.toFixed(2)}</span>
            </div>
          )}

          {taxAmount > 0 && (
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-gray-300">Tax ({(taxRate * 100).toFixed(2)}%)</span>
              <span className="text-white">${taxAmount.toFixed(2)}</span>
            </div>
          )}

          {/* Invoice Total (before deposit) */}
          <div className="flex justify-between py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-4 rounded-lg border-b border-white/10">
            <span className="text-white font-bold text-lg">INVOICE TOTAL</span>
            <span className="text-blue-300 font-bold text-2xl">
              ${invoiceTotal.toFixed(2)}
            </span>
          </div>

          {/* Deposit (if applicable) */}
          {depositAmount > 0 && (
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-yellow-400">LESS: Deposit Paid</span>
              <span className="text-yellow-400">-${depositAmount.toFixed(2)}</span>
            </div>
          )}

          {/* When payments exist: show Balance Remaining as primary */}
          {hasPayments ? (
            <>
              {/* Original balance (smaller, secondary) */}
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-gray-400">Original Balance:</span>
                <span className="text-gray-300">${balanceDue.toFixed(2)}</span>
              </div>
              {/* Amount paid */}
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-blue-400">Amount Paid:</span>
                <span className="text-blue-400">-${amountPaid.toFixed(2)}</span>
              </div>
              {/* Balance Remaining - PRIMARY display */}
              <div className="flex justify-between py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 rounded-lg">
                <span className="text-white font-bold text-lg">BALANCE REMAINING</span>
                <span className="text-green-400 font-bold text-2xl">
                  ${balanceRemaining.toFixed(2)}
                </span>
              </div>
            </>
          ) : (
            /* No payments: show Balance Due as primary */
            <div className="flex justify-between py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 rounded-lg">
              <span className="text-white font-bold text-lg">BALANCE DUE</span>
              <span className="text-green-400 font-bold text-2xl">
                ${balanceDue.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 pt-8 border-t border-white/20 space-y-4">
        {/* Invoice Status Actions (Competition Directors only) */}
        {dbInvoice && (
          <div className="flex gap-4 mb-4">
            {dbInvoice.status === 'DRAFT' && (
              <button
                onClick={() => sendInvoiceMutation.mutate({ invoiceId: dbInvoice.id })}
                disabled={sendInvoiceMutation.isPending}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 font-semibold"
              >
                {sendInvoiceMutation.isPending ? '📤 Sending...' : '📤 Send Invoice to Studio'}
              </button>
            )}
            {dbInvoice.status === 'SENT' && (
              <>
                {isStudioDirector ? (
                  // Studio Directors see read-only status (payment happens externally)
                  <div className="flex-1 bg-blue-500/20 border-2 border-blue-500/50 text-blue-300 px-6 py-3 rounded-lg font-semibold text-center">
                    📋 Invoice Sent - Awaiting payment
                  </div>
                ) : (
                  // Competition Directors can record partial payments or mark as fully paid
                  <>
                    <div className="flex-1 bg-yellow-500/20 border-2 border-yellow-500/50 text-yellow-300 px-6 py-3 rounded-lg font-semibold text-center">
                      ⏳ Awaiting External Payment from Studio
                    </div>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all font-semibold"
                    >
                      💵 Apply Partial Payment
                    </button>
                    <button
                      onClick={() => markAsPaidMutation.mutate({ invoiceId: dbInvoice.id, paymentMethod: 'manual' })}
                      disabled={markAsPaidMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 font-semibold"
                    >
                      {markAsPaidMutation.isPending ? '✓ Confirming...' : '✓ Mark as Paid (Full)'}
                    </button>
                  </>
                )}
              </>
            )}
            {dbInvoice.status === 'PAID' && (
              <div className="flex-1 bg-green-500/20 border-2 border-green-500/50 text-green-300 px-6 py-3 rounded-lg font-semibold text-center flex items-center justify-center gap-2">
                <span className="text-2xl">✓</span>
                <span>Invoice Paid - {dbInvoice.paidAt ? formatDate(dbInvoice.paidAt, true) : 'Recently'}</span>
              </div>
            )}
            {isVoided && (
              <div className="flex-1 bg-red-500/20 border-2 border-red-500/50 text-red-300 px-6 py-3 rounded-lg font-semibold text-center">
                Invoice Voided
              </div>
            )}
          </div>
        )}

        {/* Create New Invoice button (for voided invoices) */}
        {isVoided && isCompetitionDirector && dbInvoice && (
          <div className="mt-4">
            <button
              onClick={handleCreateFromVoided}
              disabled={createFromVoidedMutation.isPending}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {createFromVoidedMutation.isPending ? 'Creating...' : 'Create New Invoice'}
            </button>
          </div>
        )}

        {/* Void Invoice Only button (for SENT invoices, keeps summary closed) */}
        {dbInvoice && isCompetitionDirector && dbInvoice.status === 'SENT' && (
          <div className="mt-4">
            <button
              onClick={handleVoidInvoice}
              disabled={voidInvoiceMutation.isPending}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {voidInvoiceMutation.isPending ? 'Voiding...' : 'Void Invoice Only'}
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Void to make changes and create new invoice. Summary stays closed.
            </p>
          </div>
        )}

        {/* Reopen Summary Button (Competition Directors only, not for paid invoices) */}
        {dbInvoice && isCompetitionDirector && (dbInvoice.status === 'DRAFT' || dbInvoice.status === 'SENT') && invoice?.reservation?.id && (
          <div className="mt-4">
            <button
              onClick={handleReopenSummary}
              disabled={reopenSummaryMutation.isPending}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 font-semibold"
            >
              {reopenSummaryMutation.isPending ? '🔄 Reopening...' : '🔄 Void Invoice & Reopen Summary'}
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Use this if studio needs to make changes after submitting summary. Invoice will be voided and studio can edit entries.
            </p>
          </div>
        )}

        {/* Studio Director: Split Invoice / View Dancer Invoices */}
        {isStudioDirector && !isCompetitionDirector && dbInvoice && (
          <div className="mb-4">
            {hasSubInvoices ? (
              <button
                onClick={() => setShowSubInvoices(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all font-semibold"
              >
                👤 View Dancer Invoices ({subInvoicesData?.summary.count || 0})
              </button>
            ) : (
              <div>
                <button
                  onClick={() => setShowSplitWizard(true)}
                  disabled={dbInvoice.status !== 'PAID'}
                  className={`w-full px-6 py-3 rounded-lg transition-all font-semibold ${
                    dbInvoice.status === 'PAID'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  ✂️ Split Invoice by Dancer
                </button>
                {dbInvoice.status !== 'PAID' && (
                  <p className="text-sm text-yellow-400 mt-2">
                    💡 Mark invoice as PAID before splitting by dancer. This ensures pricing is finalized.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Export Actions */}
        <div className="flex gap-4">
        <button
          onClick={() => window.print()}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
        >
          🖨️ Print Invoice
        </button>
        <button
          onClick={() => {
            // Ensure invoice includes credit/discount info from database
            const invoiceWithCredit = {
              ...invoice,
              summary: {
                ...invoice.summary,
                creditAmount: creditAmount,
                creditReason: dbInvoice?.credit_reason || null,
                otherCreditAmount: otherCreditAmount,
                otherCreditReason: dbInvoice?.other_credit_reason || null,
                depositAmount: depositAmount,
              }
            };
            console.log('[InvoiceDetail] Generating PDF with credits:', {
              percentageDiscount: creditAmount,
              creditReason: dbInvoice?.credit_reason,
              otherCredit: otherCreditAmount,
              otherCreditReason: dbInvoice?.other_credit_reason,
              depositAmount
            });
            const pdfBlob = generateInvoicePDF(invoiceWithCredit);
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }}
          className="flex-1 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg transition-all"
        >
          📥 Download PDF
        </button>
        <button
          onClick={() => {
            // Generate CSV content
            const headers = ['#', 'Routine Title', 'Category', 'Size', 'Participants Count', 'Routine Fee', 'Late Fee', 'Total'];
            const rows = invoice.lineItems.map((item, index) => [
              item.entryNumber || index + 1,
              item.title,
              item.category,
              item.sizeCategory,
              item.participantCount,
              `$${(item.entryFee ?? 0).toFixed(2)}`,
              `$${(item.lateFee ?? 0).toFixed(2)}`,
              `$${(item.total ?? 0).toFixed(2)}`
            ]);

            // Add summary rows
            rows.push([]);
            rows.push(['', '', '', '', '', '', 'Subtotal:', `$${(invoice.summary?.subtotal ?? 0).toFixed(2)}`]);
            rows.push(['', '', '', '', '', '', `Tax (${invoice.summary?.taxRate ?? 0}%):`, `$${(invoice.summary?.taxAmount ?? 0).toFixed(2)}`]);
            rows.push(['', '', '', '', '', '', 'Total:', `$${(invoice.summary?.totalAmount ?? 0).toFixed(2)}`]);

            // Convert to CSV
            const csvContent = [headers, ...rows]
              .map(row => row.map(cell => `"${cell}"`).join(','))
              .join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Invoice-${invoice.invoiceNumber}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }}
          className="flex-1 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg transition-all"
        >
          📊 Export CSV
        </button>
      </div>
      </div>

      {/* Payment History (show if invoice exists in database) */}
      {dbInvoice && isCompetitionDirector && (
        <div className="mt-8">
          <PaymentHistoryTable invoiceId={dbInvoice.id} />
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-8 border-t border-white/20 text-center text-sm text-gray-400">
        <p>Thank you for participating in {invoice.competition.name}!</p>
        <p className="mt-2">For questions about this invoice, please contact the competition organizers.</p>
      </div>

      {/* Credits Modal - Multiple credits support */}
      {showCreditModal && dbInvoice && portalMounted && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-gray-900/95 backdrop-blur-md border border-white/20 p-6 rounded-xl max-w-lg w-full shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2">Manage Credits</h3>
              <p className="text-sm text-gray-400 mb-4">
                Add multiple credits/discounts. Each will be shown separately on the invoice.
              </p>

              {/* Credits list */}
              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {creditsInput.map((credit, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-white/5 p-3 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={credit.amount || ''}
                        onChange={(e) => {
                          const updated = [...creditsInput];
                          updated[idx].amount = parseFloat(e.target.value) || 0;
                          setCreditsInput(updated);
                        }}
                        placeholder="Amount"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 text-sm"
                      />
                      <input
                        type="text"
                        value={credit.note}
                        onChange={(e) => {
                          const updated = [...creditsInput];
                          updated[idx].note = e.target.value;
                          setCreditsInput(updated);
                        }}
                        placeholder="Note (e.g., Glow Dollars, Early Bird)"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const updated = creditsInput.filter((_, i) => i !== idx);
                        setCreditsInput(updated);
                      }}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Remove credit"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {creditsInput.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    No credits added. Click "Add Credit" to start.
                  </div>
                )}
              </div>

              {/* Add credit button */}
              <button
                onClick={() => setCreditsInput([...creditsInput, { amount: 0, note: '' }])}
                className="w-full px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all font-semibold mb-4"
              >
                + Add Credit
              </button>

              {/* Total preview */}
              {creditsInput.length > 0 && (
                <div className="bg-white/5 p-3 rounded-lg mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Credits:</span>
                    <span className="text-purple-400 font-semibold">
                      -${creditsInput.reduce((sum, c) => sum + (c.amount || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    // Filter out empty credits
                    const validCredits = creditsInput.filter(c => c.amount > 0);
                    updateAdditionalCreditsMutation.mutate({
                      invoiceId: dbInvoice.id,
                      credits: validCredits,
                    });
                  }}
                  disabled={updateAdditionalCreditsMutation.isPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50"
                >
                  {updateAdditionalCreditsMutation.isPending ? 'Saving...' : 'Save Credits'}
                </button>
                <button
                  onClick={() => {
                    setCreditsInput([]);
                    setShowCreditModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Split Invoice Wizard Modal */}
      {showSplitWizard && dbInvoice && (
        <SplitInvoiceWizard
          invoiceId={dbInvoice.id}
          onClose={() => setShowSplitWizard(false)}
          onSuccess={() => {
            setShowSplitWizard(false);
            setShowSubInvoices(true);
            refetch();
          }}
        />
      )}

      {/* Sub-Invoices View - rendered via Portal to document.body */}
      {showSubInvoices && dbInvoice && portalMounted && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="w-full max-w-6xl max-h-[85vh] overflow-y-auto">
              <SubInvoiceList
                parentInvoiceId={dbInvoice.id}
                onBack={() => setShowSubInvoices(false)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Apply Partial Payment Modal */}
      {showPaymentModal && dbInvoice && (
        <ApplyPartialPaymentModal
          invoiceId={dbInvoice.id}
          currentBalance={dbInvoice.balance_remaining ? parseFloat(dbInvoice.balance_remaining.toString()) : balanceDue}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}
