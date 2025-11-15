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

function DraggableRoutineCard({ routine, inZone }: { routine: Routine; inZone?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: routine.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        border-2 rounded-lg p-4 cursor-grab transition-all
        ${isDragging ? 'opacity-50' : ''}
        ${inZone ? 'border-green-400 bg-green-900/30' : 'border-purple-400/50 bg-purple-900/30 hover:border-purple-400'}
      `}
    >
      <div className="font-bold text-white mb-1">{routine.title}</div>
      <div className="text-sm text-purple-200 space-y-0.5">
        <div>Studio: <span className="font-medium text-purple-300">{routine.studioCode}</span></div>
        <div>{routine.classificationName} • {routine.categoryName}</div>
        <div>{routine.ageGroupName} • {routine.entrySizeName}</div>
        <div>Duration: {routine.duration} min</div>
      </div>
    </div>
  );
}

function DropZone({ id, label, routines, blocks }: { id: ScheduleZone; label: string; routines: Routine[]; blocks: ScheduleBlock[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
        border-2 rounded-lg p-4 min-h-[200px] transition-colors
        ${isOver ? 'border-purple-400 bg-purple-700/30' : 'border-purple-500/30 bg-purple-900/20'}
      `}
    >
      <h3 className="font-bold text-white mb-3">{label}</h3>
      <div className="space-y-2">
        {routines.length === 0 && blocks.length === 0 && (
          <p className="text-purple-300 text-sm text-center py-8">
            Drop routines or blocks here
          </p>
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
          <DraggableRoutineCard key={routine.id} routine={routine} inZone />
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
  const { data: conflictsData } = trpc.scheduling.detectConflicts.useQuery({
    competitionId: TEST_COMPETITION_ID,
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

  // Mock competition status (in production, fetch from database)
  const [scheduleStatus, setScheduleStatus] = useState<'draft' | 'finalized' | 'published'>('draft');

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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Manual Scheduling System
          </h1>
          <p className="text-purple-200">
            Drag routines from the pool to schedule blocks. Studio codes shown for anonymity.
          </p>
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

        {/* Main 3-Panel Layout */}
        <div className="grid grid-cols-12 gap-6">

          {/* LEFT PANEL: Unscheduled Routines Pool */}
          <div className="col-span-4 space-y-6">
            {/* Filter Panel */}
            <div className="bg-purple-800/50 backdrop-blur-sm rounded-xl border border-purple-600/30 p-6 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-4">Filters</h2>

              {/* Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Search Routine
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title..."
                  className="w-full px-4 py-2 border border-purple-500/50 rounded-lg bg-purple-900/50 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>

              {/* Classification Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Classification
                </label>
                <select
                  value={selectedClassification}
                  onChange={(e) => setSelectedClassification(e.target.value)}
                  className="w-full px-4 py-2 border border-purple-500/50 rounded-lg bg-purple-900/50 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                >
                  <option value="">All Classifications</option>
                  {classifications.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Genre
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-purple-500/50 rounded-lg bg-purple-900/50 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                >
                  <option value="">All Genres</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Unscheduled Routines List */}
            <div className="bg-purple-800/50 backdrop-blur-sm rounded-xl border border-purple-600/30 p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  Unscheduled Routines
                </h2>
                <span className="text-sm font-medium text-white bg-purple-600 px-3 py-1 rounded-full">
                  {unscheduledRoutines.length}
                </span>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-purple-200"></div>
                  <p className="mt-3 text-purple-200">Loading routines...</p>
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
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {unscheduledRoutines.map((routine) => (
                    <DraggableRoutineCard key={routine.id} routine={routine} />
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
            <div className="bg-purple-800/50 backdrop-blur-sm rounded-xl border border-purple-600/30 p-6 shadow-lg mt-6">
              <h2 className="text-lg font-bold text-white mb-4">Schedule Blocks</h2>
              <p className="text-xs text-purple-300 mb-4">Drag these blocks into the schedule</p>

              {scheduleBlocks.filter(b => b.zone === null).map(block => (
                <DraggableBlock key={block.id} block={block} />
              ))}
            </div>
          </div>

          {/* MIDDLE PANEL: Schedule Builder */}
          <div className="col-span-5">
            <div className="bg-purple-800/50 backdrop-blur-sm rounded-xl border border-purple-600/30 p-6 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-4">Schedule Timeline</h2>

              <div className="space-y-4">
                {/* Saturday */}
                <div>
                  <h3 className="text-md font-bold text-white mb-2">Saturday</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <DropZone id="saturday-am" label="Morning" routines={saturdayAM} blocks={saturdayAMBlocks} />
                    <DropZone id="saturday-pm" label="Afternoon" routines={saturdayPM} blocks={saturdayPMBlocks} />
                  </div>
                </div>

                {/* Sunday */}
                <div>
                  <h3 className="text-md font-bold text-white mb-2">Sunday</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <DropZone id="sunday-am" label="Morning" routines={sundayAM} blocks={sundayAMBlocks} />
                    <DropZone id="sunday-pm" label="Afternoon" routines={sundayPM} blocks={sundayPMBlocks} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Trophy Helper */}
          <div className="col-span-3 space-y-6">
            {/* Trophy Helper Panel */}
            <div className="bg-purple-800/50 backdrop-blur-sm rounded-xl border border-purple-600/30 p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏆</span>
                <h2 className="text-lg font-bold text-white">Trophy Helper</h2>
              </div>

              {trophyHelper && Array.isArray(trophyHelper) && trophyHelper.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
            <div className="bg-purple-800/50 backdrop-blur-sm rounded-xl border border-purple-600/30 p-6 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-4">
                Conflicts
                {conflictsData && conflictsData.summary.total > 0 && (
                  <span className="ml-2 text-sm font-medium bg-red-600 text-white px-2 py-1 rounded-full">
                    {conflictsData.summary.total}
                  </span>
                )}
              </h2>

              {conflictsData && conflictsData.conflicts.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
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
            <div className="bg-purple-800/50 backdrop-blur-sm rounded-xl border border-purple-600/30 p-6 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-4">Statistics</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-white">
                  <span className="text-purple-200">Unscheduled:</span>
                  <span className="font-bold">{unscheduledRoutines.length}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span className="text-purple-200">Scheduled:</span>
                  <span className="font-bold">{scheduledCount}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span className="text-purple-200">Total:</span>
                  <span className="font-bold">{routines?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="bg-purple-800/50 backdrop-blur-sm rounded-xl border border-purple-600/30 p-6 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  className="w-full px-4 py-3 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-md"
                >
                  Save Schedule
                </button>
                <button
                  className="w-full px-4 py-3 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-md"
                >
                  Export Schedule
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

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
