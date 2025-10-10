'use client';

import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface DancerRow {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  skill_level?: string;
}

interface DancerBatchFormProps {
  studioId: string;
}

export default function DancerBatchForm({ studioId }: DancerBatchFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm<{
    dancers: DancerRow[];
  }>({
    defaultValues: {
      dancers: Array(1).fill({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        email: '',
        phone: '',
        skill_level: '',
      }),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'dancers',
  });

  const batchCreateMutation = trpc.dancer.batchCreate.useMutation({
    onSuccess: (data) => {
      if (data.successful > 0) {
        toast.success(
          `Successfully created ${data.successful} dancer(s)!` +
          (data.failed > 0 ? ` ${data.failed} failed.` : ''),
          { duration: 5000 }
        );
        router.push('/dashboard/dancers');
      }
      if (data.errors && data.errors.length > 0) {
        data.errors.forEach((err) => toast.error(err, { duration: 6000 }));
      }
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error(`Batch create failed: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: { dancers: DancerRow[] }) => {
    // Filter out completely empty rows
    const validDancers = data.dancers.filter(
      (dancer) => dancer.first_name.trim() !== '' || dancer.last_name.trim() !== ''
    );

    if (validDancers.length === 0) {
      toast.error('Please enter at least one dancer.');
      return;
    }

    // Validate that all dancers have both first and last name
    const incompleteRows = validDancers.filter(
      (dancer) => !dancer.first_name.trim() || !dancer.last_name.trim()
    );

    if (incompleteRows.length > 0) {
      toast.error('All dancers must have both first name and last name.');
      return;
    }

    setIsSubmitting(true);
    batchCreateMutation.mutate({
      studio_id: studioId,
      dancers: validDancers.map((dancer) => ({
        ...dancer,
        // Clean up empty strings
        email: dancer.email?.trim() || undefined,
        phone: dancer.phone?.trim() || undefined,
        gender: dancer.gender?.trim() || undefined,
        skill_level: dancer.skill_level?.trim() || undefined,
        date_of_birth: dancer.date_of_birth?.trim() || undefined,
      })),
    });
  };

  const addRow = () => {
    append({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      email: '',
      phone: '',
      skill_level: '',
    });
  };

  const addMultipleRows = (count: number) => {
    for (let i = 0; i < count; i++) {
      append({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        email: '',
        phone: '',
        skill_level: '',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-200 mb-2">📝 Instructions</h3>
        <ul className="text-blue-300 text-sm space-y-1">
          <li>• Fill in dancer information in the table below</li>
          <li>• First Name and Last Name are required</li>
          <li>• Empty rows will be skipped automatically</li>
          <li>• Click "+ Add Row" to add more dancers</li>
          <li>• Click "Save All Dancers" when you're done</li>
        </ul>
      </div>

      {/* Quick Add Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addRow}
          className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg font-semibold transition-all border border-green-400/30"
        >
          + Add 1 Row
        </button>
        <button
          type="button"
          onClick={() => addMultipleRows(5)}
          className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg font-semibold transition-all border border-green-400/30"
        >
          + Add 5 Rows
        </button>
        <button
          type="button"
          onClick={() => addMultipleRows(10)}
          className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg font-semibold transition-all border border-green-400/30"
        >
          + Add 10 Rows
        </button>
      </div>

      {/* Table */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/20">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-8">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  First Name <span className="text-red-400">*</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Last Name <span className="text-red-400">*</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Birth Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Gender
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Skill Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-16">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {fields.map((field, index) => (
                <tr key={field.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2 text-gray-400 text-sm">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      {...register(`dancers.${index}.first_name` as const)}
                      type="text"
                      placeholder="First name"
                      className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      {...register(`dancers.${index}.last_name` as const)}
                      type="text"
                      placeholder="Last name"
                      className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      {...register(`dancers.${index}.date_of_birth` as const)}
                      type="date"
                      className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      {...register(`dancers.${index}.gender` as const)}
                      className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent [&>option]:bg-gray-800 [&>option]:text-white"
                    >
                      <option value="" className="bg-gray-800 text-white">Select...</option>
                      <option value="Male" className="bg-gray-800 text-white">Male</option>
                      <option value="Female" className="bg-gray-800 text-white">Female</option>
                      <option value="Non-binary" className="bg-gray-800 text-white">Non-binary</option>
                      <option value="Other" className="bg-gray-800 text-white">Other</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      {...register(`dancers.${index}.email` as const)}
                      type="email"
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      {...register(`dancers.${index}.phone` as const)}
                      type="tel"
                      placeholder="555-1234"
                      className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      {...register(`dancers.${index}.skill_level` as const)}
                      className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent [&>option]:bg-gray-800 [&>option]:text-white"
                    >
                      <option value="" className="bg-gray-800 text-white">Select...</option>
                      <option value="Beginner" className="bg-gray-800 text-white">Beginner</option>
                      <option value="Novice" className="bg-gray-800 text-white">Novice</option>
                      <option value="Intermediate" className="bg-gray-800 text-white">Intermediate</option>
                      <option value="Advanced" className="bg-gray-800 text-white">Advanced</option>
                      <option value="Elite" className="bg-gray-800 text-white">Elite</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-semibold transition-all border border-red-400/30 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove this row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="flex justify-between items-center">
        <div className="text-gray-400 text-sm">
          Total rows: <span className="text-white font-semibold">{fields.length}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {isSubmitting ? 'Saving...' : '💾 Save All Dancers'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/dancers')}
          disabled={isSubmitting}
          className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-lg transition-all disabled:opacity-50 border border-white/20"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
