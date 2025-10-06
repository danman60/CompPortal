'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';

interface DancerAssignmentPanelProps {
  studioId: string;
}

// Droppable Routine Card Component
function DroppableRoutineCard({ entry, isSelected, onSelect, onRemoveParticipant }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: entry.id,
  });

  const participantCount = entry.entry_participants?.length || 0;

  return (
    <div
      ref={setNodeRef}
      onClick={() => onSelect(entry.id)}
      className={`bg-white/5 hover:bg-white/10 border rounded-lg p-4 transition-all cursor-pointer ${
        isSelected
          ? 'ring-2 ring-purple-400 border-purple-400'
          : isOver
          ? 'ring-2 ring-blue-400 border-blue-400 bg-blue-500/10'
          : 'border-white/10'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="text-white font-semibold text-lg">{entry.title}</h4>
          <div className="text-gray-400 text-sm mt-1">
            {entry.dance_categories?.name} · {entry.age_groups?.name}
          </div>
        </div>
        <div className="bg-purple-500/20 border border-purple-400/30 rounded-full px-3 py-1">
          <span className="text-purple-300 text-sm font-semibold">
            {participantCount} {participantCount === 1 ? 'dancer' : 'dancers'}
          </span>
        </div>
      </div>

      {/* Assigned Dancers */}
      {participantCount > 0 && (
        <div className="space-y-2 pt-3 border-t border-white/10">
          {entry.entry_participants.map((participant: any) => (
            <div
              key={participant.id}
              className="flex justify-between items-center bg-white/5 rounded-lg p-2"
            >
              <span className="text-white text-sm">
                👤 {participant.dancer_name}
                {participant.dancer_age && (
                  <span className="text-gray-400 ml-2">({participant.dancer_age})</span>
                )}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveParticipant(participant.id);
                }}
                className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-xs font-semibold transition-all"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {isSelected && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-blue-400 text-sm font-semibold">
            ✓ Selected - Drag dancers here or click to assign →
          </div>
        </div>
      )}

      {isOver && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-blue-400 text-sm font-semibold animate-pulse">
            ↓ Drop dancer here
          </div>
        </div>
      )}
    </div>
  );
}

// Draggable Dancer Card Component
function DraggableDancerCard({ dancer, age, isAssigned, isAssigning, onQuickAssign }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dancer.id,
    disabled: isAssigned || isAssigning,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex justify-between items-center border rounded-lg p-3 transition-all duration-300 ${
        isDragging
          ? 'opacity-50 cursor-grabbing'
          : isAssigning
          ? 'bg-blue-500/20 border-blue-400/50 scale-95 opacity-75'
          : isAssigned
          ? 'bg-green-500/10 border-green-400/30 cursor-not-allowed'
          : 'bg-white/5 hover:bg-white/10 border-white/10 cursor-grab active:cursor-grabbing'
      }`}
      onClick={() => !isAssigned && !isDragging && !isAssigning && onQuickAssign(dancer.id)}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">
          {isAssigning ? '⏳' : isAssigned ? '✅' : '👤'}
        </div>
        <div>
          <div className="text-white font-semibold">
            {dancer.first_name} {dancer.last_name}
          </div>
          <div className="text-gray-400 text-sm">
            {age !== undefined && `Age ${age}`}
            {dancer.skill_level && (age !== undefined ? ' · ' : '') + dancer.skill_level}
          </div>
        </div>
      </div>
      <div className={`text-sm font-semibold ${isAssigning ? 'text-blue-400 animate-pulse' : isAssigned ? 'text-green-400' : 'text-blue-400'}`}>
        {isAssigning ? 'Assigning...' : isAssigned ? 'Assigned ✓' : isDragging ? 'Dragging...' : 'Drag or click'}
      </div>
    </div>
  );
}

