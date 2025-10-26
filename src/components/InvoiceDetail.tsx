'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { generateInvoicePDF } from '@/lib/pdf-reports';
import toast from 'react-hot-toast';

type Props = {
  studioId: string;
  competitionId: string;
};

export default function InvoiceDetail({ studioId, competitionId }: Props) {
  const [discountPercent, setDiscountPercent] = useState(0);
  const [otherCredit, setOtherCredit] = useState({ amount: 0, reason: "" });
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [isEditingPrices, setIsEditingPrices] = useState(false);
  const [editableLineItems, setEditableLineItems] = useState<any[]>([]);

  // Get current user role
  const { data: userProfile } = trpc.user.getCurrentUser.useQuery();
  const isStudioDirector = userProfile?.role === 'studio_director';
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
  const taxAmount = currentSubtotal * taxRate;
  const totalAfterDiscount = currentSubtotal * (1 - discountPercent / 100);
  const totalWithTax = totalAfterDiscount * (1 + taxRate);
  const totalAmount = Math.max(0, totalWithTax - otherCredit.amount);

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
            Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400 mb-1">Total Amount</div>
          <div className="text-4xl font-bold text-green-400">
            ${totalAmount.toFixed(2)}
          </div>
          {discountPercent > 0 && (
            <div className="text-xs text-green-400 mt-1">
              ({discountPercent}% discount applied)
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
            <p className="font-bold text-lg mb-1">{invoice.studio.name}</p>
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
                Date: {new Date(invoice.competition.startDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {invoice.competition.endDate && invoice.competition.startDate !== invoice.competition.endDate && (
                  <> - {new Date(invoice.competition.endDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                  })}</>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black/20 p-4 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Routines Requested</div>
              <div className="text-xl font-bold text-white">{invoice.reservation.spacesRequested}</div>
            </div>
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
              onClick={() => setDiscountPercent(discountPercent === 5 ? 0 : 5)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                discountPercent === 5
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
              }`}
            >
              5%
            </button>
            <button
              onClick={() => setDiscountPercent(discountPercent === 10 ? 0 : 10)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                discountPercent === 10
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
              }`}
            >
              10%
            </button>
            <button
              onClick={() => setDiscountPercent(discountPercent === 15 ? 0 : 15)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                discountPercent === 15
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20'
              }`}
            >
              15%
            </button>
            {discountPercent > 0 && (
              <button
                onClick={() => setDiscountPercent(0)}
                className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg font-semibold text-sm hover:bg-red-500/30 transition-all"
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
              <span className="text-green-400">Discount ({discountPercent}%)</span>
              <span className="text-green-400">-${((currentSubtotal * discountPercent) / 100).toFixed(2)}</span>
            </div>
          )}

          {taxAmount > 0 && (
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-gray-300">Tax ({(taxRate * 100).toFixed(2)}%)</span>
              <span className="text-white">${(((currentSubtotal * (1 - discountPercent / 100)) * taxRate)).toFixed(2)}</span>
            </div>
          )}
          {otherCredit.amount > 0 && (
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-purple-400">Other Credits{otherCredit.reason && `: ${otherCredit.reason}`}</span>
              <span className="text-purple-400">-${otherCredit.amount.toFixed(2)}</span>
            </div>
          )}
          {otherCredit.amount > 0 && (
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-purple-400">Other Credits{otherCredit.reason && `: ${otherCredit.reason}`}</span>
              <span className="text-purple-400">-${otherCredit.amount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 rounded-lg">
            <span className="text-white font-bold text-lg">TOTAL</span>
            <span className="text-green-400 font-bold text-2xl">
              ${totalAmount.toFixed(2)}
            </span>
          </div>
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
                  // Competition Directors can mark as paid
                  <>
                    <div className="flex-1 bg-yellow-500/20 border-2 border-yellow-500/50 text-yellow-300 px-6 py-3 rounded-lg font-semibold text-center">
                      ⏳ Awaiting External Payment from Studio
                    </div>
                    <button
                      onClick={() => markAsPaidMutation.mutate({ invoiceId: dbInvoice.id, paymentMethod: 'manual' })}
                      disabled={markAsPaidMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 font-semibold"
                    >
                      {markAsPaidMutation.isPending ? '✓ Confirming...' : '✓ Mark as Paid'}
                    </button>
                  </>
                )}
              </>
            )}
            {dbInvoice.status === 'PAID' && (
              <div className="flex-1 bg-green-500/20 border-2 border-green-500/50 text-green-300 px-6 py-3 rounded-lg font-semibold text-center flex items-center justify-center gap-2">
                <span className="text-2xl">✓</span>
                <span>Invoice Paid - {dbInvoice.paidAt ? new Date(dbInvoice.paidAt).toLocaleDateString() : 'Recently'}</span>
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
            const pdfBlob = generateInvoicePDF(invoice);
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

      {/* Footer */}
      <div className="mt-8 pt-8 border-t border-white/20 text-center text-sm text-gray-400">
        <p>Thank you for participating in {invoice.competition.name}!</p>
        <p className="mt-2">For questions about this invoice, please contact the competition organizers.</p>
      </div>

      {/* Other Credits Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Add Other Credits</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Credit Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={otherCredit.amount}
                  onChange={(e) => setOtherCredit({ ...otherCredit, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Reason</label>
                <input
                  type="text"
                  value={otherCredit.reason}
                  onChange={(e) => setOtherCredit({ ...otherCredit, reason: e.target.value })}
                  placeholder="e.g., Early bird discount, Loyalty credit"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowCreditModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setOtherCredit({ amount: 0, reason: "" });
                  setShowCreditModal(false);
                }}
                className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
