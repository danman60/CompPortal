'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import { MessageSquare, Clock, AlertCircle, Trash2 } from 'lucide-react';

interface StudioRoutine {
  id: string;
  entryNumber: number;
  title: string;
  scheduledDay: Date;
  performanceTime: string;
  classification: string;
  category: string;
  ageGroup: string;
  entrySize: string;
  duration: number;
  hasNote: boolean;
  noteText?: string | null;
}

interface StudioNoteModalProps {
  open: boolean;
  onClose: () => void;
  routine: StudioRoutine | null;
  canEdit: boolean;
  tenantId: string;
  studioId: string;
  onSuccess?: () => void;
}

export function StudioNoteModal({
  open,
  onClose,
  routine,
  canEdit,
  tenantId,
  studioId,
  onSuccess,
}: StudioNoteModalProps) {
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (routine?.noteText) {
      setNoteText(routine.noteText);
    } else {
      setNoteText('');
    }
  }, [routine]);

  const submitNoteMutation = trpc.scheduling.submitStudioNote.useMutation({
    onSuccess: () => {
      toast.success(noteText ? 'Note submitted successfully' : 'Note cleared');
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to save note: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async () => {
    if (!routine) return;

    setIsSubmitting(true);
    submitNoteMutation.mutate({
      tenantId,
      entryId: routine.id,
      noteText,
      studioId,
    });
  };

  const handleClear = async () => {
    setNoteText('');
    handleSubmit();
  };

  if (!routine) return null;

  const formattedDate = new Date(routine.scheduledDay).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            {canEdit ? 'Add Scheduling Request' : 'View Scheduling Request'}
          </DialogTitle>
          <DialogDescription className="space-y-1 text-gray-600">
            <div className="font-medium text-gray-900">
              Entry #{routine.entryNumber} - "{routine.title}"
            </div>
            <div className="text-sm">
              {routine.entrySize} • {routine.classification} • {routine.category} • {routine.ageGroup}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Schedule */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Current time:</span>
            </div>
            <p className="text-gray-900 pl-6">
              {formattedDate} at {routine.performanceTime}
            </p>
          </div>

          {/* Note Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Your request:
            </label>
            {canEdit ? (
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value.slice(0, 500))}
                placeholder="Example: Please schedule after 10 AM - dancers need time to arrive from school"
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={500}
              />
            ) : (
              <div className="w-full min-h-[128px] px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-900">
                {noteText || <span className="text-gray-400">No note submitted</span>}
              </div>
            )}
            <p className="text-xs text-gray-500 text-right">
              {noteText.length}/500 characters
            </p>
          </div>

          {/* Disclaimer */}
          {canEdit && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Note: The Competition Director will review your request but cannot guarantee accommodation.
                </span>
              </p>
            </div>
          )}

          {/* Read-only Message */}
          {!canEdit && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                Review period closed. You can view your request but cannot edit until the next review period.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <div>
            {canEdit && routine.hasNote && (
              <Button
                variant="ghost"
                onClick={handleClear}
                disabled={isSubmitting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear Request
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2"
            >
              {canEdit ? 'Cancel' : 'Close'}
            </Button>
            {canEdit && (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting || (!noteText && !routine.hasNote)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Submitting...
                  </span>
                ) : (
                  'Submit Request'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}