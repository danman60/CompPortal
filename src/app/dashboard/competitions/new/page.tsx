'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

interface CompetitionFormData {
  name: string;
  year: number;
  description?: string;
  registration_opens?: string;
  registration_closes?: string;
  competition_start_date?: string;
  competition_end_date?: string;
  primary_location?: string;
  venue_address?: string;
  venue_capacity?: number;
  session_count: number;
  number_of_judges: number;
  entry_fee?: number;
  late_fee?: number;
  allow_age_overrides: boolean;
  allow_multiple_entries: boolean;
  require_video_submissions: boolean;
  status: 'upcoming' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';
  is_public: boolean;
}

export default function NewCompetitionPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompetitionFormData>({
    defaultValues: {
      year: new Date().getFullYear(),
      session_count: 1,
      number_of_judges: 3,
      allow_age_overrides: true,
      allow_multiple_entries: true,
      require_video_submissions: false,
      status: 'upcoming',
      is_public: true,
    },
  });

  const createMutation = trpc.competition.create.useMutation({
    onSuccess: () => {
      alert('Event created successfully!');
      router.push('/dashboard/competitions');
    },
    onError: (error) => {
      alert(`Failed to create event: ${error.message}`);
    },
  });

  const onSubmit = (data: CompetitionFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">🎭 Create New Event</h1>
        <p className="text-gray-400">Set up a new dance competition event</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">📋 Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Name <span className="text-red-400">*</span>
              </label>
              <input
                {...register('name', { required: 'Event name is required' })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="e.g., GlowDance Spring Showcase 2025"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Year <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                {...register('year', { required: true, valueAsNumber: true, min: 2000, max: 2100 })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                {...register('status')}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="upcoming">Upcoming</option>
                <option value="registration_open">Registration Open</option>
                <option value="registration_closed">Registration Closed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Event description..."
              />
            </div>
          </div>
        </div>

        {/* Dates & Location */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">📅 Dates & Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Registration Opens</label>
              <input
                type="datetime-local"
                {...register('registration_opens')}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Registration Closes</label>
              <input
                type="datetime-local"
                {...register('registration_closes')}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Competition Start Date</label>
              <input
                type="date"
                {...register('competition_start_date')}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Competition End Date</label>
              <input
                type="date"
                {...register('competition_end_date')}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Primary Location</label>
              <input
                {...register('primary_location')}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="e.g., Orlando, FL"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Venue Address</label>
              <input
                {...register('venue_address')}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Full venue address"
              />
            </div>
          </div>
        </div>

        {/* Competition Settings */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">⚙️ Competition Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Venue Capacity</label>
              <input
                type="number"
                {...register('venue_capacity', { valueAsNumber: true })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Max routines"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Number of Sessions</label>
              <input
                type="number"
                {...register('session_count', { valueAsNumber: true, min: 1 })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Number of Judges</label>
              <input
                type="number"
                {...register('number_of_judges', { valueAsNumber: true, min: 1 })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Routine Fee ($)</label>
              <input
                type="number"
                step="0.01"
                {...register('entry_fee', { valueAsNumber: true })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Late Fee ($)</label>
              <input
                type="number"
                step="0.01"
                {...register('late_fee', { valueAsNumber: true })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('allow_age_overrides')} className="w-5 h-5" />
              <span className="text-white">Allow age overrides</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('allow_multiple_entries')} className="w-5 h-5" />
              <span className="text-white">Allow multiple routines per dancer</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('require_video_submissions')} className="w-5 h-5" />
              <span className="text-white">Require video submissions</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('is_public')} className="w-5 h-5" />
              <span className="text-white">Public event (visible to all)</span>
            </label>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50"
          >
            {createMutation.isPending ? '⏳ Creating...' : '✨ Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
