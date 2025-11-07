'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/rebuild/ui/Button';
import { FileText, Download, Mail, CheckCircle, AlertCircle, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import { generateInvoicePDF } from '@/lib/pdf-reports';
import JSZip from 'jszip';

type SubInvoiceListProps = {
  parentInvoiceId: string;
  onBack: () => void;
};

type DancerEmailData = {
  id: string;
  dancer_name: string;
  email: string;
  sendEmail: boolean;
};

export default function SubInvoiceList({
  parentInvoiceId,
  onBack,
}: SubInvoiceListProps) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState<DancerEmailData[]>([]);
  const { data, isLoading, error } = trpc.invoice.getSubInvoices.useQuery({
    parentInvoiceId,
  });

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg shadow border border-white/10">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-400">Loading dancer invoices...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg shadow border border-white/10">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p>Error loading sub-invoices: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!data || data.sub_invoices.length === 0) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg shadow border border-white/10">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-white">No Dancer Invoices</h3>
          <p className="text-sm text-gray-400 mb-6">
            This invoice has not been split yet.
          </p>
          <Button onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoice
          </Button>
        </div>
      </div>
    );
  }

  const { sub_invoices, summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1 text-white">Dancer Invoices</h2>
          <p className="text-sm text-gray-400">
            {summary.count} dancer{summary.count === 1 ? '' : 's'} · Total: ${summary.total.toFixed(2)}
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Main Invoice
        </Button>
      </div>

      {/* Validation Summary */}
      <div className={`p-4 rounded-lg shadow border ${summary.matches_parent ? 'bg-green-500/20 border-green-400/50' : 'bg-red-500/20 border-red-400/50'}`}>
        <div className="flex items-center gap-3">
          {summary.matches_parent ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div className="flex-1">
                <p className="font-medium text-green-200">Validation Passed</p>
                <p className="text-sm text-green-300">
                  All dancer invoices sum to main invoice total: ${summary.parent_total.toFixed(2)}
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div className="flex-1">
                <p className="font-medium text-red-200">Validation Error</p>
                <p className="text-sm text-red-300">
                  Sub-invoices total (${summary.total.toFixed(2)}) does not match main invoice (${summary.parent_total.toFixed(2)})
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            alert('Download All PDFs - Coming soon!');
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Download All PDFs
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            alert('Send All Emails - Coming soon!');
          }}
        >
          <Mail className="w-4 h-4 mr-2" />
          Send All Emails
        </Button>
      </div>

      {/* Sub-Invoice List */}
      <div className="bg-gray-900 rounded-lg shadow border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-sm text-gray-300">Dancer Name</th>
                <th className="text-left px-4 py-3 font-medium text-sm text-gray-300">Contact</th>
                <th className="text-right px-4 py-3 font-medium text-sm text-gray-300">Routines</th>
                <th className="text-right px-4 py-3 font-medium text-sm text-gray-300">Subtotal</th>
                <th className="text-right px-4 py-3 font-medium text-sm text-gray-300">Tax</th>
                <th className="text-right px-4 py-3 font-medium text-sm text-gray-300">Total</th>
                <th className="text-right px-4 py-3 font-medium text-sm text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sub_invoices.map((subInvoice) => {
                const lineItems = subInvoice.line_items as any[];
                const routineCount = lineItems.length;

                return (
                  <tr key={subInvoice.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{subInvoice.dancer_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-400">{subInvoice.dancer_id}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-300">{routineCount}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-gray-200">${Number(subInvoice.subtotal).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-sm text-gray-400">
                        ${Number(subInvoice.tax_amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-semibold text-white">${Number(subInvoice.total).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Link href={`/dashboard/invoices/dancer/${subInvoice.id}`}>
                          <Button variant="ghost">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            alert(`Download PDF for ${subInvoice.dancer_name} - Coming soon!`);
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            alert(`Send email to ${subInvoice.dancer_id} - Coming soon!`);
                          }}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-white/5 border-t border-white/10">
              <tr className="font-semibold">
                <td colSpan={3} className="px-4 py-3 text-white">
                  Total ({summary.count} dancers)
                </td>
                <td className="px-4 py-3 text-right text-white">
                  ${sub_invoices.reduce((sum, si) => sum + Number(si.subtotal), 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-white">
                  ${sub_invoices.reduce((sum, si) => sum + Number(si.tax_amount), 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-white">
                  ${summary.total.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
