import { Suspense } from 'react';
import { EntryCreateFormV2 } from '@/components/rebuild/entries/EntryCreateFormV2';

export default function EntryCreateV2Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-lg">Loading entry form...</div>
        </div>
      }>
        <EntryCreateFormV2 />
      </Suspense>
    </div>
  );
}
