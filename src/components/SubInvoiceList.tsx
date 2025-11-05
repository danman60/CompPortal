'use client';

import { api } from '@/lib/trpc-client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileText, Download, Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type SubInvoiceListProps = {
  parentInvoiceId: string;
  onBack: () => void;
};

export default function SubInvoiceList({
  parentInvoiceId,
  onBack,
}: SubInvoiceListProps) {
  const { data, isLoading, error } = api.invoice.getSubInvoices.useQuery({
    parentInvoiceId,
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-muted-foreground">Loading family invoices...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <p>Error loading sub-invoices: {error.message}</p>
        </div>
      </Card>
    );
  }

  if (!data || data.sub_invoices.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Family Invoices</h3>
          <p className="text-sm text-muted-foreground mb-6">
            This invoice has not been split yet.
          </p>
          <Button onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoice
          </Button>
        </div>
      </Card>
    );
  }

  const { sub_invoices, summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Family Invoices</h2>
          <p className="text-sm text-muted-foreground">
            {summary.count} famil{summary.count === 1 ? 'y' : 'ies'} · Total: ${summary.total.toFixed(2)}
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Main Invoice
        </Button>
      </div>

      {/* Validation Summary */}
      <Card className={`p-4 ${summary.matches_parent ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-3">
          {summary.matches_parent ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-900">Validation Passed</p>
                <p className="text-sm text-green-700">
                  All family invoices sum to main invoice total: ${summary.parent_total.toFixed(2)}
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Validation Error</p>
                <p className="text-sm text-red-700">
                  Sub-invoices total (${summary.total.toFixed(2)}) does not match main invoice (${summary.parent_total.toFixed(2)})
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Bulk Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => {
            alert('Download All PDFs - Coming soon!');
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Download All PDFs
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            alert('Send All Emails - Coming soon!');
          }}
        >
          <Mail className="w-4 h-4 mr-2" />
          Send All Emails
        </Button>
      </div>

      {/* Sub-Invoice List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-sm">Family Name</th>
                <th className="text-left px-4 py-3 font-medium text-sm">Contact</th>
                <th className="text-right px-4 py-3 font-medium text-sm">Routines</th>
                <th className="text-right px-4 py-3 font-medium text-sm">Subtotal</th>
                <th className="text-right px-4 py-3 font-medium text-sm">Tax</th>
                <th className="text-right px-4 py-3 font-medium text-sm">Total</th>
                <th className="text-right px-4 py-3 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sub_invoices.map((subInvoice) => {
                const lineItems = subInvoice.line_items as any[];
                const routineCount = lineItems.length;

                return (
                  <tr key={subInvoice.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{subInvoice.family_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-muted-foreground">{subInvoice.family_identifier}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm">{routineCount}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono">${Number(subInvoice.subtotal).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-sm text-muted-foreground">
                        ${Number(subInvoice.tax_amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-semibold">${Number(subInvoice.total).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Link href={`/dashboard/invoices/family/${subInvoice.id}`}>
                          <Button size="sm" variant="ghost">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            alert(`Download PDF for ${subInvoice.family_name} - Coming soon!`);
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            alert(`Send email to ${subInvoice.family_identifier} - Coming soon!`);
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
            <tfoot className="bg-muted border-t">
              <tr className="font-semibold">
                <td colSpan={3} className="px-4 py-3">
                  Total ({summary.count} families)
                </td>
                <td className="px-4 py-3 text-right">
                  ${sub_invoices.reduce((sum, si) => sum + Number(si.subtotal), 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  ${sub_invoices.reduce((sum, si) => sum + Number(si.tax_amount), 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  ${summary.total.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
