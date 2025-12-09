'use client';

import { usePipelineV2 } from './usePipelineV2';
import { PipelineV2 } from './PipelineV2';
import ApplyPartialPaymentModal from '@/components/ApplyPartialPaymentModal';
import RecordDepositModal from '@/components/RecordDepositModal';

export default function PipelineV2Page() {
  const pipelineData = usePipelineV2();

  // Find the reservation with the selected invoice for payment modal
  const paymentModalReservation = pipelineData.paymentModalInvoiceId
    ? pipelineData.allReservations.find(
        (r) => r.invoiceId === pipelineData.paymentModalInvoiceId
      )
    : null;

  // Find the reservation for the deposit modal
  const depositModalReservation = pipelineData.depositModalReservationId
    ? pipelineData.allReservations.find(
        (r) => r.id === pipelineData.depositModalReservationId
      )
    : null;

  if (pipelineData.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-purple-200/60">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PipelineV2 {...pipelineData} />

      {/* Payment Modal */}
      {pipelineData.paymentModalInvoiceId && paymentModalReservation && (
        <ApplyPartialPaymentModal
          invoiceId={pipelineData.paymentModalInvoiceId}
          currentBalance={paymentModalReservation.invoiceBalanceRemaining || 0}
          onClose={() => pipelineData.setPaymentModalInvoiceId(null)}
          onSuccess={() => pipelineData.refetch()}
        />
      )}

      {/* Deposit Modal */}
      {pipelineData.depositModalReservationId && depositModalReservation && (
        <RecordDepositModal
          reservationId={pipelineData.depositModalReservationId}
          studioName={depositModalReservation.studioName}
          currentDeposit={depositModalReservation.depositAmount || 0}
          onClose={() => pipelineData.setDepositModalReservationId(null)}
          onSuccess={() => pipelineData.refetch()}
        />
      )}
    </>
  );
}