export default function DancerAssignmentPanel({ studioId }: DancerAssignmentPanelProps) {
  const utils = trpc.useUtils();
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [draggedDancer, setDraggedDancer] = useState<any | null>(null);
  const [assigningDancerId, setAssigningDancerId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Fetch entries for this studio
  const { data: entriesData, isLoading: entriesLoading } = trpc.entry.getByStudio.useQuery({
    studioId,
  });

  // Fetch dancers for this studio
  const { data: dancersData, isLoading: dancersLoading } = trpc.dancer.getAll.useQuery({
    studioId,
    search: search || undefined,
  });

  // Add participant mutation
  const addParticipantMutation = trpc.entry.addParticipant.useMutation({
    onSuccess: () => {
      utils.entry.getByStudio.invalidate();
      // Clear assigning state after brief delay to show success
      setTimeout(() => setAssigningDancerId(null), 600);
    },
    onError: (error) => {
      alert(`Failed to assign dancer: ${error.message}`);
      setAssigningDancerId(null);
    },
  });

  // Remove participant mutation
  const removeParticipantMutation = trpc.entry.removeParticipant.useMutation({
    onSuccess: () => {
      utils.entry.getByStudio.invalidate();
    },
    onError: (error) => {
      alert(`Failed to remove dancer: ${error.message}`);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const dancer = dancersData?.dancers.find(d => d.id === event.active.id);
    setDraggedDancer(dancer);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedDancer(null);

    if (!over) return;

    const dancerId = active.id as string;
    const entryId = over.id as string;

    // Find the dancer
    const dancer = dancersData?.dancers.find(d => d.id === dancerId);
    if (!dancer) return;

    // Calculate age from date_of_birth if available
    let dancer_age: number | undefined;
    if (dancer.date_of_birth) {
      const today = new Date();
      const birthDate = new Date(dancer.date_of_birth);
      dancer_age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        dancer_age--;
      }
    }

    // Set assigning state before mutation for visual feedback
    setAssigningDancerId(dancerId);

    // Add participant
    addParticipantMutation.mutate({
      entryId,
      participant: {
        dancer_id: dancerId,
        dancer_name: `${dancer.first_name} ${dancer.last_name}`,
        dancer_age,
      },
    });
  };

  const handleRemoveParticipant = (participantId: string) => {
    // Instant removal - no confirmation dialog (per UX requirement)
    removeParticipantMutation.mutate({ participantId });
  };

  const handleQuickAssign = (dancerId: string) => {
    if (!selectedEntry) {
      alert('Please select a routine first by clicking on it.');
      return;
    }

    // Check if dancer is already assigned to this routine
    const entry = entries.find(e => e.id === selectedEntry);
    const alreadyAssigned = entry?.entry_participants?.some(
      (p: any) => p.dancer_id === dancerId
    );

    if (alreadyAssigned) {
      alert('This dancer is already assigned to this routine.');
      return;
    }

    const dancer = dancersData?.dancers.find(d => d.id === dancerId);
    if (!dancer) return;

    // Calculate age
    let dancer_age: number | undefined;
    if (dancer.date_of_birth) {
      const today = new Date();
      const birthDate = new Date(dancer.date_of_birth);
      dancer_age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        dancer_age--;
      }
    }

    // Set assigning state before mutation for visual feedback
    setAssigningDancerId(dancerId);

    addParticipantMutation.mutate({
      entryId: selectedEntry,
      participant: {
        dancer_id: dancerId,
        dancer_name: `${dancer.first_name} ${dancer.last_name}`,
        dancer_age,
      },
    });
  };

  if (entriesLoading || dancersLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
          <div className="h-8 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/20 rounded"></div>
            ))}
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 animate-pulse">
          <div className="h-8 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const entries = entriesData?.entries || [];
  const dancers = dancersData?.dancers || [];

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Routines */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="bg-white/5 border-b border-white/20 p-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>🎭</span>
              My Routines
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Click a routine to select it, then click dancers to assign
            </p>
          </div>

          <div className="p-6 space-y-3 max-h-[600px] overflow-y-auto">
            {entries.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p>No routines found</p>
              </div>
            ) : (
              entries.map((entry: any) => (
                <DroppableRoutineCard
                  key={entry.id}
                  entry={entry}
                  isSelected={selectedEntry === entry.id}
                  onSelect={setSelectedEntry}
                  onRemoveParticipant={handleRemoveParticipant}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Dancers */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="bg-white/5 border-b border-white/20 p-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2 mb-4">
              <span>👥</span>
              My Dancers
            </h3>

            {/* Search */}
            <input
              type="text"
              placeholder="Search dancers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="p-6 space-y-2 max-h-[600px] overflow-y-auto">
            {dancers.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p>No dancers found</p>
              </div>
            ) : (
              dancers.map((dancer: any) => {
                // Calculate age
                let age: number | undefined;
                if (dancer.date_of_birth) {
                  const today = new Date();
                  const birthDate = new Date(dancer.date_of_birth);
                  age = today.getFullYear() - birthDate.getFullYear();
                  const monthDiff = today.getMonth() - birthDate.getMonth();
                  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                  }
                }

                // Check if dancer is assigned to selected routine
                const entry = entries.find(e => e.id === selectedEntry);
                const isAssigned = entry?.entry_participants?.some(
                  (p: any) => p.dancer_id === dancer.id
                );

                return (
                  <DraggableDancerCard
                    key={dancer.id}
                    dancer={dancer}
                    age={age}
                    isAssigned={isAssigned}
                    isAssigning={assigningDancerId === dancer.id}
                    onQuickAssign={handleQuickAssign}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {draggedDancer && (
          <div className="bg-purple-500 text-white px-4 py-2 rounded-lg shadow-lg">
            👤 {draggedDancer.first_name} {draggedDancer.last_name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
