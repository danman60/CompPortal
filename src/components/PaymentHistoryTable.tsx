'use client';

import { trpc } from '@/lib/trpc';

type Props = {
  invoiceId: string;
};

// Format date helper
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function formatDate(dateValue: any): string {
  try {
    if (!dateValue) return 'N/A';

    const date = new Date(dateValue);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    return `${MONTH_NAMES[month]} ${day}, ${year}`;
  } catch {
    return 'N/A';
  }
}

function formatPaymentMethod(method: string | null): string {
  if (!method) return 'Not specified';

  const methods: Record<string, string> = {
    check: 'Check',
    'e-transfer': 'E-Transfer',
    cash: 'Cash',
    credit_card: 'Credit Card',
    wire_transfer: 'Wire Transfer',
    other: 'Other',
  };

  return methods[method] || method;
}

export default function PaymentHistoryTable({ invoiceId }: Props) {
  const { data: payments, isLoading } = trpc.invoice.getPaymentHistory.useQuery({
    invoiceId,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading payment history...</div>
        </div>
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
        <div className="text-center py-8 text-gray-500">
          No payments recorded yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Payment History ({payments.length})
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Date Paid</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Amount</th>
              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Method</th>
              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Reference</th>
              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Recorded By</th>
              <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Notes</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const recordedByName = payment.user_profiles
                ? `${payment.user_profiles.first_name || ''} ${payment.user_profiles.last_name || ''}`.trim()
                : 'Unknown';

              const recordedByEmail = payment.user_profiles?.users?.email || '';

              return (
                <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 text-sm text-gray-900">
                    {formatDate(payment.payment_date)}
                  </td>
                  <td className="py-3 px-2 text-sm font-semibold text-green-700 text-right">
                    ${parseFloat(payment.amount.toString()).toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-900">
                    {formatPaymentMethod(payment.payment_method)}
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-600">
                    {payment.reference_number || '-'}
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium">{recordedByName}</span>
                      {recordedByEmail && (
                        <span className="text-xs text-gray-500">{recordedByEmail}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-600">
                    {payment.notes ? (
                      <div className="max-w-xs">
                        <span className="line-clamp-2">{payment.notes}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300">
              <td className="py-3 px-2 text-sm font-semibold text-gray-900">Total Paid:</td>
              <td className="py-3 px-2 text-sm font-bold text-green-700 text-right">
                ${payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0).toFixed(2)}
              </td>
              <td colSpan={4}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
