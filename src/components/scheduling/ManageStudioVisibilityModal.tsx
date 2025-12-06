'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Users, AlertCircle } from 'lucide-react';

// P1-9: Per-studio visibility toggle
interface ManageStudioVisibilityModalProps {
  open: boolean;
  onClose: () => void;
  competitionId: string;
  tenantId: string;
}

interface StudioWithVisibility {
  id: string;
  name: string;
  entryCount: number;
  isHidden: boolean;
}

export function ManageStudioVisibilityModal({
  open,
  onClose,
  competitionId,
  tenantId,
}: ManageStudioVisibilityModalProps) {
  const [studios, setStudios] = useState<StudioWithVisibility[]>([]);

  // Fetch competition to get hidden studios list
  const { data: competition, refetch: refetchCompetition } = trpc.competition.getById.useQuery(
    { id: competitionId },
    { enabled: open }
  );

  // Fetch studios with entries for this competition
  const { data: studiosData } = trpc.studio.getStudiosForCompetition.useQuery(
    { competitionId, tenantId },
    { enabled: open }
  );

  // Toggle visibility mutation
  const toggleVisibilityMutation = trpc.scheduling.toggleStudioScheduleVisibility.useMutation({
    onSuccess: async () => {
      await refetchCompetition();
      toast.success('Studio visibility updated');
    },
    onError: (error) => {
      toast.error(`Failed to update visibility: ${error.message}`);
    },
  });

  // Combine studios with hidden status
  useEffect(() => {
    if (studiosData && competition) {
      const hiddenStudioIds = competition.schedule_hidden_studios || [];
      const studiosWithVisibility: StudioWithVisibility[] = studiosData.map((studio: any) => ({
        id: studio.id,
        name: studio.name,
        entryCount: studio.entryCount || 0,
        isHidden: hiddenStudioIds.includes(studio.id),
      }));
      setStudios(studiosWithVisibility);
    }
  }, [studiosData, competition]);

  const handleToggleVisibility = async (studioId: string, currentlyHidden: boolean) => {
    // Optimistically update UI
    setStudios((prev) =>
      prev.map((s) => (s.id === studioId ? { ...s, isHidden: !currentlyHidden } : s))
    );

    // Call mutation
    toggleVisibilityMutation.mutate({
      tenantId,
      competitionId,
      studioId,
      hidden: !currentlyHidden,
    });
  };

  const visibleStudios = studios.filter((s) => !s.isHidden);
  const hiddenStudios = studios.filter((s) => s.isHidden);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Manage Studio Schedule Visibility"
      description="Control which studios can view the competition schedule"
      size="lg"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4">
          <h4 className="font-medium text-amber-200 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Studio Visibility Control
          </h4>
          <p className="text-sm text-amber-100">
            By default, all studios with entries can view the schedule. You can block specific
            studios from viewing it (e.g., to motivate payment). Blocked studios will see a
            "Schedule Not Available" message.
          </p>
        </div>

        {/* Studio List */}
        {studios.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No studios with entries found for this competition</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visible Studios */}
            {visibleStudios.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Can View Schedule ({visibleStudios.length})
                </h3>
                <div className="space-y-2">
                  {visibleStudios.map((studio) => (
                    <div
                      key={studio.id}
                      className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600"
                    >
                      <div>
                        <p className="font-medium text-white">{studio.name}</p>
                        <p className="text-sm text-gray-400">
                          {studio.entryCount} {studio.entryCount === 1 ? 'entry' : 'entries'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleVisibility(studio.id, false)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors flex items-center gap-2"
                        disabled={toggleVisibilityMutation.isPending}
                      >
                        <EyeOff className="h-4 w-4" />
                        Block Access
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden Studios */}
            {hiddenStudios.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                  <EyeOff className="h-4 w-4" />
                  Blocked from Schedule ({hiddenStudios.length})
                </h3>
                <div className="space-y-2">
                  {hiddenStudios.map((studio) => (
                    <div
                      key={studio.id}
                      className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-500/30"
                    >
                      <div>
                        <p className="font-medium text-white">{studio.name}</p>
                        <p className="text-sm text-red-300">
                          {studio.entryCount} {studio.entryCount === 1 ? 'entry' : 'entries'} •
                          Cannot view schedule
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleVisibility(studio.id, true)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors flex items-center gap-2"
                        disabled={toggleVisibilityMutation.isPending}
                      >
                        <Eye className="h-4 w-4" />
                        Allow Access
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
