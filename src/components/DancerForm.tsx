'use client';

import { trpc } from '@/lib/trpc';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

interface DancerFormProps {
  studioId?: string;
  dancerId?: string; // For edit mode
}

const DancerSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'First name must be less than 100 characters'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name must be less than 100 characters'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  classification_id: z.string().min(1, 'Classification is required'),
});

type DancerFormValues = z.infer<typeof DancerSchema>;

export default function DancerForm({ studioId, dancerId }: DancerFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEditMode = !!dancerId;

  const form = useForm<DancerFormValues>({
    resolver: zodResolver(DancerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      classification_id: '',
    },
  });

  // Fetch existing dancer data for edit mode (include entry status)
  const { data: existingDancer, isLoading: isLoadingDancer } = trpc.dancer.getById.useQuery(
    { id: dancerId! },
    { enabled: isEditMode }
  );

  // Fetch classifications for dropdown
  const { data: lookupData } = trpc.lookup.getAllForEntry.useQuery();

  // Calculate submitted vs draft entry counts
  const submittedEntriesCount = useMemo(() => {
    if (!existingDancer?.entry_participants) return 0;

    return existingDancer.entry_participants.filter(
      (ep: any) => {
        const status = ep.competition_entries?.status;
        return status !== 'draft' && status !== 'cancelled' && status !== 'withdrawn';
      }
    ).length;
  }, [existingDancer]);

  const draftEntriesCount = useMemo(() => {
    if (!existingDancer?.entry_participants) return 0;

    return existingDancer.entry_participants.filter(
      (ep: any) => ep.competition_entries?.status === 'draft'
    ).length;
  }, [existingDancer]);

  // Pre-populate form data when editing
  useEffect(() => {
    if (existingDancer && isEditMode) {
      form.reset({
        first_name: existingDancer.first_name || '',
        last_name: existingDancer.last_name || '',
        date_of_birth: existingDancer.date_of_birth
          ? new Date(existingDancer.date_of_birth).toISOString().split('T')[0]
          : '',
        classification_id: existingDancer.classification_id || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingDancer?.id]);

  const createDancer = trpc.dancer.create.useMutation({
    onSuccess: () => {
      utils.dancer.getAll.invalidate();
      utils.dancer.getByStudio.invalidate(); // Invalidate entry form dancer cache
      toast.success('Dancer created successfully');
      router.push('/dashboard/dancers');
    },
    onError: (err) => toast.error(err.message || 'Failed to create dancer'),
  });

  const updateDancer = trpc.dancer.update.useMutation({
    onSuccess: () => {
      utils.dancer.getAll.invalidate();
      utils.dancer.getByStudio.invalidate(); // Invalidate entry form dancer cache
      utils.dancer.getById.invalidate({ id: dancerId! });
      toast.success('Dancer updated successfully');
      router.push('/dashboard/dancers');
    },
    onError: (err) => toast.error(err.message || 'Failed to update dancer'),
  });

  const deleteMutation = trpc.dancer.delete.useMutation({
    onSuccess: () => {
      utils.dancer.getAll.invalidate();
      utils.dancer.getByStudio.invalidate(); // Invalidate entry form dancer cache
      toast.success('Dancer deleted successfully');
      router.push('/dashboard/dancers');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete dancer'),
  });

  const archiveMutation = trpc.dancer.archive.useMutation({
    onSuccess: () => {
      utils.dancer.getAll.invalidate();
      utils.dancer.getByStudio.invalidate(); // Invalidate entry form dancer cache
      utils.dancer.getById.invalidate({ id: dancerId! });
      toast.success('Dancer archived successfully');
      router.push('/dashboard/dancers');
    },
    onError: (err) => toast.error(err.message || 'Failed to archive dancer'),
  });

  const onSubmit = async (values: DancerFormValues) => {
    if (!isEditMode && !studioId) {
      toast.error('Studio ID is required. Please make sure you are logged in.');
      return;
    }

    try {
      if (isEditMode) {
        // Update existing dancer
        await updateDancer.mutateAsync({
          id: dancerId!,
          data: {
            first_name: values.first_name,
            last_name: values.last_name,
            date_of_birth: values.date_of_birth,
            classification_id: values.classification_id,
          },
        });
      } else {
        // Create new dancer
        await createDancer.mutateAsync({
          studio_id: studioId!,
          first_name: values.first_name,
          last_name: values.last_name,
          date_of_birth: values.date_of_birth,
          classification_id: values.classification_id,
          status: 'active',
        });
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} dancer:`, error);
      // Error toast already shown in onError handler
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this dancer? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: dancerId! });
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Archive this dancer? They will be hidden from active lists but their data will be preserved.')) {
      return;
    }

    try {
      await archiveMutation.mutateAsync({ id: dancerId! });
    } catch (error) {
      console.error('Archive error:', error);
    }
  };

  // Calculate entry count and deletion eligibility
  const entriesCount = existingDancer?._count?.entry_participants || 0;
  const canDelete = entriesCount === 0;

  if (isEditMode && isLoadingDancer) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
        <div className="h-8 bg-white/20 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-white/20 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Dancer Information</h2>

          {/* Entry Count Badge - Only in edit mode */}
          {isEditMode && existingDancer && (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
              entriesCount > 0
                ? 'bg-purple-500/20 border border-purple-400/30 text-purple-300'
                : 'bg-green-500/20 border border-green-400/30 text-green-300'
            }`}>
              {entriesCount > 0 ? '🎭' : '✅'}
              {entriesCount > 0 ? `In ${entriesCount} Routine${entriesCount > 1 ? 's' : ''}` : 'No Routines'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-2">
              First Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="first_name"
              maxLength={100}
              {...form.register('first_name')}
              className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                form.formState.errors.first_name ? 'border-red-500' : 'border-white/20'
              }`}
              placeholder="Enter first name"
            />
            {form.formState.errors.first_name && (
              <p className="text-red-400 text-sm mt-1">{form.formState.errors.first_name.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-2">
              Last Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="last_name"
              maxLength={100}
              {...form.register('last_name')}
              className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                form.formState.errors.last_name ? 'border-red-500' : 'border-white/20'
              }`}
              placeholder="Enter last name"
            />
            {form.formState.errors.last_name && (
              <p className="text-red-400 text-sm mt-1">{form.formState.errors.last_name.message}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-300 mb-2">
              Date of Birth <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              id="date_of_birth"
              {...form.register('date_of_birth')}
              className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                form.formState.errors.date_of_birth ? 'border-red-500' : 'border-white/20'
              }`}
            />
            {form.formState.errors.date_of_birth && (
              <p className="text-red-400 text-sm mt-1">{form.formState.errors.date_of_birth.message}</p>
            )}
          </div>

          {/* Classification Info Banner */}
          <div className="p-4 bg-orange-500/10 border border-orange-400/30 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <p className="text-orange-300 font-semibold mb-1">Classification Determines Routine Placement</p>
                <p className="text-orange-200 text-sm mb-2">
                  Your dancer's classification decides which classification their routines go into.
                </p>
                <ul className="text-orange-200 text-sm space-y-1 list-disc list-inside">
                  <li>
                    <strong>Solos:</strong> Must match the dancer's classification.
                    <em className="text-orange-300/80"> ie. If a dancer is doing a solo for the first time they will be classified as a Novice dancer.</em>
                  </li>
                  <li>
                    <strong>Duets/Trios/Groups:</strong> Use the classification of the highest or majority dancers in the duet/trio/group (you can move up one level if needed).
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Classification */}
          <div>
            <label htmlFor="classification_id" className="block text-sm font-medium text-gray-300 mb-2">
              Classification <span className="text-red-400">*</span>
            </label>
            <select
              id="classification_id"
              {...form.register('classification_id')}
              disabled={isEditMode && submittedEntriesCount > 0}
              className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                form.formState.errors.classification_id ? 'border-red-500' : 'border-white/20'
              } ${isEditMode && submittedEntriesCount > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="">Select classification</option>
              {lookupData?.classifications?.filter((c: any) => c.name !== 'Production').map((classification: any) => (
                <option key={classification.id} value={classification.id}>
                  {classification.name}
                </option>
              ))}
            </select>
            {form.formState.errors.classification_id && (
              <p className="text-red-400 text-sm mt-1">{form.formState.errors.classification_id.message}</p>
            )}
            {isEditMode && submittedEntriesCount > 0 && (
              <p className="text-red-400 text-sm mt-1">
                Cannot change classification - dancer has {submittedEntriesCount} submitted {submittedEntriesCount === 1 ? 'entry' : 'entries'}
              </p>
            )}
            {isEditMode && draftEntriesCount > 0 && submittedEntriesCount === 0 && (
              <p className="text-yellow-300 text-sm mt-1">
                ⚠️ This dancer has {draftEntriesCount} draft {draftEntriesCount === 1 ? 'routine' : 'routines'}. Changing classification may affect routine placement and fees.
              </p>
            )}
          </div>
        </div>

        {/* Info/Warning Alert - Only in edit mode */}
        {isEditMode && existingDancer && (
          <div className={`flex items-start gap-4 p-4 rounded-xl border mt-6 ${
            entriesCount > 0
              ? 'bg-yellow-500/10 border-yellow-400/30'
              : 'bg-blue-500/10 border-blue-400/30'
          }`}>
            <div className="text-2xl flex-shrink-0">
              {entriesCount > 0 ? '⚠️' : 'ℹ️'}
            </div>
            <div>
              <h3 className={`font-semibold mb-2 ${
                entriesCount > 0 ? 'text-yellow-300' : 'text-blue-300'
              }`}>
                {entriesCount > 0 ? 'Cannot Delete This Dancer' : 'Safe to Delete'}
              </h3>
              <p className="text-gray-300 text-sm mb-2">
                {entriesCount > 0
                  ? `This dancer is registered in ${entriesCount} competition routine${entriesCount > 1 ? 's' : ''}. To remove this dancer, you must:`
                  : 'This dancer is not registered in any competition routines. You can safely delete this dancer if needed.'
                }
              </p>
              {entriesCount > 0 && (
                <ul className="text-gray-300 text-sm list-disc pl-5">
                  <li>Remove them from all routines first, or</li>
                  <li>Use "Archive" to keep their data while hiding them from active lists</li>
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end flex-wrap">
        <button
          type="button"
          onClick={() => router.push('/dashboard/dancers')}
          className="px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isEditMode ? updateDancer.isPending : createDancer.isPending}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isEditMode
            ? updateDancer.isPending
              ? 'Updating...'
              : 'Update Dancer'
            : createDancer.isPending
            ? 'Creating...'
            : 'Create Dancer'}
        </button>

        {/* Delete/Archive Button - Only in edit mode */}
        {isEditMode && existingDancer && (
          canDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="px-6 py-3 bg-red-500/20 border border-red-400/40 text-red-300 rounded-lg hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteMutation.isPending ? 'Deleting...' : '🗑️ Delete Dancer'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleArchive}
              disabled={archiveMutation.isPending}
              className="px-6 py-3 bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 rounded-lg hover:bg-yellow-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {archiveMutation.isPending ? 'Archiving...' : '📦 Archive Dancer'}
            </button>
          )
        )}
      </div>
    </form>
  );
}
