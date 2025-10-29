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
        // For now, we'll just update the entry fields
        // Participant updates would require additional mutations
        // TODO: Implement participant add/remove mutations
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
            inferredAgeGroup={formHook.inferredAgeGroup}
            inferredSizeCategory={formHook.inferredSizeCategory}
            effectiveAgeGroup={formHook.effectiveAgeGroup}
            effectiveSizeCategory={formHook.effectiveSizeCategory}
            ageGroupOverride={formHook.form.age_group_override}
            sizeCategoryOverride={formHook.form.size_category_override}
            setAgeGroupOverride={(id) => formHook.updateField('age_group_override', id)}
            setSizeCategoryOverride={(id) => formHook.updateField('size_category_override', id)}
            ageGroups={lookups.ageGroups}
            sizeCategories={lookups.entrySizeCategories}
            selectedDancerCount={formHook.form.selectedDancers.length}
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
