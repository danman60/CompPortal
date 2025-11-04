'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

interface ClassificationRequestDetailModalProps {
  requestId: string;
  onClose: () => void;
}

export function ClassificationRequestDetailModal({ requestId, onClose }: ClassificationRequestDetailModalProps) {
  const [decisionType, setDecisionType] = useState<'approved_as_requested' | 'approved_different'>('approved_as_requested');
  const [selectedClassification, setSelectedClassification] = useState<string>('');
  const [cdComments, setCdComments] = useState('');

  const { data: request, isLoading } = trpc.classificationRequest.getById.useQuery({ requestId });
  const { data: classifications } = trpc.lookup.getAllForEntry.useQuery();
  const respondMutation = trpc.classificationRequest.respond.useMutation({
    onSuccess: () => {
      toast.success('Classification request processed successfully');
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  if (isLoading || !request) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-xl border border-white/20 p-8 max-w-3xl w-full">
          <div className="text-white text-center">Loading request details...</div>
        </div>
      </div>
    );
  }

  const entry = request.competition_entries;
  const studio = entry?.reservations?.studios;
  const competition = entry?.reservations?.competitions;
  const participants = entry?.entry_participants || [];
  const autoCalc = request.classifications_classification_exception_requests_auto_calculated_classification_idToclassifications;
  const requested = request.classifications_classification_exception_requests_requested_classification_idToclassifications;
  const approved = request.classifications_classification_exception_requests_approved_classification_idToclassifications;

  const handleSubmit = async () => {
    const classificationId = decisionType === 'approved_as_requested'
      ? request.requested_classification_id
      : selectedClassification;

    if (!classificationId) {
      toast.error('Please select a classification');
      return;
    }

    await respondMutation.mutateAsync({
      requestId: request.id,
      decisionType,
      approvedClassificationId: classificationId,
      cdComments: cdComments || undefined,
    });
  };

  const isPending = request.status === 'pending';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-xl border border-white/20 p-8 max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Classification Exception Request</h2>
            <p className="text-gray-300">{studio?.name || 'Unknown Studio'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Entry Details */}
        <div className="bg-white/10 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Routine:</span>
              <span className="text-white font-semibold ml-2">{entry?.title || 'Untitled'}</span>
            </div>
            <div>
              <span className="text-gray-400">Competition:</span>
              <span className="text-white ml-2">{competition?.name || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Dancers */}
        <div className="bg-white/10 rounded-lg p-6 mb-6">
          <h3 className="text-white font-semibold mb-3">Dancers ({participants.length})</h3>
          <div className="space-y-2">
            {participants.map((p: any, idx: number) => {
              const dancer = p.dancers;
              return (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-white">
                    {idx + 1}. {dancer?.first_name} {dancer?.last_name}
                  </span>
                  <span className="text-gray-400">
                    {dancer?.classifications?.name || 'N/A'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Classifications */}
        <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-orange-300 font-semibold mb-1">Auto-Calculated:</div>
              <div className="text-2xl font-bold text-white">{autoCalc?.name || 'N/A'}</div>
              <div className="text-xs text-gray-400 mt-1">
                (Based on dancer classifications)
              </div>
            </div>
            <div>
              <div className="text-orange-300 font-semibold mb-1">Requested:</div>
              <div className="text-2xl font-bold text-orange-400">{requested?.name || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Justification */}
        <div className="bg-white/10 rounded-lg p-6 mb-6">
          <h3 className="text-white font-semibold mb-2">Studio Director's Justification:</h3>
          <p className="text-gray-300 whitespace-pre-wrap">{request.sd_justification}</p>
        </div>

        {/* Decision (only if pending) */}
        {isPending && (
          <div className="bg-white/10 rounded-lg p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">Your Decision:</h3>

            <div className="space-y-4">
              {/* Radio Options */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="decision"
                  checked={decisionType === 'approved_as_requested'}
                  onChange={() => setDecisionType('approved_as_requested')}
                  className="mt-1"
                />
                <div>
                  <div className="text-white font-semibold">Approve as Requested ({requested?.name})</div>
                  <div className="text-gray-400 text-sm">Accept the studio's requested classification</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="decision"
                  checked={decisionType === 'approved_different'}
                  onChange={() => setDecisionType('approved_different')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-white font-semibold mb-2">Set Different Classification</div>
                  <select
                    value={selectedClassification}
                    onChange={(e) => setSelectedClassification(e.target.value)}
                    disabled={decisionType !== 'approved_different'}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white disabled:opacity-50"
                  >
                    <option value="">Select classification...</option>
                    {classifications?.classifications.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </label>

              {/* Comments */}
              <div>
                <label className="text-white font-semibold block mb-2">Comments (Optional):</label>
                <textarea
                  value={cdComments}
                  onChange={(e) => setCdComments(e.target.value)}
                  placeholder="Add any comments for the studio..."
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* Already Decided */}
        {!isPending && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-6 mb-6">
            <h3 className="text-green-300 font-semibold mb-2">Decision Made:</h3>
            <div className="text-white text-lg font-bold mb-2">
              {approved?.name || 'N/A'}
            </div>
            {request.cd_comments && (
              <div className="mt-4">
                <div className="text-green-300 font-semibold mb-1">Your Comments:</div>
                <p className="text-gray-300">{request.cd_comments}</p>
              </div>
            )}
            <div className="mt-4 text-sm text-gray-400">
              Responded: {new Date(request.responded_at!).toLocaleString()}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors"
          >
            {isPending ? 'Cancel' : 'Close'}
          </button>
          {isPending && (
            <button
              onClick={handleSubmit}
              disabled={respondMutation.isPending}
              className="flex-1 px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
            >
              {respondMutation.isPending ? 'Submitting...' : 'Submit Decision'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
