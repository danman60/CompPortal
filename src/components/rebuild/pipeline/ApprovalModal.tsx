"use client";

import { useState } from 'react';
import { Modal } from '@/components/rebuild/ui/Modal';
import { Button } from '@/components/rebuild/ui/Button';

interface ApprovalModalProps {
  studioName: string;
  reservationId: string;
  requestedAmount: number;
  competitionCapacity: number;
  currentUsed: number;
  onApprove: (approvalAmount: number) => Promise<void>;
  onCancel: () => void;
}

/**
 * Approval Modal
 * Allows CD to approve reservation with custom space amount
 * Shows capacity warnings
 */
export function ApprovalModal({
  studioName,
  requestedAmount,
  competitionCapacity,
  currentUsed,
  onApprove,
  onCancel,
}: ApprovalModalProps) {
  const [approvalAmount, setApprovalAmount] = useState(requestedAmount);

  const remaining = competitionCapacity - currentUsed;
  const wouldExceed = approvalAmount > remaining;

  const setQuickAmount = (type: 'all' | 'half' | '10') => {
    if (type === 'all') setApprovalAmount(requestedAmount);
    else if (type === 'half') setApprovalAmount(Math.floor(requestedAmount / 2));
    else if (type === '10') setApprovalAmount(10);
  };

  const handleConfirm = async () => {
    await onApprove(approvalAmount);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={`Approve Reservation - ${studioName}`}
      footer={
        <>
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="primary"
            disabled={approvalAmount <= 0 || wouldExceed}
          >
            Confirm Approval
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {wouldExceed && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <div className="font-bold text-red-300 mb-2">⚠️ Capacity Exceeded</div>
            <div className="text-white/80">
              Approving {approvalAmount} spaces would exceed available capacity ({remaining} remaining).
            </div>
          </div>
        )}

        <div className="bg-white/5 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-white/60">Studio:</span>
            <span className="text-white font-medium">{studioName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Requested Spaces:</span>
            <span className="text-white font-medium">{requestedAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Competition Capacity:</span>
            <span className="text-white font-medium">{competitionCapacity}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Currently Used:</span>
            <span className="text-white font-medium">{currentUsed}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2">
            <span className="text-white/60">Remaining Capacity:</span>
            <span className={`font-medium ${wouldExceed ? 'text-red-400' : 'text-green-400'}`}>
              {remaining}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Approve Amount:
          </label>
          <input
            type="number"
            value={approvalAmount}
            onChange={(e) => setApprovalAmount(Number(e.target.value))}
            min={1}
            max={competitionCapacity}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setQuickAmount('all')} variant="ghost" className="flex-1">
            Full Request ({requestedAmount})
          </Button>
          <Button onClick={() => setQuickAmount('half')} variant="ghost" className="flex-1">
            Half ({Math.floor(requestedAmount / 2)})
          </Button>
          <Button onClick={() => setQuickAmount('10')} variant="ghost" className="flex-1">
            10 Spaces
          </Button>
        </div>
      </div>
    </Modal>
  );
}
