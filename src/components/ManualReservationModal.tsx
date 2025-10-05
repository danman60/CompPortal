'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { trpc } from '@/lib/trpc';

interface ManualReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitions: Array<{
    id: string;
    name: string;
    year: number;
    available_reservation_tokens: number | null;
    total_reservation_tokens: number | null;
  }>;
  studios: Array<{
    id: string;
    name: string;
  }>;
  onSuccess?: () => void;
}

export default function ManualReservationModal({
  isOpen,
  onClose,
  competitions,
  studios,
  onSuccess,
}: ManualReservationModalProps) {
  const [selectedCompetition, setSelectedCompetition] = useState('');
  const [selectedStudio, setSelectedStudio] = useState('');
  const [routinesAllocated, setRoutinesAllocated] = useState('');

  const utils = trpc.useUtils();

  const createManualReservation = trpc.reservation.createManual.useMutation({
    onSuccess: () => {
      utils.reservation.getAll.invalidate();
      utils.competition.getAll.invalidate();
      onSuccess?.();
      onClose();
      // Reset form
      setSelectedCompetition('');
      setSelectedStudio('');
      setRoutinesAllocated('');
    },
    onError: (error) => {
      alert(`Failed to create reservation: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompetition || !selectedStudio || !routinesAllocated) {
      alert('Please fill in all fields');
      return;
    }

    const routines = parseInt(routinesAllocated, 10);
    if (isNaN(routines) || routines < 1) {
      alert('Please enter a valid number of routines (minimum 1)');
      return;
    }

    const competition = competitions.find(c => c.id === selectedCompetition);
    const availableTokens = competition?.available_reservation_tokens ?? 600;

    if (routines > availableTokens) {
      alert(`Not enough capacity. Available: ${availableTokens} routines`);
      return;
    }

    createManualReservation.mutate({
      competitionId: selectedCompetition,
      studioId: selectedStudio,
      spacesAllocated: routines,
    });
  };

  const selectedCompData = competitions.find(c => c.id === selectedCompetition);
  const availableTokens = selectedCompData?.available_reservation_tokens ?? 600;
  const totalTokens = selectedCompData?.total_reservation_tokens ?? 600;

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
                  📋 Manual Reservation Creation
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Competition Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Competition
                    </label>
                    <select
                      value={selectedCompetition}
                      onChange={(e) => setSelectedCompetition(e.target.value)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="" className="bg-gray-900 text-white">Select competition...</option>
                      {competitions.map((comp) => (
                        <option key={comp.id} value={comp.id} className="bg-gray-900 text-white">
                          {comp.name} ({comp.year}) - {comp.available_reservation_tokens ?? 600} slots available
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Capacity Display */}
                  {selectedCompetition && (
                    <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between text-gray-300">
                          <span>Total Capacity:</span>
                          <span className="font-semibold text-white">{totalTokens}</span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                          <span>Available:</span>
                          <span className="font-semibold text-green-400">{availableTokens}</span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                          <span>Reserved:</span>
                          <span className="font-semibold text-orange-400">{totalTokens - availableTokens}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Studio Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Studio
                    </label>
                    <select
                      value={selectedStudio}
                      onChange={(e) => setSelectedStudio(e.target.value)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="" className="bg-gray-900 text-white">Select studio...</option>
                      {studios.map((studio) => (
                        <option key={studio.id} value={studio.id} className="bg-gray-900 text-white">
                          {studio.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Routines Allocated */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Routines to Allocate
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={availableTokens}
                      value={routinesAllocated}
                      onChange={(e) => setRoutinesAllocated(e.target.value)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter number of routines"
                      required
                    />
                    {selectedCompetition && (
                      <p className="text-xs text-gray-400 mt-1">
                        Maximum: {availableTokens} routines
                      </p>
                    )}
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
                      disabled={createManualReservation.isPending}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all font-medium disabled:opacity-50"
                    >
                      {createManualReservation.isPending ? 'Creating...' : 'Allocate Slots'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
