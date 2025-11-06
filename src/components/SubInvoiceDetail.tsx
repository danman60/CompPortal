'use client';

import { trpc } from '@/lib/trpc';
import { Button } from '@/components/rebuild/ui/Button';
import { Download, Mail, Printer, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type SubInvoiceDetailProps = {
  subInvoiceId: string;
};

export default function SubInvoiceDetail({ subInvoiceId }: SubInvoiceDetailProps) {
  const { data: subInvoice, isLoading, error } = trpc.invoice.getSubInvoiceById.useQuery({
    subInvoiceId,
  });

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow border">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-muted-foreground">Loading invoice...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !subInvoice) {
    return (
      <div className="p-6 bg-white rounded-lg shadow border">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <p>Error loading invoice: {error?.message || 'Not found'}</p>
        </div>
      </div>
    );
  }

  const lineItems = subInvoice.line_items as any[];
  const invoice = subInvoice.invoices;
  const studio = invoice.studios;
  const competition = invoice.competitions;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/invoices/${studio.id}/${competition.id}`}>
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Main Invoice
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              alert('Download PDF - Coming soon!');
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button
            onClick={() => {
              alert(`Send to ${subInvoice.dancer_id} - Coming soon!`);
            }}
          >
            <Mail className="w-4 h-4 mr-2" />
            Email to Dancer
          </Button>
        </div>
      </div>

      {/* Invoice Card */}
      <div className="p-8 bg-white rounded-lg shadow border print:shadow-none">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Family Invoice</h1>
              <p className="text-muted-foreground">
                Part of Main Invoice #{invoice.id.slice(0, 8)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Invoice Date</p>
              <p className="font-medium">
                {new Date(subInvoice.created_at!).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Reference Notice */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-purple-900">
              This is a family-specific invoice split from the main studio invoice for{' '}
              <strong>{competition.name}</strong>.
            </p>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Bill To:</h3>
              <div className="text-sm space-y-1">
                <p className="font-medium">{subInvoice.dancer_name}</p>
                <p className="text-muted-foreground">{subInvoice.dancer_id}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Studio:</h3>
              <div className="text-sm space-y-1">
                <p className="font-medium">{studio.name}</p>
                {studio.address1 && <p className="text-muted-foreground">{studio.address1}</p>}
                {studio.city && studio.province && (
                  <p className="text-muted-foreground">
                    {studio.city}, {studio.province} {studio.postal_code}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Competition Info */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Competition</h3>
          <p className="text-sm">{competition.name}</p>
          {competition.competition_start_date && (
            <p className="text-sm text-muted-foreground">
              {new Date(competition.competition_start_date).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Line Items */}
        <div className="mb-6">
          <h3 className="font-semibold mb-4">Routine Entries</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Title</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Size</th>
                  <th className="text-left px-4 py-3 font-medium">Dancers</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lineItems.map((item, index) => (
                  <tr key={index} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.title}</p>
                      {item.entry_number && (
                        <p className="text-xs text-muted-foreground">Entry #{item.entry_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.size_category}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        {item.dancer_names.map((name: string, i: number) => (
                          <div key={i}>{name}</div>
                        ))}
                        {item.family_dancer_count !== item.total_dancers && (
                          <div className="text-muted-foreground mt-1">
                            ({item.family_dancer_count} of {item.total_dancers} dancers)
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      ${item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="border-t pt-6">
          <div className="max-w-sm ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-mono">${Number(subInvoice.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Tax ({Number(subInvoice.tax_rate)}% HST):
              </span>
              <span className="font-mono">${Number(subInvoice.tax_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold pt-2 border-t">
              <span>Total Due:</span>
              <span className="font-mono">${Number(subInvoice.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2 text-blue-900">Payment Instructions</h3>
          <p className="text-sm text-blue-800">
            Please remit payment to <strong>{studio.name}</strong> via their preferred payment method.
            Contact your studio for payment options and deadlines.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-xs text-muted-foreground">
          <p>Generated on {new Date(subInvoice.created_at!).toLocaleString()}</p>
          <p className="mt-1">This invoice is part of a split family billing system</p>
        </div>
      </div>
    </div>
  );
}
