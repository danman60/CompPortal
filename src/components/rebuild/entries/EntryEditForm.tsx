"use client";

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useEntryFormV2 } from '@/hooks/rebuild/useEntryFormV2';
import { RoutineDetailsSection } from './RoutineDetailsSection';
import { DancerSelectionSection } from './DancerSelectionSection';
import { AutoCalculatedSection } from './AutoCalculatedSection';
import { EntryFormActions } from './EntryFormActions';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

interface EntryEditFormProps {
  entry: any; // Full entry object with relations from server component
}

/**
 * Entry Edit Form Component
 * Based on EntryCreateFormV2 but pre-fills data and handles updates
 * Implements conditional field disabling when entry.status === 'summarized'
 */
export function EntryEditForm({ entry }: EntryEditFormProps) {
  const router = useRouter();

  // Determine if entry is summarized (lock most fields)
  const isSummarized = entry.reservations?.status === 'summarized';

  const { data: lookups, isLoading: lookupsLoading } = trpc.lookup.getAllForEntry.useQuery();

  const { data: dancersData, isLoading: dancersLoading } = trpc.dancer.getByStudio.useQuery(
    { studioId: entry.studio_id },
    { enabled: !!entry.studio_id }
  );

  const dancers = (dancersData?.dancers || []) as any[];

  const eventStartDate = entry.competitions.competition_start_date
    ? new Date(entry.competitions.competition_start_date)
    : null;

  const formHook = useEntryFormV2({
    eventStartDate,
    ageGroups: lookups?.ageGroups || [],
    sizeCategories: lookups?.entrySizeCategories || [],
  });

  // Add mutations for participant management
  const utils = trpc.useUtils();

  const removeParticipantMutation = trpc.entry.removeParticipant.useMutation({
    onSuccess: () => {
      // Invalidate entry cache to reflect participant removal
      utils.entry.getById.invalidate({ id: entry.id });
      utils.entry.getAll.invalidate();
    },
    onError: (error) => {
      console.error('Failed to remove participant:', error);
      toast.error('Failed to remove dancer from routine');
    },
  });

  const addParticipantMutation = trpc.entry.addParticipant.useMutation({
    onSuccess: () => {
      // Invalidate entry cache to reflect participant addition
      utils.entry.getById.invalidate({ id: entry.id });
      utils.entry.getAll.invalidate();
    },
    onError: (error) => {
      console.error('Failed to add participant:', error);
      toast.error('Failed to add dancer to routine');
    },
  });

  // Helper function to calculate age
  const calculateAge = (birthDate: Date | string): number => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Pre-fill form with entry data on mount
  useEffect(() => {
    if (entry) {
      // Set basic fields
      formHook.updateField('title', entry.title || '');
      formHook.updateField('choreographer', entry.choreographer || '');
      formHook.updateField('category_id', entry.category_id || '');
      formHook.updateField('classification_id', entry.classification_id || '');
      formHook.updateField('special_requirements', entry.special_requirements || '');
      formHook.updateField('is_title_upgrade', entry.is_title_upgrade || false);

      // Set selected dancers from participants
      if (entry.entry_participants && entry.entry_participants.length > 0) {
        const selectedDancers = entry.entry_participants.map((p: any) => ({
          dancer_id: p.dancer_id,
          dancer_name: p.dancer_name,
          dancer_age: p.dancer_age,
          date_of_birth: p.dancers?.date_of_birth || null,
          classification_id: p.dancers?.classification_id || null,
        }));

        // Need to set multiple dancers at once - call toggleDancer for each
        selectedDancers.forEach((dancer: any) => {
          formHook.toggleDancer(dancer);
        });
      }
    }
  }, [entry.id]); // Only run once when entry ID is available

  const updateMutation = trpc.entry.update.useMutation({
    onSuccess: () => {
      toast.success('Entry updated successfully!');
      router.push('/dashboard/entries');
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  if (lookupsLoading || dancersLoading) {
    return (
      <div className="max-w-4xl mx-auto mt-20 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center text-white">
        Loading form...
      </div>
    );
  }

  if (!lookups) {
    return (
      <div className="max-w-4xl mx-auto mt-20 bg-red-500/20 border border-red-500/50 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-red-300 mb-4">Invalid Data</h2>
        <button onClick={() => router.push('/dashboard/entries')} className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg">
          Back to Entries
        </button>
      </div>
    );
  }

  const handleSave = async (action: any) => {
    if (action === 'cancel') {
      router.push('/dashboard/entries');
      return;
    }

    try {
      // Prepare update payload
      const updateData: any = {
        title: formHook.form.title,
        choreographer: formHook.form.choreographer || undefined,
      };

      // Only include editable fields if NOT summarized
      if (!isSummarized) {
        updateData.category_id = formHook.form.category_id;
        updateData.classification_id = formHook.form.classification_id;
        updateData.special_requirements = formHook.form.special_requirements || undefined;
        updateData.age_group_id = formHook.effectiveAgeGroup?.id;
        updateData.entry_size_category_id = formHook.effectiveSizeCategory?.id;
        updateData.is_title_upgrade = formHook.form.is_title_upgrade;
      }

      await updateMutation.mutateAsync({
        id: entry.id,
        data: updateData,
      });

      // Update participants if changed and not summarized
      if (!isSummarized) {
        // Get current participant IDs from entry
        const currentParticipantIds = new Set(
          entry.entry_participants?.map((p: any) => p.dancer_id) || []
        );

        // Get selected participant IDs from form
        const selectedParticipantIds = new Set(
          formHook.form.selectedDancers.map((d: any) => d.dancer_id)
        );

        // Find removed participants
        const removedIds = [...currentParticipantIds].filter(
          id => !selectedParticipantIds.has(id)
        );

        // Find added participants
        const addedIds = [...selectedParticipantIds].filter(
          id => !currentParticipantIds.has(id)
        );

        // Remove participants
        for (const dancerId of removedIds) {
          const participant = entry.entry_participants?.find(
            (p: any) => p.dancer_id === dancerId
          );
          if (participant) {
            await removeParticipantMutation.mutateAsync({
              participantId: participant.id,
            });
          }
        }

        // Add participants
        for (const dancerId of addedIds) {
          const dancer = dancers.find((d: any) => d.id === dancerId);
          if (dancer) {
            await addParticipantMutation.mutateAsync({
              entryId: entry.id,
              participant: {
                dancer_id: dancerId,
                dancer_name: `${dancer.first_name} ${dancer.last_name}`,
                dancer_age: calculateAge(dancer.date_of_birth),
              },
            });
          }
        }
      }

      toast.success('Routine updated successfully!');
      router.push('/dashboard/entries');
    } catch (error) {
      console.error('Failed to update entry:', error);
      toast.error('Failed to update routine. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Warning message if summarized */}
      {isSummarized && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-lg font-bold text-yellow-300 mb-1">Entry Summarized</h3>
              <p className="text-yellow-100/90 text-sm">
                This entry has been summarized and submitted. Only the title and choreographer can be edited.
                To make other changes, please contact the competition director.
              </p>
            </div>
          </div>
        </div>
      )}

      <RoutineDetailsSection
        form={formHook.form}
        updateField={formHook.updateField}
        categories={lookups.categories}
        classifications={lookups.classifications}
        disabled={isSummarized}
      />

      {!isSummarized && (
        <>
          <DancerSelectionSection
            dancers={dancers}
            selectedDancers={formHook.form.selectedDancers}
            toggleDancer={formHook.toggleDancer}
            eventStartDate={eventStartDate}
          />

          <AutoCalculatedSection
            calculatedAge={formHook.calculatedAge}
            allowedAges={formHook.allowedAges}
            effectiveAge={formHook.effectiveAge}
            inferredAgeGroup={formHook.inferredAgeGroup}
            inferredSizeCategory={formHook.inferredSizeCategory}
            effectiveAgeGroup={formHook.effectiveAgeGroup}
            effectiveSizeCategory={formHook.effectiveSizeCategory}
            form={formHook.form}
            updateField={formHook.updateField}
            sizeCategoryOverride={formHook.form.size_category_override}
            setSizeCategoryOverride={(id) => formHook.updateField('size_category_override', id)}
            ageGroups={lookups.ageGroups}
            sizeCategories={lookups.entrySizeCategories}
            selectedDancerCount={formHook.form.selectedDancers.length}
            selectedDancers={formHook.form.selectedDancers}
            classifications={lookups.classifications}
            classificationId={formHook.form.classification_id}
            setClassificationId={(id) => formHook.updateField('classification_id', id)}
          />

          {/* Title Upgrade Option */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formHook.form.is_title_upgrade}
                onChange={(e) => formHook.updateField('is_title_upgrade', e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-2 border-purple-400/50 bg-white/10
                         checked:bg-purple-500 checked:border-purple-500
                         focus:ring-2 focus:ring-purple-500/50 cursor-pointer
                         transition-all duration-200"
              />
              <div className="flex-1">
                <div className="text-white font-medium group-hover:text-purple-300 transition-colors">
                  Title Upgrade (+$30)
                </div>
                <div className="text-sm text-gray-300 mt-1">
                  Select if this routine is competing for title. Additional $30 fee applies.
                </div>
              </div>
            </label>
          </div>
        </>
      )}

      <EntryFormActions
        canSave={isSummarized ? formHook.form.title.trim().length >= 3 : formHook.canSave}
        isLoading={updateMutation.isPending}
        validationErrors={isSummarized ? [] : formHook.validationErrors}
        onSave={handleSave}
        mode="edit"
      />
    </div>
  );
}
