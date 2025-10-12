'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function UnifiedRoutineForm() {
  const router = useRouter();

  // Lookups and user
  const { data: currentUser } = trpc.user.getCurrentUser.useQuery();
  const { data: competitions } = trpc.competition.getAll.useQuery();
  const { data: studios } = trpc.studio.getAll.useQuery();
  const { data: lookupData } = trpc.lookup.getAllForEntry.useQuery();

  const [form, setForm] = useState({
    studio_id: '',
    competition_id: '',
    title: '',
    choreographer: '',
    category_id: '',
    classification_id: '',
    age_group_id: '',
    entry_size_category_id: '',
    special_requirements: '',
  });

  // Auto-select studio for studio directors
  useEffect(() => {
    if (!form.studio_id && currentUser?.role === 'studio_director' && currentUser.studio?.id) {
      setForm((f) => ({ ...f, studio_id: currentUser.studio!.id }));
    }
  }, [currentUser, form.studio_id]);

  const createMutation = trpc.entry.create.useMutation({
    onSuccess: () => {
      toast.success('Routine created');
      router.push('/dashboard/entries');
    },
    onError: (error) => {
      toast.error(`Error creating routine: ${error.message}`);
    },
  });

  const sizeCategory = lookupData?.entrySizeCategories.find((s: any) => s.id === form.entry_size_category_id);
  const baseFee = Number(sizeCategory?.base_fee || 0);
  const perParticipantFee = Number(sizeCategory?.per_participant_fee || 0);
  const totalFee = baseFee; // Participants selected later; set base for now

  const canSubmit =
    !!form.title &&
    !!form.studio_id &&
    !!form.competition_id &&
    !!form.category_id &&
    !!form.classification_id &&
    !!form.age_group_id &&
    !!form.entry_size_category_id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error('Please fill all required fields');
      return;
    }

    createMutation.mutate({
      competition_id: form.competition_id,
      studio_id: form.studio_id,
      title: form.title,
      category_id: form.category_id,
      classification_id: form.classification_id,
      age_group_id: form.age_group_id,
      entry_size_category_id: form.entry_size_category_id,
      choreographer: form.choreographer || undefined,
      special_requirements: form.special_requirements || undefined,
      entry_fee: totalFee,
      total_fee: totalFee,
      status: 'draft',
      participants: [],
    } as any);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Routine Name *</label>
            <input
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Choreographer</label>
            <input
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
              value={form.choreographer}
              onChange={(e) => setForm({ ...form, choreographer: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Competition *</label>
            <select
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
              value={form.competition_id}
              onChange={(e) => setForm({ ...form, competition_id: e.target.value })}
            >
              <option value="" className="bg-gray-900">Select competition</option>
              {competitions?.competitions?.map((c: any) => (
                <option key={c.id} value={c.id} className="bg-gray-900">
                  {c.name} ({c.year})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Studio *</label>
            <select
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white disabled:opacity-60"
              disabled={currentUser?.role === 'studio_director'}
              value={form.studio_id}
              onChange={(e) => setForm({ ...form, studio_id: e.target.value })}
            >
              <option value="" className="bg-gray-900">Select studio</option>
              {studios?.studios?.map((s: any) => (
                <option key={s.id} value={s.id} className="bg-gray-900">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">Classification</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Dance Category *</label>
            <select
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="" className="bg-gray-900">Select category</option>
              {lookupData?.categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id} className="bg-gray-900">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Classification *</label>
            <select
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
              value={form.classification_id}
              onChange={(e) => setForm({ ...form, classification_id: e.target.value })}
            >
              <option value="" className="bg-gray-900">Select classification</option>
              {lookupData?.classifications?.map((cl: any) => (
                <option key={cl.id} value={cl.id} className="bg-gray-900">
                  {cl.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Age Group *</label>
            <select
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
              value={form.age_group_id}
              onChange={(e) => setForm({ ...form, age_group_id: e.target.value })}
            >
              <option value="" className="bg-gray-900">Select age group</option>
              {lookupData?.ageGroups?.map((ag: any) => (
                <option key={ag.id} value={ag.id} className="bg-gray-900">
                  {ag.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Size Category *</label>
            <select
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
              value={form.entry_size_category_id}
              onChange={(e) => setForm({ ...form, entry_size_category_id: e.target.value })}
            >
              <option value="" className="bg-gray-900">Select size</option>
              {lookupData?.entrySizeCategories?.map((sz: any) => (
                <option key={sz.id} value={sz.id} className="bg-gray-900">
                  {sz.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">Additional Details</h2>
        <label className="block text-sm text-gray-300 mb-1">Props / Special Requirements</label>
        <textarea
          className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
          rows={3}
          value={form.special_requirements}
          onChange={(e) => setForm({ ...form, special_requirements: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">Estimated Fee: ${totalFee.toFixed(2)}</div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || createMutation.isPending}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'Creating…' : 'Create Routine'}
          </button>
        </div>
      </div>
    </div>
  );
}

