'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { trpc } from '@/lib/trpc';

interface RequestSpacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  currentSpaces: number;
  activeEntries: number;
  errorMessage?: string;
  onSuccess?: () => void;
}

export default function RequestSpacesModal({
  isOpen,
  onClose,
  reservationId,
  currentSpaces,
  activeEntries,
  errorMessage,
  onSuccess,
}: RequestSpacesModalProps) {
  const spacesNeeded = Math.max(1, activeEntries - currentSpaces + 1);
  const [additionalSpaces, setAdditionalSpaces] = useState(spacesNeeded.toString());
  const [justification, setJustification] = useState('');

  const utils = trpc.useUtils();

  const requestSpaces = trpc.reservation.requestAdditionalSpaces.useMutation({
    onSuccess: (data) => {
      utils.reservation.getAll.invalidate();
      utils.entry.getByStudio.invalidate();
      onSuccess?.();
      onClose();
      // Reset form
      setAdditionalSpaces(spacesNeeded.toString());
      setJustification('');

      // Show success toast/alert
      alert(data.message);
    },
    onError: (error) => {
      alert(`Failed to submit request: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const spaces = parseInt(additionalSpaces, 10);
    if (isNaN(spaces) || spaces < 1) {
      alert('Please enter a valid number of additional spaces (minimum 1)');
      return;
    }

    requestSpaces.mutate({
      reservationId,
      additionalSpaces: spaces,
      justification: justification.trim() || undefined,
    });
  };

  const newTotal = currentSpaces + parseInt(additionalSpaces || '0', 10);

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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 border border-white/20 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-xl font-bold text-white mb-4"
                >
                  ⚠️ Capacity Limit Reached
                </Dialog.Title>

                {/* Error Message */}
                {errorMessage && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-200">{errorMessage}</p>
                  </div>
                )}

                {/* Capacity Display */}
                <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-4 mb-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Current Approved Spaces:</span>
                      <span className="font-semibold text-white">{currentSpaces}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Active Routines:</span>
                      <span className="font-semibold text-orange-400">{activeEntries}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Additional Needed:</span>
                      <span className="font-semibold text-red-400">+{spacesNeeded}</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Additional Spaces Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Additional Spaces Requested
                    </label>
                    <input
                      type="number"
                      min={spacesNeeded}
                      value={additionalSpaces}
                      onChange={(e) => setAdditionalSpaces(e.target.value)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={`Minimum: ${spacesNeeded}`}
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      New total: {currentSpaces} + {parseInt(additionalSpaces || '0', 10)} = {newTotal} spaces
                    </p>
                  </div>

                  {/* Justification (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Justification (Optional)
                    </label>
                    <textarea
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      placeholder="Explain why you need additional spaces..."
                      rows={3}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      This will be sent to the Competition Director for review.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={requestSpaces.isPending}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all font-medium disabled:opacity-50"
                    >
                      {requestSpaces.isPending ? 'Sending Request...' : 'Request Spaces'}
                    </button>
                  </div>
                </form>

                {/* Info Note */}
                <p className="text-xs text-gray-400 mt-4 text-center">
                  You will be notified once the Competition Director reviews your request.
                </p>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
