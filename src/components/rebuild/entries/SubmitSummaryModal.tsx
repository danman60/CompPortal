"use client";

import { Modal } from '@/components/rebuild/ui/Modal';
import { Button } from '@/components/rebuild/ui/Button';

interface Reservation {
  id: string;
  studio_id: string;
  competition_id: string;
  competitions?: { name: string };
}

interface SubmitSummaryModalProps {
  created: number;
  confirmedSpaces: number;
  isIncomplete: boolean;
  reservation: Reservation;
  onConfirm: (payload: { studioId: string; competitionId: string }) => Promise<void>;
  onCancel: () => void;
}

/**
 * Modal for submitting summary
 * Shows warning if incomplete (created < confirmed)
 */
export function SubmitSummaryModal({
  created,
  confirmedSpaces,
  isIncomplete,
  reservation,
  onConfirm,
  onCancel,
}: SubmitSummaryModalProps) {
  const handleConfirm = async () => {
    await onConfirm({
      studioId: reservation.studio_id,
      competitionId: reservation.competition_id,
    });
    onCancel();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Submit Summary"
      footer={
        <>
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleConfirm} variant="primary">
            {isIncomplete ? 'Submit Anyway' : 'Confirm Submit'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isIncomplete && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <div className="font-bold text-yellow-300 mb-2">⚠️ Incomplete Submission</div>
            <div className="text-white/80">
              You have created {created} routine{created !== 1 ? 's' : ''} but reserved{' '}
              {confirmedSpaces} space{confirmedSpaces !== 1 ? 's' : ''}.
            </div>
            <div className="text-white/80 mt-2">
              Unused spaces will be refunded to the event.
            </div>
          </div>
        )}

        <div className="bg-white/5 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-white/60">Event:</span>
            <span className="text-white font-medium">
              {(reservation as any).competitions?.name || 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Routines Created:</span>
            <span className="text-white font-medium">{created}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Spaces Confirmed:</span>
            <span className="text-white font-medium">{confirmedSpaces}</span>
          </div>
          {isIncomplete && (
            <div className="flex justify-between border-t border-white/10 pt-2">
              <span className="text-white/60">Spaces to Refund:</span>
              <span className="text-yellow-300 font-medium">{confirmedSpaces - created}</span>
            </div>
          )}
        </div>

        <div className="text-white/60 text-sm">
          After submitting, you won't be able to create new routines for this reservation.
          You can still edit existing routine details.
        </div>
      </div>
    </Modal>
  );
}
