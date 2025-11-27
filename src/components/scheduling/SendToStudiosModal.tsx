'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
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
}

export function SendToStudiosModal({
  open,
  onClose,
  competitionId,
  tenantId,
  currentVersion,
  onSuccess,
}: SendToStudiosModalProps) {
  const [feedbackWindowDays, setFeedbackWindowDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendToStudiosMutation = trpc.scheduling.sendToStudios.useMutation({
    onSuccess: (data) => {
      toast.success(`Schedule sent to ${data.emailsSent} studios`);
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to send schedule: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    sendToStudiosMutation.mutate({
      tenantId,
      competitionId,
      feedbackWindowDays,
    });
  };

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + feedbackWindowDays);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Mail className="h-5 w-5 text-blue-600" />
            Send Schedule to Studio Directors
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Send version {currentVersion} to all registered Studio Directors for review
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Feedback Window */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
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
                className="w-20 px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-600">days from now</span>
            </div>
            <p className="text-sm text-gray-500">
              Deadline: {deadline.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* What Will Happen */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              This will:
            </h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Lock current version (v{currentVersion})</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Notify all Studio Directors via email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Allow SDs to add notes until deadline</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Create v{currentVersion + 1} when you make changes</span>
              </li>
            </ul>
          </div>

          {/* Studio Count */}
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="h-4 w-4" />
            <span className="text-sm">Studios will be notified based on their registered entries</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Send to Studios
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}