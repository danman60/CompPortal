'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

interface MoveReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: {
    id: string;
    studio_name: string;
    current_competition_name: string;
    current_competition_id: string;
    spaces_confirmed: number;
  };
  competitions: Array<{
    id: string;
    name: string;
    year: number;
    available_reservation_tokens: number | null;
  }>;
  onSuccess?: () => void;
}

export default function MoveReservationModal({
  isOpen,
  onClose,
  reservation,
  competitions,
  onSuccess,
}: MoveReservationModalProps) {
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const utils = trpc.useUtils();

  const moveReservation = trpc.reservation.moveToCompetition.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.reservation.getAll.invalidate();
      utils.competition.getAll.invalidate();
      onSuccess?.();
      onClose();
      setSelectedCompetitionId('');
      setShowConfirmation(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setShowConfirmation(false);
    },
  });

  // Filter out current competition from list
  const availableCompetitions = competitions.filter(
    (comp) => comp.id !== reservation.current_competition_id
  );

  const selectedCompetition = availableCompetitions.find(
    (comp) => comp.id === selectedCompetitionId
  );

  const handleProceed = () => {
    if (!selectedCompetitionId) {
      toast.error('Please select a competition');
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    moveReservation.mutate({
      reservationId: reservation.id,
      targetCompetitionId: selectedCompetitionId,
    });
  };

  const handleCancel = () => {
    if (showConfirmation) {
      setShowConfirmation(false);
    } else {
      onClose();
      setSelectedCompetitionId('');
    }
  };

  const hasCapacity =
    selectedCompetition &&
    (selectedCompetition.available_reservation_tokens ?? 0) >= reservation.spaces_confirmed;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 p-6 text-left align-middle shadow-xl transition-all">
                {!showConfirmation ? (
                  <>
                    <Dialog.Title as="h3" className="text-2xl font-bold text-white mb-2">
                      🔄 Move Reservation to Different Competition
                    </Dialog.Title>
                    <p className="text-gray-400 text-sm mb-6">
                      Move this studio's reservation and all entries to a different competition
                    </p>

                    <div className="space-y-5">
                      {/* Current Reservation Info */}
                      <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-blue-300 mb-2">
                          Current Reservation
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between text-gray-300">
                            <span>Studio:</span>
                            <span className="font-semibold text-white">
                              {reservation.studio_name}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-300">
                            <span>Competition:</span>
                            <span className="font-semibold text-white">
                              {reservation.current_competition_name}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-300">
                            <span>Spaces:</span>
                            <span className="font-semibold text-white">
                              {reservation.spaces_confirmed} entries
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Competition Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Move to Competition <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={selectedCompetitionId}
                          onChange={(e) => setSelectedCompetitionId(e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          disabled={moveReservation.isPending}
                        >
                          <option value="" className="bg-gray-900 text-white">
                            Select destination competition...
                          </option>
                          {availableCompetitions.map((comp) => {
                            const available = comp.available_reservation_tokens ?? 0;
                            const hasSpace = available >= reservation.spaces_confirmed;
                            return (
                              <option
                                key={comp.id}
                                value={comp.id}
                                className="bg-gray-900 text-white"
                                disabled={!hasSpace}
                              >
                                {comp.name} ({comp.year}) - {available} available
                                {!hasSpace ? ' (insufficient capacity)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Capacity Info */}
                      {selectedCompetition && (
                        <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between text-gray-300">
                              <span>Available Capacity:</span>
                              <span className="font-semibold text-blue-300">
                                {selectedCompetition.available_reservation_tokens ?? 0} spaces
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                              <span>Spaces Needed:</span>
                              <span className="font-semibold text-white">
                                {reservation.spaces_confirmed} spaces
                              </span>
                            </div>
                            {!hasCapacity && (
                              <p className="text-yellow-300 text-xs mt-2">
                                ℹ️ This will create over-capacity. Capacity limits are tracked for planning purposes.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={moveReservation.isPending}
                        className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleProceed}
                        disabled={!selectedCompetitionId || moveReservation.isPending}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-purple-500/50 disabled:to-pink-500/50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all"
                      >
                        Continue
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Confirmation Screen */}
                    <Dialog.Title as="h3" className="text-2xl font-bold text-white mb-2">
                      ⚠️ Confirm Move
                    </Dialog.Title>
                    <p className="text-gray-400 text-sm mb-6">
                      Please review and confirm this change
                    </p>

                    <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-semibold text-yellow-300 mb-3">
                        This action will:
                      </h4>
                      <ul className="text-sm text-gray-300 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-400 mt-0.5">•</span>
                          <span>
                            Move <strong className="text-white">{reservation.studio_name}</strong>
                            's reservation from{' '}
                            <strong className="text-white">
                              {reservation.current_competition_name}
                            </strong>{' '}
                            to{' '}
                            <strong className="text-white">{selectedCompetition?.name}</strong>
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-400 mt-0.5">•</span>
                          <span>
                            Update all entries and routines to the new competition
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-400 mt-0.5">•</span>
                          <span>
                            Adjust capacity in both competitions (release{' '}
                            {reservation.spaces_confirmed} from old, reserve in new)
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-400 mt-0.5">•</span>
                          <span>
                            Send notification email to the studio (if account claimed)
                          </span>
                        </li>
                      </ul>
                    </div>

                    {/* Confirmation Buttons */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={moveReservation.isPending}
                        className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium"
                      >
                        Go Back
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={moveReservation.isPending}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-green-500/50 disabled:to-emerald-600/50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        {moveReservation.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Moving...</span>
                          </>
                        ) : (
                          <span>✅ Confirm Move</span>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
