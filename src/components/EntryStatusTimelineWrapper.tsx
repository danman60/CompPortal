'use client';
import { trpc } from '@/lib/trpc';
import { RoutineStatusTimeline } from './RoutineStatusTimeline';

export default function EntryStatusTimelineWrapper({ entryId }: { entryId: string }) {
  const { data: entry } = trpc.entry.getById.useQuery({ id: entryId });

  if (!entry) return null;

  const statusOrder = ['draft', 'registered', 'confirmed', 'completed'];
  const currentIndex = Math.max(0, statusOrder.indexOf(entry.status || 'draft'));
  const now = new Date();
  const events = statusOrder.slice(0, currentIndex + 1).map((status, i) => ({
    status: (status === 'registered' ? 'created' : (status === 'confirmed' ? 'approved' : status)) as any,
    timestamp: new Date(now.getTime() - (currentIndex - i) * 60 * 60 * 1000),
    note: undefined as string | undefined,
  }));

  const currentStatus = events[events.length - 1]?.status || 'created';

  return (
    <RoutineStatusTimeline events={events as any} currentStatus={currentStatus as any} />
  );
}

