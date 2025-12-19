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
      <DialogContent className="max-w-lg bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 border-purple-600/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <MessageSquare className="h-5 w-5 text-cyan-400" />
            {canEdit ? 'Add Scheduling Request' : 'View Scheduling Request'}
          </DialogTitle>
          <DialogDescription className="space-y-1 text-purple-200">
            <div className="font-medium text-white">
              Entry #{routine.entryNumber} - "{routine.title}"
            </div>
            <div className="text-sm">
              {routine.entrySize} • {routine.classification} • {routine.category} • {routine.ageGroup}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Schedule */}
          <div className="bg-purple-800/30 rounded-lg p-3 space-y-1 border border-purple-600/30">
            <div className="flex items-center gap-2 text-purple-200">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Current time:</span>
            </div>
            <p className="text-white pl-6">
              {formattedDate} at {routine.performanceTime}
            </p>
          </div>

          {/* Note Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-purple-200">
              Your request:
            </label>
            {canEdit ? (
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value.slice(0, 500))}
                placeholder="Example: Please schedule after 10 AM - dancers need time to arrive from school"
                className="w-full h-32 px-3 py-2 bg-purple-900/50 border border-purple-600/50 rounded-md text-white placeholder-purple-400 resize-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                maxLength={500}
              />
            ) : (
              <div className="w-full min-h-[128px] px-3 py-2 bg-purple-900/30 border border-purple-600/30 rounded-md text-white">
                {noteText || <span className="text-purple-400">No note submitted</span>}
              </div>
            )}
            <p className="text-xs text-purple-300 text-right">
              {noteText.length}/500 characters
            </p>
          </div>

          {/* Disclaimer */}
          {canEdit && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-sm text-amber-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Note: The Competition Director will review your request but cannot guarantee accommodation.
                </span>
              </p>
            </div>
          )}

          {/* Read-only Message */}
          {!canEdit && (
            <div className="bg-purple-800/30 border border-purple-600/30 rounded-lg p-3">
              <p className="text-sm text-purple-200">
                Review period closed. You can view your request but cannot edit until the next review period.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-purple-700/50">
          <div>
            {canEdit && routine.hasNote && (
              <Button
                variant="ghost"
                onClick={handleClear}
                disabled={isSubmitting}
                className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
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
              className="px-4 py-2 bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 border border-purple-500/50"
            >
              {canEdit ? 'Cancel' : 'Close'}
            </Button>
            {canEdit && (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting || (!noteText && !routine.hasNote)}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-500/20 border border-cyan-500/50"
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