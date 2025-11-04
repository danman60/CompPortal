'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

interface ClassificationRequestExceptionModalProps {
  entryId: string;
  autoCalculatedClassification: { id: string; name: string };
  onClose: () => void;
  onSuccess: () => void;
}

export function ClassificationRequestExceptionModal({
  entryId,
  autoCalculatedClassification,
  onClose,
  onSuccess,
}: ClassificationRequestExceptionModalProps) {
  const [requestedClassificationId, setRequestedClassificationId] = useState<string>('');
  const [justification, setJustification] = useState('');

  const { data: classifications } = trpc.lookup.getAllForEntry.useQuery();
  const createMutation = trpc.classificationRequest.create.useMutation({
    onSuccess: () => {
      toast.success('Classification exception requested successfully');
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const handleSubmit = async () => {
    if (!requestedClassificationId) {
      toast.error('Please select a classification');
      return;
    }

    if (justification.trim().length < 10) {
      toast.error('Justification must be at least 10 characters');
      return;
    }

    await createMutation.mutateAsync({
      entryId,
      requestedClassificationId,
      sdJustification: justification.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-xl border border-white/20 p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Request Classification Exception</h2>
            <p className="text-gray-300">Request a different classification from the Competition Director</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Warning */}
        <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="text-orange-300 font-semibold mb-1">Entry Will Be Created Immediately</div>
              <p className="text-orange-200/90 text-sm">
                Your entry will be created with status "Pending Classification Approval" and will not appear
                in your routine summary until the Competition Director approves your request.
              </p>
            </div>
          </div>
        </div>

        {/* Auto-Calculated Classification */}
        <div className="bg-white/10 rounded-lg p-4 mb-6">
          <div className="text-gray-400 text-sm mb-1">System Auto-Calculated:</div>
          <div className="text-2xl font-bold text-white">{autoCalculatedClassification.name}</div>
          <div className="text-xs text-gray-400 mt-1">(Based on dancer classifications)</div>
        </div>

        {/* Requested Classification */}
        <div className="mb-6">
          <label className="text-white font-semibold block mb-2">
            Requested Classification: <span className="text-red-400">*</span>
          </label>
          <select
            value={requestedClassificationId}
            onChange={(e) => setRequestedClassificationId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white"
          >
            <option value="">Select classification...</option>
            {classifications?.classifications.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Justification */}
        <div className="mb-6">
          <label className="text-white font-semibold block mb-2">
            Justification: <span className="text-red-400">*</span>
          </label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Explain why you need this classification (minimum 10 characters)..."
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500"
            rows={4}
          />
          <div className="text-xs text-gray-400 mt-1">
            {justification.length}/10 characters minimum
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !requestedClassificationId || justification.trim().length < 10}
            className="flex-1 px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
