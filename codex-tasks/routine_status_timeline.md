## Task: Routine Status Timeline Component

**Context:**
- File: src/components/RoutineStatusTimeline.tsx
- Usage: Entry detail page showing status history
- Pattern: Vertical timeline with status transitions

**Requirements:**
1. Visual timeline showing routine status changes
2. Statuses: Created → Music Uploaded → Approved → Scheduled → Completed
3. Timestamp for each status
4. Current status highlighted
5. Future statuses grayed out
6. Icons for each status

**Deliverables:**
- Complete RoutineStatusTimeline.tsx component
- Export RoutineStatusTimeline
- Status type definitions

**Component Structure:**
```tsx
import { formatDistanceToNow } from 'date-fns';

interface StatusEvent {
  status: 'created' | 'music_uploaded' | 'approved' | 'scheduled' | 'completed' | 'rejected';
  timestamp: Date;
  note?: string;
}

interface RoutineStatusTimelineProps {
  events: StatusEvent[];
  currentStatus: string;
  className?: string;
}

const statusConfig = {
  created: {
    label: 'Routine Created',
    icon: '➕',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
  },
  music_uploaded: {
    label: 'Music Uploaded',
    icon: '🎵',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/50',
  },
  approved: {
    label: 'Approved',
    icon: '✅',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
  },
  scheduled: {
    label: 'Scheduled',
    icon: '📅',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
  },
  completed: {
    label: 'Completed',
    icon: '🏆',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
  },
  rejected: {
    label: 'Rejected',
    icon: '❌',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
  },
};

export function RoutineStatusTimeline({ events, currentStatus, className = '' }: RoutineStatusTimelineProps) {
  const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <div className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-6">Status Timeline</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/20"></div>

        {/* Events */}
        <div className="space-y-6">
          {sortedEvents.map((event, index) => {
            const config = statusConfig[event.status];
            const isCurrent = event.status === currentStatus;
            const isPast = index < sortedEvents.findIndex(e => e.status === currentStatus);
            const isFuture = !isPast && !isCurrent;

            return (
              <div key={index} className="relative flex gap-4">
                {/* Icon */}
                <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                  isCurrent
                    ? `${config.bgColor} ${config.borderColor}`
                    : isFuture
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-white/5 border-white/20'
                }`}>
                  <span className={`text-xl ${isFuture ? 'opacity-30' : ''}`}>
                    {config.icon}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className={`font-semibold ${isFuture ? 'text-gray-500' : config.color}`}>
                    {config.label}
                    {isCurrent && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                        Current
                      </span>
                    )}
                  </div>

                  {!isFuture && (
                    <>
                      <div className="text-sm text-gray-400 mt-1">
                        {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                      </div>
                      {event.note && (
                        <div className="text-sm text-gray-300 mt-2 p-2 rounded bg-white/5 border border-white/10">
                          {event.note}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact timeline variant for cards
 */
export function CompactStatusTimeline({ events, currentStatus }: { events: StatusEvent[]; currentStatus: string }) {
  const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const currentIndex = sortedEvents.findIndex(e => e.status === currentStatus);

  return (
    <div className="flex items-center gap-2">
      {sortedEvents.map((event, index) => {
        const config = statusConfig[event.status];
        const isCurrent = index === currentIndex;
        const isPast = index < currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div
            key={index}
            className={`flex items-center gap-2 ${isFuture ? 'opacity-30' : ''}`}
            title={`${config.label} - ${formatDistanceToNow(event.timestamp, { addSuffix: true })}`}
          >
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm ${
              isCurrent
                ? `${config.bgColor} ${config.borderColor} border-2`
                : isPast
                ? 'bg-white/5 border-white/20'
                : 'bg-gray-700 border-gray-600'
            }`}>
              {config.icon}
            </div>

            {index < sortedEvents.length - 1 && (
              <div className={`w-8 h-0.5 ${isPast ? 'bg-white/20' : 'bg-gray-600'}`}></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Usage Example:**
```tsx
// In EntryDetail.tsx
import { RoutineStatusTimeline } from '@/components/RoutineStatusTimeline';

const statusEvents: StatusEvent[] = [
  { status: 'created', timestamp: new Date('2025-10-01'), note: 'Initial submission' },
  { status: 'music_uploaded', timestamp: new Date('2025-10-05'), note: 'Track: "Swan Lake"' },
  { status: 'approved', timestamp: new Date('2025-10-07') },
  // Future events (no timestamp needed, will be grayed out)
];

<RoutineStatusTimeline
  events={statusEvents}
  currentStatus="approved"
/>
```

**Status Flow:**
1. `created` - Always first
2. `music_uploaded` - After music file added
3. `approved` - After CD approval
4. `scheduled` - After added to schedule
5. `completed` - After performance
6. `rejected` - Alternative end state

**Styling:**
- Timeline line: Vertical, white/20
- Icons: Rounded circles with emoji
- Current: Highlighted with glow
- Past: Muted colors
- Future: Gray/30 opacity
- Notes: Optional detail boxes

**Codex will**: Generate timeline component (both full + compact)
**Claude will**: Integrate into entry detail page, populate with real status data
