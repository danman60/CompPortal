'use client';

import { redirect, useRouter } from 'next/navigation';
import { EntryCreateFormV2 } from '@/components/rebuild/entries/EntryCreateFormV2';
import Link from 'next/link';
import { use } from 'react';

/**
 * Entry Edit Page
 * Uses EntryCreateFormV2 in edit mode by passing entryId
 * All data fetching and authorization handled within EntryCreateFormV2
 */
export default function EntryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto mb-6">
        <button
          onClick={() => router.back()}
          className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-white mb-2">Edit Routine</h1>
      </div>

      <EntryCreateFormV2 entryId={id} />
    </div>
  );
}
