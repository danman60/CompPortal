'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Discount {
  studioId: string;
  competitionId: string;
  amount: number;
  percentage: number;
  type: 'fixed' | 'percentage';
}

export default function RoutineSummaries() {
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [discounts, setDiscounts] = useState<Map<string, Discount>>(new Map());

  // Fetch all invoices/summaries
  const { data: invoicesData, refetch } = trpc.invoice.getAllInvoices.useQuery({
    competitionId: selectedCompetition !== 'all' ? selectedCompetition : undefined,
  });

  // Fetch competitions for filter
  const { data: competitionsData } = trpc.competition.getAll.useQuery();

  const createInvoiceMutation = trpc.invoice.createFromReservation.useMutation({
    onSuccess: () => {
      toast.success('Invoice created successfully!');
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const invoices = invoicesData?.invoices || [];
  const competitions = competitionsData?.competitions || [];

  const handleDiscountChange = (studioId: string, competitionId: string, type: 'fixed' | 'percentage', value: number) => {
    const key = `${studioId}-${competitionId}`;
    const discount: Discount = {
      studioId,
      competitionId,
      amount: type === 'fixed' ? value : 0,
      percentage: type === 'percentage' ? value : 0,
      type,
    };
    setDiscounts(new Map(discounts.set(key, discount)));
  };

  const calculateDiscountedTotal = (invoice: any) => {
    const key = `${invoice.studioId}-${invoice.competitionId}`;
    const discount = discounts.get(key);

    if (!discount) return invoice.totalAmount;

    if (discount.type === 'fixed') {
      return Math.max(0, invoice.totalAmount - discount.amount);
    } else {
      return invoice.totalAmount * (1 - discount.percentage / 100);
    }
  };

  const handleCreateInvoice = async (invoice: any) => {
    if (!invoice.reservation?.id) {
      toast.error('No reservation found for this studio/competition');
      return;
    }

    await createInvoiceMutation.mutateAsync({
      reservationId: invoice.reservation.id,
      spacesConfirmed: invoice.reservation.spacesConfirmed,
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Link
        href="/dashboard"
        className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block"
      >
        ← Back to Dashboard
      </Link>

      <h1 className="text-4xl font-bold text-white mb-2">Routine Summaries</h1>
      <p className="text-gray-400 mb-8">
        Review routine submissions by studio and apply discounts before generating invoices
      </p>

      {/* Competition Filter */}
      <div className="mb-6">
        <label className="block text-sm text-gray-300 mb-2">Filter by Competition</label>
        <select
          value={selectedCompetition}
          onChange={(e) => setSelectedCompetition(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
        >
          <option value="all" className="bg-gray-900">All Competitions</option>
          {competitions.map((comp: any) => (
            <option key={comp.id} value={comp.id} className="bg-gray-900">
              {comp.name} ({comp.year})
            </option>
          ))}
        </select>
      </div>

      {/* Summaries Table */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Studio</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Competition</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-white">Routines</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-white">Subtotal</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-white">Discount</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-white">Total</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  No routine submissions found
                </td>
              </tr>
            ) : (
              invoices.map((invoice: any) => {
                const key = `${invoice.studioId}-${invoice.competitionId}`;
                const discount = discounts.get(key);
                const discountedTotal = calculateDiscountedTotal(invoice);
                const discountAmount = invoice.totalAmount - discountedTotal;

                return (
                  <tr key={key} className="border-b border-white/10 hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{invoice.studioName}</div>
                      <div className="text-xs text-gray-400">{invoice.studioCity}, {invoice.studioProvince}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white">{invoice.competitionName}</div>
                      <div className="text-xs text-gray-400">{invoice.competitionYear}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-white font-semibold">{invoice.entryCount}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-white font-semibold">${invoice.totalAmount.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={discount?.type || 'fixed'}
                          onChange={(e) => {
                            const type = e.target.value as 'fixed' | 'percentage';
                            handleDiscountChange(
                              invoice.studioId,
                              invoice.competitionId,
                              type,
                              type === 'fixed' ? (discount?.amount || 0) : (discount?.percentage || 0)
                            );
                          }}
                          className="px-2 py-1 bg-white/5 border border-white/20 rounded text-white text-xs"
                        >
                          <option value="fixed" className="bg-gray-900">$</option>
                          <option value="percentage" className="bg-gray-900">%</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          step={discount?.type === 'fixed' ? "0.01" : "1"}
                          value={discount?.type === 'fixed' ? (discount?.amount || 0) : (discount?.percentage || 0)}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            handleDiscountChange(
                              invoice.studioId,
                              invoice.competitionId,
                              discount?.type || 'fixed',
                              value
                            );
                          }}
                          className="w-20 px-2 py-1 bg-white/5 border border-white/20 rounded text-white text-sm"
                        />
                      </div>
                      {discountAmount > 0 && (
                        <div className="text-xs text-green-400 mt-1">
                          -${discountAmount.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`text-lg font-bold ${discountAmount > 0 ? 'text-green-400' : 'text-white'}`}>
                        ${discountedTotal.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleCreateInvoice(invoice)}
                        disabled={createInvoiceMutation.isPending || !invoice.reservation}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
                      </button>
                      {!invoice.reservation && (
                        <div className="text-xs text-red-400 mt-1">No reservation</div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      {invoices.length > 0 && (
        <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Routines</div>
              <div className="text-3xl font-bold text-white">
                {invoices.reduce((sum: number, inv: any) => sum + inv.entryCount, 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Revenue (Before Discounts)</div>
              <div className="text-3xl font-bold text-white">
                ${invoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Revenue (After Discounts)</div>
              <div className="text-3xl font-bold text-green-400">
                ${invoices.reduce((sum: number, inv: any) => sum + calculateDiscountedTotal(inv), 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
