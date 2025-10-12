'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

const ProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional().or(z.literal('')),
  notificationsEnabled: z.boolean().optional(),
});

type ProfileFormValues = z.infer<typeof ProfileSchema>;

export default function ProfileSettingsForm() {
  const utils = trpc.useUtils();
  const { data: user, isLoading } = trpc.user.getCurrentUser.useQuery();
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.user.getCurrentUser.invalidate();
      toast.success('Profile updated successfully');
    },
    onError: (err) => toast.error(err.message || 'Failed to update profile'),
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      notificationsEnabled: true,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        notificationsEnabled: user.notificationsEnabled ?? true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onSubmit = (values: ProfileFormValues) => {
    updateProfile.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-1/3 bg-white/10 rounded animate-pulse" />
        <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
        <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">First Name</label>
          <input
            type="text"
            {...form.register('first_name')}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg"
            placeholder="First name"
          />
          {form.formState.errors.first_name && (
            <p className="text-red-400 text-sm mt-1">{form.formState.errors.first_name.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Last Name</label>
          <input
            type="text"
            {...form.register('last_name')}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg"
            placeholder="Last name"
          />
          {form.formState.errors.last_name && (
            <p className="text-red-400 text-sm mt-1">{form.formState.errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Email</label>
        <input
          type="email"
          value={user?.email || ''}
          disabled
          className="w-full px-4 py-2 bg-white/10 border border-white/20 text-gray-300 rounded-lg cursor-not-allowed"
        />
        <p className="text-xs text-gray-300 mt-1">Email cannot be changed</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Phone</label>
        <input
          type="tel"
          {...form.register('phone')}
          className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg"
          placeholder="(555) 123-4567"
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
        <div>
          <h3 className="text-white font-semibold">Email Notifications</h3>
          <p className="text-sm text-gray-300">Receive updates about competitions and entries</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const current = form.getValues('notificationsEnabled') ?? true;
            form.setValue('notificationsEnabled', !current);
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            form.getValues('notificationsEnabled') ? 'bg-purple-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              form.getValues('notificationsEnabled') ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

