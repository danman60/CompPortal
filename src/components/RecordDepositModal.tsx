'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

interface RecordDepositModalProps {
  reservationId: string;
  studioName: string;
  currentDeposit: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RecordDepositModal({
  reservationId,
  studioName,
  currentDeposit,
  onClose,
  onSuccess,
}: RecordDepositModalProps) {
  const [depositAmount, setDepositAmount] = useState(currentDeposit > 0 ? String(currentDeposit) : '');
  const [paymentMethod, setPaymentMethod] = useState('e-transfer');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const recordDepositMutation = trpc.reservation.recordDeposit.useMutation({
    onSuccess: () => {
      toast.success('Deposit recorded successfully');
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to record deposit: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }

    recordDepositMutation.mutate({
      reservationId,
      depositAmount: amount,
      paymentMethod: paymentMethod as 'check' | 'etransfer' | 'cash' | 'credit_card' | 'other',
      paymentDate,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-xl border border-white/20 p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Record Deposit</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-gray-300 mb-4">
          Recording deposit for <span className="font-semibold text-white">{studioName}</span>
        </p>

        {/* Deposit Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Deposit Amount <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Payment Method <span className="text-red-400">*</span>
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="e-transfer" className="bg-gray-900 text-white">E-Transfer</option>
            <option value="check" className="bg-gray-900 text-white">Cheque</option>
            <option value="cash" className="bg-gray-900 text-white">Cash</option>
            <option value="credit_card" className="bg-gray-900 text-white">Credit Card</option>
            <option value="wire_transfer" className="bg-gray-900 text-white">Wire Transfer</option>
            <option value="other" className="bg-gray-900 text-white">Other</option>
          </select>
        </div>

        {/* Payment Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Payment Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes <span className="text-gray-500">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes about this deposit..."
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 min-h-[44px] px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!depositAmount || recordDepositMutation.isPending}
            className="flex-1 min-h-[44px] px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-emerald-500/50 disabled:to-emerald-600/50 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
          >
            {recordDepositMutation.isPending ? 'Saving...' : 'Save Deposit'}
          </button>
        </div>
      </div>
    </div>
  );
}
