'use client';

import { useState, useEffect } from 'react';
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
  const [otherCreditInput, setOtherCreditInput] = useState({ amount: 0, reason: "" });
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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

  // Populate modal with existing credit values when opening
  useEffect(() => {
    if (showCreditModal && dbInvoice) {
      setOtherCreditInput({
        amount: Number(dbInvoice.other_credit_amount || 0),
        reason: dbInvoice.other_credit_reason || "",
      });
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
      setOtherCreditInput({ amount: 0, reason: "" });
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to apply credit: ${error.message}`);
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
  const taxRate = invoice?.summary.taxRate || 0;

  // Get discounts and credits from database (source of truth)
  const creditAmount = dbInvoice ? Number(dbInvoice.credit_amount || 0) : 0; // Percentage discount
  const otherCreditAmount = dbInvoice ? Number(dbInvoice.other_credit_amount || 0) : 0; // Fixed credit
  const discountPercent = currentSubtotal > 0 ? (creditAmount / currentSubtotal) * 100 : 0;

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
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 max-w-5xl mx-auto">
      {/* Manual Payment Banner */}
      <div className="bg-blue-500/20 border-2 border-blue-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
        <span className="text-2xl">💵</span>
        <div>
          <p className="text-blue-300 font-semibold">Manual Payment Only</p>
          <p className="text-blue-200 text-sm">Payments are handled offline via e-transfer, check, or other methods. Online payment processing coming soon.</p>
        </div>
      </div>

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
          <div className="text-sm text-gray-400 mb-1">Balance Due</div>
          <div className="text-4xl font-bold text-green-400">
            ${balanceDue.toFixed(2)}
          </div>
          {discountPercent > 0 && (
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
                ${invoice.reservation.depositAmount.toFixed(2)}
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
                      `$${item.entryFee.toFixed(2)}`
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
                      item.lateFee > 0 ? `$${item.lateFee.toFixed(2)}` : '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-white font-semibold">
                    ${item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discount Buttons - Only for Competition Directors */}
      {isCompetitionDirector && (
        <div className="mb-6 flex justify-end">
          <div className="flex gap-2">
            <span className="text-gray-300 self-center mr-2">Apply Discount:</span>
            <button
              onClick={() => {
                if (!dbInvoice) return;
                const newPercent = Math.abs(discountPercent - 5) < 0.01 ? 0 : 5;
                applyDiscountMutation.mutate({
                  invoiceId: dbInvoice.id,
                  discountPercentage: newPercent,
                });
              }}
              disabled={!dbInvoice || applyDiscountMutation.isPending}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 ${
                Math.abs(discountPercent - 5) < 0.01
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
              }`}
            >
              5%
            </button>
            <button
              onClick={() => {
                if (!dbInvoice) return;
                const newPercent = Math.abs(discountPercent - 10) < 0.01 ? 0 : 10;
                applyDiscountMutation.mutate({
                  invoiceId: dbInvoice.id,
                  discountPercentage: newPercent,
                });
              }}
              disabled={!dbInvoice || applyDiscountMutation.isPending}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 ${
                Math.abs(discountPercent - 10) < 0.01
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
              }`}
            >
              10%
            </button>
            <button
              onClick={() => {
                if (!dbInvoice) return;
                const newPercent = Math.abs(discountPercent - 15) < 0.01 ? 0 : 15;
                applyDiscountMutation.mutate({
                  invoiceId: dbInvoice.id,
                  discountPercentage: newPercent,
                });
              }}
              disabled={!dbInvoice || applyDiscountMutation.isPending}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 ${
                Math.abs(discountPercent - 15) < 0.01
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
              }`}
            >
              15%
            </button>
            {discountPercent > 0.01 && (
              <button
                onClick={() => {
                  if (!dbInvoice) return;
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
            💳 Other Credits
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

          {otherCreditAmount > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-purple-400">Other Credits{dbInvoice?.other_credit_reason && `: ${dbInvoice.other_credit_reason}`}</span>
              <div className="flex items-center gap-2">
                <span className="text-purple-400">-${otherCreditAmount.toFixed(2)}</span>
                {isCompetitionDirector && (
                  <button
                    onClick={() => {
                      if (!dbInvoice) return;
                      applyCustomCreditMutation.mutate({
                        invoiceId: dbInvoice.id,
                        creditAmount: 0,
                      });
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Remove credit"
                  >
                    ✕
                  </button>
                )}
              </div>
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

          {/* Balance Due (after deposit, before payments) */}
          {depositAmount > 0 && (
            <div className="flex justify-between py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 rounded-lg">
              <span className="text-white font-bold text-lg">BALANCE DUE</span>
              <span className="text-green-400 font-bold text-2xl">
                ${balanceDue.toFixed(2)}
              </span>
            </div>
          )}

          {/* If no deposit, just show total as balance due */}
          {depositAmount === 0 && (
            <div className="flex justify-between py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 rounded-lg">
              <span className="text-white font-bold text-lg">BALANCE DUE</span>
              <span className="text-green-400 font-bold text-2xl">
                ${balanceDue.toFixed(2)}
              </span>
            </div>
          )}

          {/* Payment Summary (show ONLY if partial payments have been applied) */}
          {dbInvoice && dbInvoice.amount_paid && parseFloat(dbInvoice.amount_paid.toString()) > 0 && (
            <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">Amount Paid:</span>
                <span className="text-purple-200 font-semibold">
                  ${parseFloat(dbInvoice.amount_paid.toString()).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-purple-500/20 pt-2">
                <span className="text-purple-300 font-semibold">Balance Remaining:</span>
                <span className="text-purple-100 font-bold text-lg">
                  ${(dbInvoice.balance_remaining ? parseFloat(dbInvoice.balance_remaining.toString()) : balanceDue).toFixed(2)}
                </span>
              </div>
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
                    📋 Invoice Sent - Payment will be confirmed by competition staff after external payment received (e-transfer, check, etc.)
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
              `$${item.entryFee.toFixed(2)}`,
              `$${item.lateFee.toFixed(2)}`,
              `$${item.total.toFixed(2)}`
            ]);

            // Add summary rows
            rows.push([]);
            rows.push(['', '', '', '', '', '', 'Subtotal:', `$${invoice.summary.subtotal.toFixed(2)}`]);
            rows.push(['', '', '', '', '', '', `Tax (${invoice.summary.taxRate}%):`, `$${invoice.summary.taxAmount.toFixed(2)}`]);
            rows.push(['', '', '', '', '', '', 'Total:', `$${invoice.summary.totalAmount.toFixed(2)}`]);

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

      {/* Other Credits Modal */}
      {showCreditModal && dbInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-xl max-w-md w-full mb-4">
            <h3 className="text-xl font-bold text-white mb-4">Apply Custom Credit</h3>
            <p className="text-sm text-gray-400 mb-4">
              Apply a fixed dollar credit (separate from percentage discounts). This credit will be visible to both Competition Directors and Studio Directors.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-blue-300 text-sm mb-2">Credit Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={otherCreditInput.amount}
                  onChange={(e) => setOtherCreditInput({ ...otherCreditInput, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                  placeholder={otherCreditAmount > 0 ? `Current: $${otherCreditAmount.toFixed(2)}` : 'Enter amount'}
                />
              </div>
              <div>
                <label className="block text-blue-300 text-sm mb-2">Reason (Optional)</label>
                <input
                  type="text"
                  value={otherCreditInput.reason}
                  onChange={(e) => setOtherCreditInput({ ...otherCreditInput, reason: e.target.value })}
                  placeholder={dbInvoice.other_credit_reason || "e.g., Loyalty credit, Refund, Compensation"}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  applyCustomCreditMutation.mutate({
                    invoiceId: dbInvoice.id,
                    creditAmount: otherCreditInput.amount,
                    creditReason: otherCreditInput.reason || undefined,
                  });
                }}
                disabled={applyCustomCreditMutation.isPending}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50"
              >
                {applyCustomCreditMutation.isPending ? 'Saving...' : 'Save Credit'}
              </button>
              <button
                onClick={() => {
                  setOtherCreditInput({ amount: 0, reason: "" });
                  setShowCreditModal(false);
                }}
                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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

      {/* Sub-Invoices View */}
      {showSubInvoices && dbInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 p-4">
          <div className="w-full max-w-6xl mb-4 max-h-[90vh] overflow-y-auto">
            <SubInvoiceList
              parentInvoiceId={dbInvoice.id}
              onBack={() => setShowSubInvoices(false)}
            />
          </div>
        </div>
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
