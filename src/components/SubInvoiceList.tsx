'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/rebuild/ui/Button';
import { FileText, Download, Mail, CheckCircle, AlertCircle, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import { generateDancerInvoicePDF } from '@/lib/pdf-reports';
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
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.invoice.getSubInvoices.useQuery({
    parentInvoiceId,
  });
  const sendEmailsMutation = trpc.invoice.sendDancerInvoiceEmails.useMutation();

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

  // Initialize email data when sub_invoices load
  const initializeEmailData = () => {
    if (!emailData.length && sub_invoices.length > 0) {
      setEmailData(
        sub_invoices.map((si) => ({
          id: si.id,
          dancer_name: si.dancer_name || 'Unknown Dancer',
          email: '',
          sendEmail: true,
        }))
      );
    }
  };

  const handleDownloadAllPDFs = async () => {
    // Trigger individual PDF downloads for each dancer
    for (const subInvoice of sub_invoices) {
      await handleDownloadPDF(subInvoice);
      // Add small delay between downloads to avoid browser blocking
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const handleDownloadPDF = async (subInvoice: any) => {
    try {
      // Call endpoint to get full invoice details
      const data = await utils.invoice.getSubInvoiceDetails.fetch({
        subInvoiceId: subInvoice.id
      });

      if (!data) {
        alert('Failed to fetch invoice details');
        return;
      }

      // Generate simplified dancer PDF (no studio details, no margin info)
      const pdfBlob = generateDancerInvoicePDF({
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
        dancerName: data.subInvoice.dancer_name || 'Dancer',
        competition: {
          name: data.competition.name,
          year: data.competition.year,
        },
        lineItems: data.subInvoice.line_items,
        summary: {
          entryCount: data.subInvoice.line_items.length,
          subtotal: data.subInvoice.subtotal,
          taxRate: data.subInvoice.tax_rate / 100,
          taxAmount: data.subInvoice.tax_amount,
          totalAmount: data.subInvoice.total,
        },
        tenant: data.tenant,
      });

      // Trigger download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${data.subInvoice.dancer_name}-${data.invoiceNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF');
    }
  };

  const handleOpenEmailModal = () => {
    initializeEmailData();
    setShowEmailModal(true);
  };

  const handleSendEmails = async (emailSubject: string, emailBody: string) => {
    const selectedDancers = emailData.filter(d => d.sendEmail && d.email.trim());

    try {
      const result = await sendEmailsMutation.mutateAsync({
        parentInvoiceId,
        emails: selectedDancers.map(d => ({
          subInvoiceId: d.id,
          dancerName: d.dancer_name,
          emailAddress: d.email,
        })),
        emailSubject,
        emailBody,
      });

      if (result.success) {
        alert(`✅ Sent ${result.sent} emails successfully!`);
        setShowEmailModal(false);
      } else {
        alert(`⚠️ Sent ${result.sent}, failed ${result.failed}. Check console for details.`);
        console.error('Email failures:', result.errors);
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      alert('Failed to send emails');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
      <div className="w-full max-w-6xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-xl shadow-2xl border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20 sticky top-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 z-10">
          <div>
            <h2 className="text-2xl font-bold mb-1 text-white">Dancer Invoices</h2>
            <p className="text-sm text-gray-300">
              {summary.count} dancer{summary.count === 1 ? '' : 's'} · Total: ${summary.total.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

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
              onClick={handleDownloadAllPDFs}
              className="bg-white/10 hover:bg-white/20 border-white/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Download All PDFs
            </Button>
            <Button
              variant="secondary"
              onClick={handleOpenEmailModal}
              className="bg-white/10 hover:bg-white/20 border-white/20"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send All Emails
            </Button>
          </div>

          {/* Sub-Invoice List */}
          <div className="bg-white/5 rounded-lg shadow border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10 border-b border-white/20">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-sm text-white">Dancer Name</th>
                    <th className="text-left px-4 py-3 font-medium text-sm text-white">Contact</th>
                    <th className="text-right px-4 py-3 font-medium text-sm text-white">Routines</th>
                    <th className="text-right px-4 py-3 font-medium text-sm text-white">Subtotal</th>
                    <th className="text-right px-4 py-3 font-medium text-sm text-white">Tax</th>
                    <th className="text-right px-4 py-3 font-medium text-sm text-white">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-sm text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {sub_invoices.map((subInvoice) => {
                    const lineItems = subInvoice.line_items as any[];
                    const routineCount = lineItems.length;

                    return (
                      <tr key={subInvoice.id} className="hover:bg-white/10 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{subInvoice.dancer_name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-300 font-mono">{subInvoice.dancer_id}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-200">{routineCount}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-gray-200">${Number(subInvoice.subtotal).toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-sm text-gray-300">
                            ${Number(subInvoice.tax_amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono font-semibold text-white">${Number(subInvoice.total).toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <Link href={`/dashboard/invoices/dancer/${subInvoice.id}`}>
                              <Button
                                variant="ghost"
                                className="text-gray-300 hover:text-white hover:bg-white/10"
                                title="View Details"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              className="text-gray-300 hover:text-white hover:bg-white/10"
                              onClick={() => handleDownloadPDF(subInvoice)}
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-gray-300 hover:text-white hover:bg-white/10"
                              onClick={() => {
                                initializeEmailData();
                                const dancerData = emailData.find(d => d.id === subInvoice.id);
                                if (dancerData) {
                                  // TODO: Open single-dancer email modal
                                  alert(`Send email to ${subInvoice.dancer_name} - Feature coming soon`);
                                }
                              }}
                              title="Send Email"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-white/10 border-t border-white/20">
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
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <EmailAllModal
          dancers={emailData}
          onUpdateDancer={(id, updates) => {
            setEmailData(emailData.map(d => d.id === id ? { ...d, ...updates } : d));
          }}
          onClose={() => setShowEmailModal(false)}
          onSend={handleSendEmails}
        />
      )}
    </div>
  );
}

// Email All Modal Component
function EmailAllModal({
  dancers,
  onUpdateDancer,
  onClose,
  onSend,
}: {
  dancers: DancerEmailData[];
  onUpdateDancer: (id: string, updates: Partial<DancerEmailData>) => void;
  onClose: () => void;
  onSend: (emailSubject: string, emailBody: string) => void;
}) {
  const [emailSubject, setEmailSubject] = useState('Your Dancer Invoice');
  const [emailBody, setEmailBody] = useState(
    `Hi [Dancer Name],\n\nAttached is your invoice for the upcoming competition.\n\nPlease review and let us know if you have any questions.\n\nThank you!`
  );

  const selectedCount = dancers.filter(d => d.sendEmail).length;
  const allValid = dancers.every(d => !d.sendEmail || d.email.trim().includes('@'));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-[60] p-4 pt-20 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-xl shadow-2xl border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20 sticky top-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 z-10">
          <div>
            <h3 className="text-xl font-semibold text-white">Send Dancer Invoices via Email</h3>
            <p className="text-sm text-gray-300 mt-1">
              {selectedCount} of {dancers.length} dancers selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Dancer Table */}
          <div className="bg-white/5 rounded-lg border border-white/20 overflow-hidden">
            <div className="overflow-x-auto max-h-64">
              <table className="w-full">
                <thead className="bg-white/10 border-b border-white/20 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-sm text-white w-12">Send</th>
                    <th className="text-left px-4 py-3 font-medium text-sm text-white">Dancer Name</th>
                    <th className="text-left px-4 py-3 font-medium text-sm text-white">Email Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {dancers.map((dancer) => (
                    <tr key={dancer.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={dancer.sendEmail}
                          onChange={(e) => onUpdateDancer(dancer.id, { sendEmail: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{dancer.dancer_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="email"
                          value={dancer.email}
                          onChange={(e) => onUpdateDancer(dancer.id, { email: e.target.value })}
                          placeholder="dancer@example.com"
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          disabled={!dancer.sendEmail}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Email Preview */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Email Message</h4>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Message</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-2">
                Tip: Use [Dancer Name] as a placeholder - it will be replaced with each dancer's name.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/20">
            <p className="text-sm text-gray-300">
              {!allValid && (
                <span className="text-yellow-400">⚠️ Some email addresses appear invalid</span>
              )}
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-gray-300 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => onSend(emailSubject, emailBody)}
                disabled={selectedCount === 0 || !allValid}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send {selectedCount} Email{selectedCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
