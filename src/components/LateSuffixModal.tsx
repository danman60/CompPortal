'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Modal } from '@/components/ui/Modal';

interface LateSuffixModalProps {
  isOpen: boolean;
  entryId: string;
  entryTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function LateSuffixModal({ isOpen, entryId, entryTitle, onClose, onSuccess }: LateSuffixModalProps) {
  const [baseNumber, setBaseNumber] = useState<number>(100);
  const [suffix, setSuffix] = useState<string>('a');

  const assignMutation = trpc.scheduling.assignLateSuffix.useMutation({
    onSuccess: (data) => {
      alert(`Late routine assigned: ${data.displayNumber}`);
      onSuccess();
      onClose();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    assignMutation.mutate({ entryId, baseEntryNumber: baseNumber, suffix });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Late Routine Suffix"
      description={entryTitle}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={assignMutation.isPending}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
          >
            {assignMutation.isPending ? 'Assigning...' : 'Assign'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Base Routine Number</label>
          <input
            type="number"
            min="100"
            value={baseNumber}
            onChange={(e) => setBaseNumber(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Suffix (single letter)</label>
          <input
            type="text"
            maxLength={1}
            pattern="[a-z]"
            value={suffix}
            onChange={(e) => setSuffix(e.target.value.toLowerCase())}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          />
        </div>

        <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
          <p className="text-center text-lg font-bold text-white">
            Display: #{baseNumber}{suffix}
          </p>
        </div>
      </div>
    </Modal>
  );
}
