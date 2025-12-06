'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

type Props = {
  invoiceId: string;
  currentBalance: number;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ApplyPartialPaymentModal({
  invoiceId,
  currentBalance,
  onClose,
  onSuccess,
}: Props) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyPaymentMutation = trpc.invoice.applyPartialPayment.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const paymentAmount = parseFloat(amount);

    // Validation
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (paymentAmount > currentBalance) {
      toast.error(`Payment amount cannot exceed current balance ($${currentBalance.toFixed(2)})`);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await applyPaymentMutation.mutateAsync({
        invoiceId,
        amount: paymentAmount,
        paymentDate: new Date(paymentDate),
        paymentMethod: paymentMethod ? (paymentMethod as 'check' | 'e-transfer' | 'cash' | 'credit_card' | 'wire_transfer' | 'other') : undefined,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
      });

      toast.success(result.message || 'Payment applied successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to apply payment:', error);
      toast.error(error?.message || 'Failed to apply payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Apply Partial Payment</h2>
          <p className="text-sm text-gray-600 mt-1">
            Current balance: <span className="font-semibold">${currentBalance.toFixed(2)}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={currentBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select method (optional)</option>
              <option value="check">Check</option>
              <option value="e-transfer">E-Transfer</option>
              <option value="cash">Cash</option>
              <option value="credit_card">Credit Card</option>
              <option value="wire_transfer">Wire Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Check #, Transaction ID, etc."
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Check number, transaction ID, or confirmation code
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional notes about this payment..."
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Applying...' : 'Apply Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
