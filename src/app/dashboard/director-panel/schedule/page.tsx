'use client';

/**
 * Phase 2 Scheduling Interface
 *
 * Features:
 * - Left panel: Unscheduled routines pool with filters
 * - Middle panel: Visual schedule builder (timeline/calendar view)
 * - Right panel: Conflict warnings and schedule stats
 * - Drag-and-drop scheduling
 * - Real-time conflict detection
 * - Studio code masking (A, B, C, etc.)
 */

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';

// TEST tenant ID
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';
const TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';

interface Routine {
  id: string;
  title: string;
  studioId: string;
  studioName: string;
  studioCode: string;
  classificationId: string;
  classificationName: string;
  categoryId: string;
  categoryName: string;
  ageGroupId: string;
  ageGroupName: string;
  entrySizeId: string;
  entrySizeName: string;
  duration: number;
  participants: Array<{
    dancerId: string;
    dancerName: string;
    dancerAge: number | null;
  }>;
  isScheduled: boolean;
  scheduleZone: string | null; // Zone ID: saturday-am, saturday-pm, etc.
  scheduledTime: Date | null;
  scheduledDay: Date | null;
}

type ScheduleZone = 'saturday-am' | 'saturday-pm' | 'sunday-am' | 'sunday-pm' | 'unscheduled';

interface ScheduleBlock {
  id: string;
  type: 'award' | 'break';
  title: string;
  duration: number; // minutes
  zone: ScheduleZone | null;
}

function DraggableBlock({ block }: { block: ScheduleBlock }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `block-${block.id}`,
  });

  const isAward = block.type === 'award';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        border-2 rounded-lg p-3 cursor-grab transition-all mb-2
        ${isDragging ? 'opacity-50' : ''}
        ${isAward
          ? 'border-yellow-500/50 bg-yellow-900/20 hover:border-yellow-400'
          : 'border-gray-500/50 bg-gray-900/20 hover:border-gray-400'}
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{isAward ? '🏆' : '☕'}</span>
        <div className="flex-1">
          <div className="font-bold text-white text-sm">{block.title}</div>
          <div className="text-xs text-gray-300">{block.duration} minutes</div>
        </div>
      </div>
    </div>
  );
}

function DraggableRoutineCard({ routine, inZone, viewMode, onRequestClick, isAnyDragging }: { routine: Routine; inZone?: boolean; viewMode: 'cd' | 'studio' | 'judge' | 'public'; onRequestClick?: (routineId: string) => void; isAnyDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: routine.id,
  });

  // Determine studio display based on view mode
  const getStudioDisplay = () => {
    switch (viewMode) {
      case 'cd':
        return `${routine.studioCode} (${routine.studioName})`;
      case 'studio':
        return routine.studioName; // Full name only
      case 'judge':
        return routine.studioCode; // Code only, no prefix
      case 'public':
        return routine.studioName; // Full names revealed
      default:
        return routine.studioCode;
    }
  };

  // Classification color mapping
  const getClassificationColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('emerald')) return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
    if (lower.includes('sapphire')) return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
    if (lower.includes('crystal')) return 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300';
    if (lower.includes('titanium')) return 'bg-slate-400/20 border-slate-400/40 text-slate-300';
    if (lower.includes('production')) return 'bg-purple-500/20 border-purple-500/40 text-purple-300';
    return 'bg-gray-500/20 border-gray-500/40 text-gray-300';
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        relative rounded-xl p-4 cursor-grab transition-all
        ${isDragging ? 'opacity-50 rotate-3 scale-105' : 'hover:translate-y-[-4px]'}
        ${inZone
          ? 'bg-white/15 border-2 border-green-400/50 shadow-[0_4px_16px_rgba(0,0,0,0.1)]'
          : 'bg-white/15 border border-white/25 shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.15)] hover:border-white/40'}
      `}
    >
      {/* Title + Studio Badge Row */}
      <div className="flex items-start justify-between mb-2" style={{ pointerEvents: isAnyDragging ? 'none' : 'auto' }}>
        <h3 className="text-lg font-semibold text-white leading-tight flex-1 pr-2">
          🎭 {routine.title}
        </h3>
        <span className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm px-3 py-1 rounded-lg shadow-md">
          {getStudioDisplay().split(' ')[0]}
        </span>
      </div>

      {/* Duration Tag (top right corner) */}
      <div className="absolute top-2 right-2 bg-black/30 px-2 py-1 rounded-md text-xs text-white/90" style={{ pointerEvents: isAnyDragging ? 'none' : 'auto' }}>
        ⏱️ {routine.duration} min
      </div>

      {/* Classification Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium mb-2 ${getClassificationColor(routine.classificationName)}`} style={{ pointerEvents: isAnyDragging ? 'none' : 'auto' }}>
        🔷 {routine.classificationName} • {routine.categoryName}
      </div>

      {/* Age Group + Size */}
      <div className="flex gap-2 text-sm text-white/80" style={{ pointerEvents: isAnyDragging ? 'none' : 'auto' }}>
        <span>👥 {routine.ageGroupName}</span>
        <span>•</span>
        <span>{routine.entrySizeName}</span>
      </div>

      {/* Studio Request Button (for Studio Directors) */}
      {viewMode === 'studio' && onRequestClick && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag from triggering
            onRequestClick(routine.id);
          }}
          className="mt-3 w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
        >
          📝 Add Request
        </button>
      )}
    </div>
  );
}

