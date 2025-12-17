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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[60] p-4 pt-20 overflow-y-auto">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto mb-4">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Apply Partial Payment</h2>
          <p className="text-sm text-blue-300 mt-1">
            Current balance: <span className="font-semibold text-blue-200">${currentBalance.toFixed(2)}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-1">
              Payment Amount <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={currentBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-1">
              Payment Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              required
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
            >
              <option value="" className="bg-gray-800">Select method (optional)</option>
              <option value="check" className="bg-gray-800">Check</option>
              <option value="e-transfer" className="bg-gray-800">E-Transfer</option>
              <option value="cash" className="bg-gray-800">Cash</option>
              <option value="credit_card" className="bg-gray-800">Credit Card</option>
              <option value="wire_transfer" className="bg-gray-800">Wire Transfer</option>
              <option value="other" className="bg-gray-800">Other</option>
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              placeholder="Check #, Transaction ID, etc."
              maxLength={100}
            />
            <p className="text-xs text-gray-400 mt-1">
              Optional: Check number, transaction ID, or confirmation code
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              placeholder="Optional notes about this payment..."
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors border border-white/20"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
