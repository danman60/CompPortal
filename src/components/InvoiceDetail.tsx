'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { generateInvoicePDF } from '@/lib/pdf-reports';

type Props = {
  studioId: string;
  competitionId: string;
};

export default function InvoiceDetail({ studioId, competitionId }: Props) {
  const [discountPercent, setDiscountPercent] = useState(0);

  const { data: invoice, isLoading } = trpc.invoice.generateForStudio.useQuery({
    studioId,
    competitionId,
  });

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
            ${((invoice.summary.subtotal * (1 - discountPercent / 100)) * (1 + invoice.summary.taxRate)).toFixed(2)}
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
              <div className="text-xs text-gray-400 mb-1">Routines Allocated</div>
              <div className="text-xl font-bold text-green-400">{invoice.reservation.spacesConfirmed}</div>
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
        <h3 className="text-sm font-semibold text-gray-400 mb-3">ROUTINES</h3>
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
              {invoice.lineItems.map((item, index) => (
                <tr key={item.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3 text-gray-400">{item.entryNumber || index + 1}</td>
                  <td className="px-4 py-3 text-white font-semibold">{item.title}</td>
                  <td className="px-4 py-3 text-gray-300">{item.category}</td>
                  <td className="px-4 py-3 text-gray-300">{item.sizeCategory}</td>
                  <td className="px-4 py-3 text-gray-300">{item.participantCount}</td>
                  <td className="px-4 py-3 text-right text-white">${item.entryFee.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-yellow-400">
                    {item.lateFee > 0 ? `$${item.lateFee.toFixed(2)}` : '-'}
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

      {/* Discount Buttons */}
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
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full md:w-1/2 lg:w-1/3 space-y-2">
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-gray-300">Subtotal ({invoice.summary.entryCount} routines)</span>
            <span className="text-white font-semibold">${invoice.summary.subtotal.toFixed(2)}</span>
          </div>

          {discountPercent > 0 && (
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-green-400">Discount ({discountPercent}%)</span>
              <span className="text-green-400">-${((invoice.summary.subtotal * discountPercent) / 100).toFixed(2)}</span>
            </div>
          )}

          {invoice.summary.taxAmount > 0 && (
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-gray-300">Tax ({(invoice.summary.taxRate * 100).toFixed(2)}%)</span>
              <span className="text-white">${(((invoice.summary.subtotal * (1 - discountPercent / 100)) * invoice.summary.taxRate)).toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 rounded-lg">
            <span className="text-white font-bold text-lg">TOTAL</span>
            <span className="text-green-400 font-bold text-2xl">
              ${((invoice.summary.subtotal * (1 - discountPercent / 100)) * (1 + invoice.summary.taxRate)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 pt-8 border-t border-white/20 flex gap-4">
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

      {/* Footer */}
      <div className="mt-8 pt-8 border-t border-white/20 text-center text-sm text-gray-400">
        <p>Thank you for participating in {invoice.competition.name}!</p>
        <p className="mt-2">For questions about this invoice, please contact the competition organizers.</p>
      </div>
    </div>
  );
}
