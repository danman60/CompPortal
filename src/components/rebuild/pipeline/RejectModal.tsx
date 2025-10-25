import { Modal } from '@/components/rebuild/ui/Modal';
import { Button } from '@/components/rebuild/ui/Button';

interface RejectModalProps {
  studioName: string;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Reject Modal
 * Allows CD to reject reservation with reason
 */
export function RejectModal({
  studioName,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
}: RejectModalProps) {
  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={`Reject Reservation - ${studioName}`}
      footer={
        <>
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="danger"
            disabled={!reason.trim()}
          >
            Confirm Rejection
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
          <div className="font-bold text-yellow-300 mb-2">⚠️ Reject Reservation</div>
          <div className="text-white/80">
            This will permanently reject the reservation from {studioName}. The studio will be notified.
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Reason for Rejection:
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Enter reason for rejection..."
            rows={4}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
    </Modal>
  );
}
