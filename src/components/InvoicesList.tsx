'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { generateInvoicePDF } from '@/lib/pdf-reports';

interface InvoicesListProps {
  studioId?: string; // If provided, hard-lock to this studio (studio director)
}

export default function InvoicesList({ studioId }: InvoicesListProps) {
  const { data: studios } = trpc.studio.getAll.useQuery(undefined, {
    enabled: !studioId, // Only fetch all studios if not locked to one
  });

  // Fetch single studio if studioId is provided (studio director)
  const { data: singleStudio } = trpc.studio.getById.useQuery(
    { id: studioId! },
    { enabled: !!studioId }
  );

  const [selectedStudioId, setSelectedStudioId] = useState<string>(studioId || '');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  // Utility function for invoice download
  const utils = trpc.useUtils();

  // Auto-select studio if studioId prop is provided
  useEffect(() => {
    if (studioId) {
      setSelectedStudioId(studioId);
    }
  }, [studioId]);

  const { data: invoicesData, isLoading } = trpc.invoice.getByStudio.useQuery(
    { studioId: selectedStudioId },
    { enabled: !!selectedStudioId }
  );

  // Only show studio selector for competition directors (no studioId prop)
  if (!selectedStudioId && !studioId) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
        <div className="text-6xl mb-4">💰</div>
        <h3 className="text-xl font-semibold text-white mb-4">Select a Studio</h3>
        <p className="text-gray-400 mb-6">Choose a studio to view their invoices</p>

        <select
          value={selectedStudioId}
          onChange={(e) => setSelectedStudioId(e.target.value)}
          className="px-6 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="" className="bg-gray-900 text-white">Select Studio</option>
          {studios?.studios.map((studio) => (
            <option key={studio.id} value={studio.id} className="bg-gray-900 text-white">
              {studio.name} ({studio.code})
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
            <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-white/20 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const invoices = invoicesData?.invoices || [];
  const selectedStudio = studioId
    ? singleStudio
    : studios?.studios.find(s => s.id === selectedStudioId);

  return (
    <div>
      {/* Studio Selector - only show for competition directors */}
      {!studioId && (
        <div className="mb-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Selected Studio
          </label>
          <select
            value={selectedStudioId}
            onChange={(e) => setSelectedStudioId(e.target.value)}
            className="w-full md:w-auto px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="" className="bg-gray-900 text-white">Select Studio</option>
            {studios?.studios.map((studio) => (
              <option key={studio.id} value={studio.id} className="bg-gray-900 text-white">
                {studio.name} ({studio.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Invoices Grid */}
      {invoices.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Invoices Found</h3>
          <p className="text-gray-400">
            {selectedStudio?.name} has no registered routines yet.
          </p>
        </div>
      ) : (
        <>
          {/* Studio Summary */}
          <div className="mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border border-purple-400/30 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{selectedStudio?.name}</h2>
                <p className="text-gray-300">Studio Code: {selectedStudio?.code}</p>
                {selectedStudio?.city && selectedStudio?.province && (
                  <p className="text-gray-300">
                    {selectedStudio.city}, {selectedStudio.province}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-300 mb-1">Total Competitions</div>
                <div className="text-3xl font-bold text-white">{invoices.length}</div>
              </div>
            </div>
          </div>

          {/* Invoices */}
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.competitionId}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {invoice.competitionName} ({invoice.competitionYear})
                    </h3>
                    {invoice.startDate && (
                      <p className="text-sm text-gray-400">
                        {new Date(invoice.startDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">
                      ${invoice.totalAmount.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {invoice.entryCount} {invoice.entryCount === 1 ? 'routine' : 'routines'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/invoices/${selectedStudioId}/${invoice.competitionId}`}
                    className="flex-1 text-center bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
                  >
                    View Invoice
                  </Link>
                  <button
                    onClick={async () => {
                      try {
                        setDownloadingInvoiceId(invoice.competitionId);
                        // Fetch full invoice data
                        const invoiceData = await utils.invoice.generateForStudio.fetch({
                          studioId: selectedStudioId,
                          competitionId: invoice.competitionId,
                        });

                        if (invoiceData) {
                          // Generate PDF
                          const pdfBlob = generateInvoicePDF(invoiceData);
                          const url = URL.createObjectURL(pdfBlob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `Invoice-${invoiceData.invoiceNumber}.pdf`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }
                      } catch (error) {
                        console.error('Download error:', error);
                        alert('Failed to download invoice. Please try again.');
                      } finally {
                        setDownloadingInvoiceId(null);
                      }
                    }}
                    disabled={downloadingInvoiceId === invoice.competitionId}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingInvoiceId === invoice.competitionId ? '⏳' : '📥'} Download
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total Summary */}
          <div className="mt-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border border-green-400/30 p-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-300 mb-1">Total Across All Competitions</div>
                <div className="text-lg text-white">
                  {invoices.reduce((sum, inv) => sum + inv.entryCount, 0)} total routines
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-300 mb-1">Grand Total</div>
                <div className="text-3xl font-bold text-green-400">
                  ${invoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
