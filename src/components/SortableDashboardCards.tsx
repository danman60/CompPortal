'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import Tooltip from './Tooltip';

export interface DashboardCard {
  id: string;
  href: string;
  icon: string;
  title: string;
  description: string;
  tooltip?: string;
}

interface SortableCardProps {
  card: DashboardCard;
  isActiveCard: boolean;
}

function SortableCard({ card, isActiveCard }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Prevent navigation if this card was just being dragged
    if (isActiveCard) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  const content = (
    <Link
      href={card.href}
      onClick={handleClick}
      className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-200 block animate-fade-in h-32 ${
        isActiveCard ? 'pointer-events-none' : ''
      }`}
    >
      <div className="flex items-center gap-4 h-full">
        {/* Large visible drag handle on the LEFT */}
        <div
          {...listeners}
          className="text-gray-300 hover:text-white cursor-grab active:cursor-grabbing p-3 -ml-2 touch-none flex-shrink-0"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
        <div className="text-4xl inline-block hover:scale-110 transition-transform flex-shrink-0">{card.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-white truncate">{card.title}</h3>
          <p className="text-gray-400 text-sm line-clamp-2">{card.description}</p>
        </div>
      </div>
    </Link>
  );

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative">
      {card.tooltip ? (
        <Tooltip text={card.tooltip} position="top">{content}</Tooltip>
      ) : (
        content
      )}
    </div>
  );
}

interface SortableDashboardCardsProps {
  cards: DashboardCard[];
}

export default function SortableDashboardCards({ cards: initialCards }: SortableDashboardCardsProps) {
  const [cards, setCards] = useState(initialCards);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('dashboardHelpSeen');
  });
  const utils = trpc.useUtils();

  // Load saved layout
  const { data: savedLayout } = trpc.user.getDashboardLayout.useQuery();

  // Save layout mutation
  const saveLayoutMutation = trpc.user.saveDashboardLayout.useMutation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms press before drag starts (prevents accidental drags)
        tolerance: 5, // 5px tolerance for movement during delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Apply saved layout on load
  useEffect(() => {
    if (savedLayout && Array.isArray(savedLayout)) {
      // Reorder cards based on saved layout
      const layoutMap = new Map(savedLayout.map((id, index) => [id, index]));
      const sortedCards = [...initialCards].sort((a, b) => {
        const aIndex = layoutMap.get(a.id) ?? 999;
        const bIndex = layoutMap.get(b.id) ?? 999;
        return aIndex - bIndex;
      });
      setCards(sortedCards);
    }
  }, [savedLayout, initialCards]);

  // Auto-hide first-visit help
  useEffect(() => {
    if (!showHelp) return;
    const t = setTimeout(() => {
      setShowHelp(false);
      try { localStorage.setItem('dashboardHelpSeen', 'true'); } catch {}
    }, 5000);
    return () => clearTimeout(t);
  }, [showHelp]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Clear active ID after a delay to prevent navigation
    setTimeout(() => setActiveId(null), 400);

    if (!over || active.id === over.id) {
      return;
    }

    setCards((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newOrder = arrayMove(items, oldIndex, newIndex);

      // Save layout to database
      const layoutIds = newOrder.map((card) => card.id);
      saveLayoutMutation.mutate({ layout: layoutIds });

      return newOrder;
    });
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const resetOrder = () => {
    const defaultOrder = [...initialCards];
    setCards(defaultOrder);
    try { localStorage.removeItem('dashboardCardOrder'); } catch {}
    const layoutIds = defaultOrder.map((c) => c.id);
    saveLayoutMutation.mutate({ layout: layoutIds });
    toast.success('Dashboard order reset to default', { position: 'top-right' });
  };

  return (
    <div>
      {/* First-visit tip */}
      {showHelp && (
        <div className="bg-purple-500/20 border border-purple-400/30 rounded-lg p-4 mb-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="text-purple-200">
              <p className="font-medium">Tip: Customize Your Dashboard</p>
              <p className="text-purple-300/80 text-sm mt-1">
                Drag and drop the cards below to rearrange them. Your layout saves automatically.
              </p>
              <button
                onClick={() => { setShowHelp(false); try { localStorage.setItem('dashboardHelpSeen', 'true'); } catch {} }}
                className="text-purple-300 text-sm mt-2 hover:underline"
              >
                Got it, don’t show again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
        <button onClick={resetOrder} className="text-sm text-gray-400 hover:text-white transition-colors">
          ↺ Reset Order
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={cards} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <SortableCard key={card.id} card={card} isActiveCard={activeId === card.id} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