function DropZone({ id, label, routines, blocks, viewMode, onRequestClick, isAnyDragging }: { id: ScheduleZone; label: string; routines: Routine[]; blocks: ScheduleBlock[]; viewMode: 'cd' | 'studio' | 'judge' | 'public'; onRequestClick?: (routineId: string) => void; isAnyDragging?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const isEmpty = routines.length === 0 && blocks.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-xl p-4 min-h-[200px] transition-all duration-300
        ${isEmpty
          ? `border-2 border-dashed ${isOver ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_24px_rgba(251,191,36,0.3)]' : 'border-white/30 bg-gradient-to-br from-white/5 to-white/2 hover:border-white/50 hover:bg-white/8'}`
          : `border border-white/15 bg-white/5 ${isOver ? 'border-amber-400/50 bg-amber-500/10' : ''}`
        }
      `}
    >
      <h3 className="font-bold text-white mb-3">{label}</h3>
      <div className="space-y-2">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-4xl mb-2 opacity-60">📥</div>
            <p className="text-white/70 text-sm font-medium">
              Drop routines here
            </p>
            <p className="text-white/50 text-xs mt-1">
              {isOver ? 'Release to schedule' : '0 routines'}
            </p>
          </div>
        )}

        {/* Schedule Blocks in Zone */}
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`
              border-2 rounded-lg p-3 mb-2
              ${block.type === 'award'
                ? 'border-yellow-500 bg-yellow-900/40'
                : 'border-gray-500 bg-gray-900/40'}
            `}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{block.type === 'award' ? '🏆' : '☕'}</span>
              <div className="flex-1">
                <div className="font-bold text-white text-sm">{block.title}</div>
                <div className="text-xs text-gray-300">{block.duration} min</div>
              </div>
            </div>
          </div>
        ))}

        {/* Routines in Zone */}
        {routines.map((routine) => (
          <DraggableRoutineCard key={routine.id} routine={routine} inZone viewMode={viewMode} onRequestClick={onRequestClick} isAnyDragging={isAnyDragging} />
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-purple-500/30">
        <p className="text-xs text-purple-300">
          {routines.length} routine{routines.length !== 1 ? 's' : ''} • {blocks.length} block{blocks.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [selectedClassification, setSelectedClassification] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  // Track which zone each routine is in
  const [routineZones, setRoutineZones] = useState<Record<string, ScheduleZone>>({});

  // Conflict override state
  const [overrideConflictId, setOverrideConflictId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  // Studio request state
  const [showRequestForm, setShowRequestForm] = useState<string | null>(null); // routine ID
  const [requestContent, setRequestContent] = useState('');

  // CD Request Management
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);

  // Track schedule blocks
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([
    {
      id: 'award-template',
      type: 'award',
      title: '🏆 Award Block',
      duration: 30,
      zone: null,
    },
    {
      id: 'break-template',
      type: 'break',
      title: '☕ Break Block',
      duration: 15,
      zone: null,
    },
  ]);

  // Fetch routines
  const { data: routines, isLoading, error, refetch } = trpc.scheduling.getRoutines.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
    classificationId: selectedClassification || undefined,
    categoryId: selectedCategory || undefined,
    searchQuery: searchQuery || undefined,
  });

  // Fetch Trophy Helper
  const { data: trophyHelper } = trpc.scheduling.getTrophyHelper.useQuery({
    competitionId: TEST_COMPETITION_ID,
  });

  // Fetch Conflicts
  const { data: conflictsData, refetch: refetchConflicts } = trpc.scheduling.detectConflicts.useQuery({
    competitionId: TEST_COMPETITION_ID,
  });

  // Fetch Studio Requests (for CD)
  const { data: studioRequests, refetch: refetchRequests } = trpc.scheduling.getStudioRequests.useQuery({
    competitionId: TEST_COMPETITION_ID,
    tenantId: TEST_TENANT_ID,
  });

  // State Machine mutations
  const finalizeMutation = trpc.scheduling.finalizeSchedule.useMutation({
    onSuccess: () => {
      alert('Schedule finalized! Entry numbers are now locked.');
      refetch();
    },
    onError: (error) => {
      alert(`Cannot finalize: ${error.message}`);
    },
  });

  const publishMutation = trpc.scheduling.publishSchedule.useMutation({
    onSuccess: () => {
      alert('Schedule published! Studio names are now revealed.');
      refetch();
    },
    onError: (error) => {
      alert(`Cannot publish: ${error.message}`);
    },
  });

  const unlockMutation = trpc.scheduling.unlockSchedule.useMutation({
    onSuccess: () => {
      alert('Schedule unlocked! You can now make changes.');
      refetch();
    },
    onError: (error) => {
      alert(`Cannot unlock: ${error.message}`);
    },
  });

  // Studio Request mutations
  const addRequestMutation = trpc.scheduling.addStudioRequest.useMutation({
    onSuccess: () => {
      alert('Request submitted successfully!');
      setShowRequestForm(null);
      setRequestContent('');
      refetchRequests();
    },
    onError: (error) => {
      alert(`Failed to submit request: ${error.message}`);
    },
  });

  const updateRequestMutation = trpc.scheduling.updateRequestStatus.useMutation({
    onSuccess: () => {
      alert('Request status updated!');
      refetchRequests();
    },
    onError: (error) => {
      alert(`Failed to update request: ${error.message}`);
    },
  });

  // Mock competition status (in production, fetch from database)
  const [scheduleStatus, setScheduleStatus] = useState<'draft' | 'finalized' | 'published'>('draft');

  // View mode switching
  const [viewMode, setViewMode] = useState<'cd' | 'studio' | 'judge' | 'public'>('cd');

  const handleFinalize = () => {
    if (confirm('Lock entry numbers? This will prevent automatic renumbering.')) {
      finalizeMutation.mutate({
        competitionId: TEST_COMPETITION_ID,
        tenantId: TEST_TENANT_ID,
        userId: '00000000-0000-0000-0000-000000000001', // Test user
      });
      setScheduleStatus('finalized');
    }
  };

  const handlePublish = () => {
    if (confirm('Publish schedule? This will reveal studio names and lock all changes.')) {
      publishMutation.mutate({
        competitionId: TEST_COMPETITION_ID,
        tenantId: TEST_TENANT_ID,
        userId: '00000000-0000-0000-0000-000000000001',
      });
      setScheduleStatus('published');
    }
  };

  const handleUnlock = () => {
    if (confirm('Unlock schedule? This will allow changes and enable auto-renumbering again.')) {
      unlockMutation.mutate({
        competitionId: TEST_COMPETITION_ID,
        tenantId: TEST_TENANT_ID,
      });
      setScheduleStatus('draft');
    }
  };

  const handleSubmitRequest = (routineId: string) => {
    if (!requestContent.trim()) {
      alert('Please enter a request message');
      return;
    }

    addRequestMutation.mutate({
      routineId,
      tenantId: TEST_TENANT_ID,
      content: requestContent,
      authorId: '00000000-0000-0000-0000-000000000001', // Test user
    });
  };

  const handleUpdateRequestStatus = (noteId: string, status: 'completed' | 'ignored') => {
    if (confirm(`Mark this request as ${status}?`)) {
      updateRequestMutation.mutate({ noteId, status });
    }
  };

  // Initialize routine zones from database on data load
  useEffect(() => {
    if (!routines) return;

    const initialZones: Record<string, ScheduleZone> = {};
    routines.forEach(routine => {
      // Use scheduleZone field to determine which zone the routine is in
      if (routine.scheduleZone) {
        initialZones[routine.id] = routine.scheduleZone as ScheduleZone;
      }
    });

    setRoutineZones(initialZones);
  }, [routines]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Schedule mutation
  const scheduleMutation = trpc.scheduling.scheduleRoutine.useMutation({
    onSuccess: () => {
      console.log('[Schedule] Mutation SUCCESS - refetching routines');
      // Refetch routines to get updated state from database
      refetch();
    },
    onError: (error) => {
      console.error('[Schedule] Mutation FAILED:', error);
      // Revert the optimistic update by refetching from database
      refetch();
      // TODO: Show error toast to user
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over) {
      const activeId = active.id as string;
      const targetZone = over.id as ScheduleZone;

      // Check if dragging a block
      if (activeId.startsWith('block-')) {
        const blockId = activeId.replace('block-', '');
        const block = scheduleBlocks.find(b => b.id === blockId);

        if (block) {
          // Create a new instance of the block in the target zone
          const newBlock: ScheduleBlock = {
            id: `${block.type}-${Date.now()}`,
            type: block.type,
            title: block.type === 'award' ? 'Award Ceremony' : 'Break',
            duration: block.duration,
            zone: targetZone,
          };

          setScheduleBlocks(prev => [...prev, newBlock]);

          console.log(`[Schedule] Block placed:`, { block: newBlock, zone: targetZone });
          alert(`${block.type === 'award' ? '🏆 Award' : '☕ Break'} block added to ${targetZone}`);
        }
      } else {
        // Dragging a routine
        console.log('[Schedule] Drag ended:', { routineId: activeId, targetZone });

        // Update local state immediately for responsive UI (optimistic update)
        setRoutineZones(prev => ({
          ...prev,
          [activeId]: targetZone,
        }));

        // Save to database
        console.log('[Schedule] Calling mutation...');
        scheduleMutation.mutate({
          routineId: activeId,
          tenantId: TEST_TENANT_ID,
          performanceTime: targetZone, // Zone ID (e.g., "saturday-am")
        });
      }
    }

    setActiveId(null);
  };

  // Get unique classifications from routines
  const classifications = routines
    ? Array.from(new Set(routines.map(r => ({ id: r.classificationId, name: r.classificationName }))))
        .filter((value, index, self) => self.findIndex(t => t.id === value.id) === index)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Get unique categories from routines
  const categories = routines
    ? Array.from(new Set(routines.map(r => ({ id: r.categoryId, name: r.categoryName }))))
        .filter((value, index, self) => self.findIndex(t => t.id === value.id) === index)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Group routines by zone
  const routinesByZone = (routines || []).reduce((acc, routine) => {
    const zone = routineZones[routine.id] || 'unscheduled';
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(routine);
    return acc;
  }, {} as Record<ScheduleZone, Routine[]>);

  const unscheduledRoutines = routinesByZone['unscheduled'] || [];
  const saturdayAM = routinesByZone['saturday-am'] || [];
  const saturdayPM = routinesByZone['saturday-pm'] || [];
  const sundayAM = routinesByZone['sunday-am'] || [];
  const sundayPM = routinesByZone['sunday-pm'] || [];

  // Group blocks by zone
  const blocksByZone = scheduleBlocks.reduce((acc, block) => {
    if (block.zone) {
      if (!acc[block.zone]) acc[block.zone] = [];
      acc[block.zone].push(block);
    }
    return acc;
  }, {} as Record<ScheduleZone, ScheduleBlock[]>);

  const saturdayAMBlocks = blocksByZone['saturday-am'] || [];
  const saturdayPMBlocks = blocksByZone['saturday-pm'] || [];
  const sundayAMBlocks = blocksByZone['sunday-am'] || [];
  const sundayPMBlocks = blocksByZone['sunday-pm'] || [];

  const activeRoutine = routines?.find(r => r.id === activeId);

  const scheduledCount = (saturdayAM.length + saturdayPM.length + sundayAM.length + sundayPM.length);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05);
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Manual Scheduling System
          </h1>
          <p className="text-purple-200">
            Drag routines from the pool to schedule blocks. Studio codes shown for anonymity.
          </p>
        </div>

        {/* View Mode Selector */}
        <div className="mb-4 bg-purple-800/50 backdrop-blur-sm rounded-xl border border-purple-600/30 p-4 shadow-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-purple-200">View Mode:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('cd')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'cd'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-900/50 text-purple-300 hover:bg-purple-700'
                }`}
              >
                👨‍💼 CD View
              </button>
              <button
                onClick={() => setViewMode('studio')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'studio'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-900/50 text-purple-300 hover:bg-purple-700'
                }`}
              >
                🎭 Studio Director View
              </button>
              <button
                onClick={() => setViewMode('judge')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'judge'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-900/50 text-purple-300 hover:bg-purple-700'
                }`}
              >
                👔 Judge View
              </button>
              <button
                onClick={() => setViewMode('public')}
                disabled={scheduleStatus !== 'published'}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'public'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-900/50 text-purple-300 hover:bg-purple-700'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                🌍 Public View {scheduleStatus !== 'published' && '(After Publish)'}
              </button>
            </div>
          </div>

          {/* View Mode Info */}
          <div className="mt-3 pt-3 border-t border-purple-600/30">
            <p className="text-xs text-purple-300">
              {viewMode === 'cd' && '👨‍💼 Full schedule • Studio codes + names • All notes visible'}
              {viewMode === 'studio' && '🎭 Only your routines • Full studio name • Your requests only'}
              {viewMode === 'judge' && '👔 Full schedule • Studio codes ONLY (anonymous) • No notes'}
              {viewMode === 'public' && '🌍 Full schedule • Full studio names revealed • Read-only'}
            </p>
          </div>
        </div>

        {/* State Machine Toolbar */}
        <div className="mb-6 bg-purple-800/50 backdrop-blur-sm rounded-xl border border-purple-600/30 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            {/* Status Badge */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-purple-200">Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold ${
                    scheduleStatus === 'draft'
                      ? 'bg-blue-500 text-white'
                      : scheduleStatus === 'finalized'
                      ? 'bg-orange-500 text-white'
                      : 'bg-green-500 text-white'
                  }`}
                >
                  {scheduleStatus === 'draft' && '📝 Draft'}
                  {scheduleStatus === 'finalized' && '🔒 Finalized'}
                  {scheduleStatus === 'published' && '✅ Published'}
                </span>
              </div>

              {/* Status Info */}
              <div className="text-xs text-purple-300">
                {scheduleStatus === 'draft' && 'Entry numbers auto-renumber on changes'}
                {scheduleStatus === 'finalized' && 'Entry numbers locked • Studios can view'}
                {scheduleStatus === 'published' && 'Studio names revealed • Schedule locked'}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* CD Requests Panel Button */}
              <button
                onClick={() => setShowRequestsPanel(!showRequestsPanel)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showRequestsPanel
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-700'
                }`}
              >
                📋 Studio Requests {studioRequests && studioRequests.length > 0 && `(${studioRequests.length})`}
              </button>

              {scheduleStatus === 'draft' && (
                <button
                  onClick={handleFinalize}
                  disabled={finalizeMutation.isPending}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {finalizeMutation.isPending ? 'Finalizing...' : '🔒 Finalize Schedule'}
                </button>
              )}

              {scheduleStatus === 'finalized' && (
                <>
                  <button
                    onClick={handleUnlock}
                    disabled={unlockMutation.isPending}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {unlockMutation.isPending ? 'Unlocking...' : '🔓 Unlock'}
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishMutation.isPending}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {publishMutation.isPending ? 'Publishing...' : '✅ Publish Schedule'}
                  </button>
                </>
              )}

              {scheduleStatus === 'published' && (
                <div className="text-sm text-green-300 font-medium">
                  Schedule is live • No changes allowed
                </div>
              )}
            </div>
          </div>

          {/* Conflict Summary in Toolbar */}
          {conflictsData && conflictsData.summary.total > 0 && (
            <div className="mt-3 pt-3 border-t border-purple-600/30">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-400 font-medium">⚠️ Conflicts Detected:</span>
                <span className="text-white">
                  {conflictsData.summary.critical} Critical • {conflictsData.summary.errors} Errors • {conflictsData.summary.warnings} Warnings
                </span>
                {scheduleStatus === 'draft' && (
                  <span className="text-yellow-300 ml-2">
                    (Resolve critical conflicts before finalizing)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CD Requests Management Panel (Collapsible) */}
        {showRequestsPanel && (
          <div className="mb-6 bg-indigo-900/30 backdrop-blur-sm rounded-xl border border-indigo-500/30 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Studio Scheduling Requests</h2>
              <button
                onClick={() => setShowRequestsPanel(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {studioRequests && studioRequests.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {studioRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className={`border-2 rounded-lg p-4 ${
                      request.status === 'pending'
                        ? 'border-indigo-500/50 bg-indigo-900/30'
                        : request.status === 'completed'
                        ? 'border-green-500/50 bg-green-900/30'
                        : 'border-gray-500/50 bg-gray-900/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-white text-sm mb-1">
                          {request.routine?.title || 'Routine'}
                        </div>
                        <div className="text-xs text-gray-300">
                          Studio: {request.routine?.studioName || 'Unknown'}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          request.status === 'pending'
                            ? 'bg-yellow-500 text-black'
                            : request.status === 'completed'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-500 text-white'
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <div className="text-sm text-white/90 mb-3">{request.content}</div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateRequestStatus(request.id, 'completed')}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                        >
                          ✓ Mark Complete
                        </button>
                        <button
                          onClick={() => handleUpdateRequestStatus(request.id, 'ignored')}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                        >
                          ✕ Ignore
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">📋</div>
                <p className="text-indigo-200 text-sm">No studio requests yet</p>
              </div>
            )}
          </div>
        )}

        {/* Hotel Attrition Warning */}
        {(() => {
          // Check if all Emerald routines are on one day
          const emeraldRoutines = (routines || []).filter(r =>
            r.classificationName.toLowerCase().includes('emerald')
          );
          const emeraldSaturday = emeraldRoutines.filter(r =>
            routineZones[r.id]?.startsWith('saturday')
          );
          const emeraldSunday = emeraldRoutines.filter(r =>
            routineZones[r.id]?.startsWith('sunday')
          );

          const showWarning = emeraldRoutines.length > 0 && (
            emeraldSaturday.length === emeraldRoutines.length ||
            emeraldSunday.length === emeraldRoutines.length
          );

          if (!showWarning) return null;

          const day = emeraldSaturday.length === emeraldRoutines.length ? 'Saturday' : 'Sunday';

          return (
            <div className="mb-6 bg-red-900/30 backdrop-blur-sm rounded-xl border border-red-500/50 p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">🚨</span>
                <div>
                  <h3 className="font-bold text-red-300 text-lg mb-1">Hotel Attrition Warning</h3>
                  <p className="text-red-200 text-sm">
                    All {emeraldRoutines.length} Emerald routines are scheduled on {day} only.
                    This may cause hotel attrition issues. Consider spreading routines across both days.
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Main 3-Panel Layout */}
        <div className="grid grid-cols-12 gap-6">

          {/* LEFT PANEL: Unscheduled Routines Pool */}
          <div className="col-span-4 space-y-6">
            {/* Filter Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <h2 className="text-lg font-bold text-white mb-4">Filters</h2>

              {/* Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Search Routine
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300 pointer-events-none">
                    🔍
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title..."
                    className="w-full pl-10 pr-10 py-2 border border-purple-500/50 rounded-lg bg-purple-900/50 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Classification Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Classification
                </label>
                <div className="relative">
                  <select
                    value={selectedClassification}
                    onChange={(e) => setSelectedClassification(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-white/20 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent hover:bg-white/15 hover:border-white/30 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-gray-800">All Classifications</option>
                    {classifications.map(c => (
                      <option key={c.id} value={c.id} className="bg-gray-800">{c.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/60">
                    ▼
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Genre
                </label>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-white/20 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent hover:bg-white/15 hover:border-white/30 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-gray-800">All Genres</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id} className="bg-gray-800">{c.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/60">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Unscheduled Routines List */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  Unscheduled Routines
                </h2>
                <span className="text-sm font-medium text-white bg-purple-600 px-3 py-1 rounded-full">
                  {unscheduledRoutines.length}
                </span>
              </div>

              {/* Loading State - Skeleton Loaders */}
              {isLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white/10 border border-white/20 rounded-xl p-4 animate-pulse">
                      <div className="flex items-start justify-between mb-2">
                        <div className="h-5 bg-white/20 rounded w-3/4"></div>
                        <div className="h-6 w-8 bg-white/20 rounded"></div>
                      </div>
                      <div className="h-8 bg-white/15 rounded-lg w-2/3 mb-2"></div>
                      <div className="h-4 bg-white/10 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
                  <p className="text-red-200 font-medium">Error loading routines</p>
                  <p className="text-red-300 text-sm mt-1">{error.message}</p>
                </div>
              )}

              {/* Routines List */}
              {unscheduledRoutines.length > 0 && (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {unscheduledRoutines.map((routine) => (
                    <DraggableRoutineCard key={routine.id} routine={routine} viewMode={viewMode} onRequestClick={(id) => setShowRequestForm(id)} isAnyDragging={activeId !== null} />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {routines && unscheduledRoutines.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-purple-200 font-medium">All routines scheduled!</p>
                </div>
              )}
            </div>

            {/* Schedule Blocks */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)] mt-6">
              <h2 className="text-lg font-bold text-white mb-4">Schedule Blocks</h2>
              <p className="text-xs text-purple-300 mb-4">Drag these blocks into the schedule</p>

              {scheduleBlocks.filter(b => b.zone === null).map(block => (
                <DraggableBlock key={block.id} block={block} />
              ))}
            </div>
          </div>

          {/* MIDDLE PANEL: Schedule Builder */}
          <div className="col-span-5">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <h2 className="text-lg font-bold text-white mb-4">Schedule Timeline</h2>

              <div className="space-y-4">
                {/* Saturday */}
                <div className="bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-white/10">
                    <span className="text-3xl">📅</span>
                    <h3 className="text-xl font-bold text-white">Saturday</h3>
                    <span className="text-sm text-white/70 ml-auto">April 10, 2025</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <DropZone id="saturday-am" label="Morning" routines={saturdayAM} blocks={saturdayAMBlocks} viewMode={viewMode} onRequestClick={(id) => setShowRequestForm(id)} isAnyDragging={activeId !== null} />
                    <DropZone id="saturday-pm" label="Afternoon" routines={saturdayPM} blocks={saturdayPMBlocks} viewMode={viewMode} onRequestClick={(id) => setShowRequestForm(id)} isAnyDragging={activeId !== null} />
                  </div>
                </div>

                {/* Sunday */}
                <div className="bg-gradient-to-br from-blue-500/15 to-indigo-500/15 border border-blue-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-white/10">
                    <span className="text-3xl">☀️</span>
                    <h3 className="text-xl font-bold text-white">Sunday</h3>
                    <span className="text-sm text-white/70 ml-auto">April 11, 2025</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <DropZone id="sunday-am" label="Morning" routines={sundayAM} blocks={sundayAMBlocks} viewMode={viewMode} onRequestClick={(id) => setShowRequestForm(id)} isAnyDragging={activeId !== null} />
                    <DropZone id="sunday-pm" label="Afternoon" routines={sundayPM} blocks={sundayPMBlocks} viewMode={viewMode} onRequestClick={(id) => setShowRequestForm(id)} isAnyDragging={activeId !== null} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Trophy Helper */}
          <div className="col-span-3 space-y-6">
            {/* Trophy Helper Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏆</span>
                <h2 className="text-lg font-bold text-white">Trophy Helper</h2>
              </div>

              {trophyHelper && Array.isArray(trophyHelper) && trophyHelper.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {trophyHelper.map((entry, index) => (
                    <div
                      key={entry.overallCategory}
                      className="border-2 border-yellow-500/30 bg-yellow-900/20 rounded-lg p-3"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-yellow-400 text-xl flex-shrink-0">🏆</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white mb-1 truncate">
                            {entry.categoryDisplay}
                          </div>
                          <div className="text-xs text-yellow-200 space-y-1">
                            <div>Last: #{entry.lastRoutineNumber || '?'} "{entry.lastRoutineTitle}"</div>
                            <div>Zone: {entry.lastRoutineZone}</div>
                            <div className="text-yellow-300 font-medium">
                              {entry.totalRoutinesInCategory} routine{entry.totalRoutinesInCategory !== 1 ? 's' : ''}
                            </div>
                            <div className="text-xs text-yellow-400 mt-2">
                              💡 Suggested award: {entry.suggestedAwardTime
                                ? new Date(entry.suggestedAwardTime).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })
                                : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">🏆</div>
                  <p className="text-purple-200 text-sm">
                    Schedule routines to see award recommendations
                  </p>
                </div>
              )}
            </div>

            {/* Conflicts Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <h2 className="text-lg font-bold text-white mb-4">
                Conflicts
                {conflictsData && conflictsData.summary.total > 0 && (
                  <span className="ml-2 text-sm font-medium bg-red-600 text-white px-2 py-1 rounded-full">
                    {conflictsData.summary.total}
                  </span>
                )}
              </h2>

              {conflictsData && conflictsData.conflicts.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {conflictsData.conflicts.map((conflict, index) => (
                    <div
                      key={index}
                      className={`border-2 rounded-lg p-3 ${
                        conflict.severity === 'critical'
                          ? 'border-red-500/50 bg-red-900/30'
                          : conflict.severity === 'error'
                          ? 'border-orange-500/50 bg-orange-900/30'
                          : 'border-yellow-500/50 bg-yellow-900/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xl flex-shrink-0">⚠️</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white mb-1">
                            {conflict.dancerName}
                          </div>
                          <div className="text-xs text-gray-200">
                            {conflict.message}
                          </div>
                          <div className="text-xs text-gray-300 mt-2 space-y-1">
                            <div>#{conflict.routine1Number} "{conflict.routine1Title}"</div>
                            <div>#{conflict.routine2Number} "{conflict.routine2Title}"</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">✅</div>
                  <p className="text-purple-200 text-sm">No conflicts detected</p>
                </div>
              )}
            </div>

            {/* Stats Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <h2 className="text-lg font-bold text-white mb-4">Statistics</h2>
              <div className="space-y-3">
                {/* Unscheduled - Warning State */}
                <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                  <div className="text-3xl flex-shrink-0">⚠️</div>
                  <div className="flex-1">
                    <div className="text-xs text-amber-200/70 uppercase tracking-wide mb-1">Unscheduled</div>
                    <div className="text-3xl font-bold text-amber-300">{unscheduledRoutines.length}</div>
                    <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${routines?.length ? (unscheduledRoutines.length / routines.length) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Scheduled - Success State */}
                <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                  <div className="text-3xl flex-shrink-0">✅</div>
                  <div className="flex-1">
                    <div className="text-xs text-emerald-200/70 uppercase tracking-wide mb-1">Scheduled</div>
                    <div className="text-3xl font-bold text-emerald-300">{scheduledCount}</div>
                    <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${routines?.length ? (scheduledCount / routines.length) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Total - Info State */}
                <div className="bg-blue-500/15 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
                  <div className="text-3xl flex-shrink-0">📊</div>
                  <div className="flex-1">
                    <div className="text-xs text-blue-200/70 uppercase tracking-wide mb-1">Total</div>
                    <div className="text-3xl font-bold text-blue-300">{routines?.length || 0}</div>
                  </div>
                </div>

                {/* Overall Progress */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/80">Overall Progress</span>
                    <span className="font-semibold text-amber-300">
                      {routines?.length ? Math.round((scheduledCount / routines.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${routines?.length ? (scheduledCount / routines.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <h2 className="text-lg font-bold text-white mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  className="w-full px-4 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:translate-y-[-2px] flex items-center justify-center gap-2"
                >
                  <span>💾</span>
                  <span>Save Schedule</span>
                </button>
                <button
                  className="w-full px-4 py-3 rounded-lg font-semibold text-white border-2 border-white/30 hover:border-white/50 hover:bg-white/10 transition-all duration-300 hover:translate-y-[-2px] flex items-center justify-center gap-2"
                >
                  <span>📥</span>
                  <span>Export Schedule</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Studio Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl border border-purple-500/50 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Submit Scheduling Request</h3>
            <p className="text-purple-200 text-sm mb-4">
              Add a note or request for the Competition Director regarding this routine's scheduling.
            </p>
            <textarea
              value={requestContent}
              onChange={(e) => setRequestContent(e.target.value)}
              placeholder="Enter your request or note..."
              className="w-full px-4 py-3 bg-purple-950/50 border border-purple-500/50 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none h-32"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleSubmitRequest(showRequestForm)}
                disabled={addRequestMutation.isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {addRequestMutation.isPending ? 'Submitting...' : '📝 Submit Request'}
              </button>
              <button
                onClick={() => {
                  setShowRequestForm(null);
                  setRequestContent('');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeRoutine && (
          <div className="border-2 border-purple-400 rounded-lg p-4 bg-purple-800/90 backdrop-blur-sm shadow-xl">
            <div className="font-bold text-white mb-1">{activeRoutine.title}</div>
            <div className="text-sm text-purple-200">
              <div>Studio: <span className="font-medium text-purple-300">{activeRoutine.studioCode}</span></div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
