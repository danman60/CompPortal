'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import { Calendar, Mail, Users, Clock, AlertCircle } from 'lucide-react';

interface SendToStudiosModalProps {
  open: boolean;
  onClose: () => void;
  competitionId: string;
  tenantId: string;
  currentVersion: number;
  onSuccess: () => void;
  onSaveBeforeSend: () => Promise<void>;
}

export function SendToStudiosModal({
  open,
  onClose,
  competitionId,
  tenantId,
  currentVersion,
  onSuccess,
  onSaveBeforeSend,
}: SendToStudiosModalProps) {
  const [feedbackWindowDays, setFeedbackWindowDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendToStudiosMutation = trpc.scheduling.sendToStudios.useMutation({
    onSuccess: (data) => {
      toast.success(`Schedule sent to ${data.emailsSent} studios`);
      onSuccess();
      onClose();
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error(`Failed to send schedule: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Auto-save schedule before sending
    try {
      await onSaveBeforeSend();
      toast.success('Schedule saved');
    } catch (error) {
      toast.error('Failed to save schedule. Please save manually first.');
      setIsSubmitting(false);
      return;
    }

    // Send to studios
    sendToStudiosMutation.mutate({
      tenantId,
      competitionId,
      feedbackWindowDays,
    });
  };

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + feedbackWindowDays);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Send Schedule to Studio Directors"
      description={`Send version ${currentVersion} to all registered Studio Directors for review`}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Saving & Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Send to Studios
              </span>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Feedback Window */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white">
            <Clock className="inline h-4 w-4 mr-1" />
            Set feedback deadline
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="30"
              value={feedbackWindowDays}
              onChange={(e) => setFeedbackWindowDays(Number(e.target.value))}
              className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-300">days from now</span>
          </div>
          <p className="text-sm text-gray-400">
            Deadline: {deadline.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* What Will Happen */}
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
          <h4 className="font-medium text-blue-200 mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            This will:
          </h4>
          <ul className="space-y-2 text-sm text-blue-100">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>Save current schedule to database</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>Lock current version (v{currentVersion})</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>Notify all Studio Directors via email</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>Allow SDs to add notes until deadline</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>Create v{currentVersion + 1} when you make changes</span>
            </li>
          </ul>
        </div>

        {/* Studio Count */}
        <div className="flex items-center gap-2 text-gray-300">
          <Users className="h-4 w-4" />
          <span className="text-sm">Studios will be notified based on their registered entries</span>
        </div>
      </div>
    </Modal>
  );
}