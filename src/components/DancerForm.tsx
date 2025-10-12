'use client';

import { trpc } from '@/lib/trpc';
import { useEffect } from 'react';
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
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: z.string().min(7, 'Phone number must be at least 7 characters').max(50, 'Phone number must be less than 50 characters').optional().or(z.literal('')),
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
      gender: '',
      email: '',
      phone: '',
    },
  });

  // Fetch existing dancer data for edit mode
  const { data: existingDancer, isLoading: isLoadingDancer } = trpc.dancer.getById.useQuery(
    { id: dancerId! },
    { enabled: isEditMode }
  );

  // Pre-populate form data when editing
  useEffect(() => {
    if (existingDancer && isEditMode) {
      form.reset({
        first_name: existingDancer.first_name || '',
        last_name: existingDancer.last_name || '',
        date_of_birth: existingDancer.date_of_birth
          ? new Date(existingDancer.date_of_birth).toISOString().split('T')[0]
          : '',
        gender: existingDancer.gender || '',
        email: existingDancer.email || '',
        phone: existingDancer.phone || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingDancer?.id]);

  const createDancer = trpc.dancer.create.useMutation({
    onSuccess: () => {
      utils.dancer.getAll.invalidate();
      toast.success('Dancer created successfully');
      router.push('/dashboard/dancers');
    },
    onError: (err) => toast.error(err.message || 'Failed to create dancer'),
  });

  const updateDancer = trpc.dancer.update.useMutation({
    onSuccess: () => {
      utils.dancer.getAll.invalidate();
      utils.dancer.getById.invalidate({ id: dancerId! });
      toast.success('Dancer updated successfully');
      router.push('/dashboard/dancers');
    },
    onError: (err) => toast.error(err.message || 'Failed to update dancer'),
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
            date_of_birth: values.date_of_birth || undefined,
            gender: values.gender || undefined,
            email: values.email || undefined,
            phone: values.phone || undefined,
          },
        });
      } else {
        // Create new dancer
        await createDancer.mutateAsync({
          studio_id: studioId!,
          first_name: values.first_name,
          last_name: values.last_name,
          date_of_birth: values.date_of_birth || undefined,
          gender: values.gender || undefined,
          email: values.email || undefined,
          phone: values.phone || undefined,
          status: 'active',
        });
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} dancer:`, error);
      // Error toast already shown in onError handler
    }
  };

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
        <h2 className="text-2xl font-bold text-white mb-6">Dancer Information</h2>

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
              Date of Birth
            </label>
            <input
              type="date"
              id="date_of_birth"
              {...form.register('date_of_birth')}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Gender */}
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-300 mb-2">
              Gender
            </label>
            <select
              id="gender"
              {...form.register('gender')}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              {...form.register('email')}
              className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                form.formState.errors.email ? 'border-red-500' : 'border-white/20'
              }`}
              placeholder="dancer@example.com"
            />
            {form.formState.errors.email && (
              <p className="text-red-400 text-sm mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              maxLength={50}
              {...form.register('phone')}
              className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                form.formState.errors.phone ? 'border-red-500' : 'border-white/20'
              }`}
              placeholder="(555) 123-4567"
            />
            {form.formState.errors.phone && (
              <p className="text-red-400 text-sm mt-1">{form.formState.errors.phone.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
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
      </div>
    </form>
  );
}
