'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StudioDirectorStats from './StudioDirectorStats';
import QuickStatsWidget from './QuickStatsWidget';
import { trpc } from '@/lib/trpc';
import SortableDashboardCards, { DashboardCard } from './SortableDashboardCards';
import MotivationalQuote from './MotivationalQuote';
import BalletLoadingAnimation from './BalletLoadingAnimation';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

interface StudioDirectorDashboardProps {
  userEmail: string;
  firstName: string;
  studioName?: string;
  studioStatus?: string | null;
}

const STUDIO_DIRECTOR_CARDS: DashboardCard[] = [
  {
    id: 'invoices',
    href: '/dashboard/invoices',
    icon: '🧾',
    title: 'My Invoices',
    description: 'View studio billing',
    tooltip: 'View and pay invoices',
  },
];

export default function StudioDirectorDashboard({ userEmail, firstName, studioName, studioStatus }: StudioDirectorDashboardProps) {
  const [showLoading, setShowLoading] = useState(true);
  const [greeting, setGreeting] = useState('Hello');
  const { data: myDancers } = trpc.dancer.getAll.useQuery();
  const { data: myEntries } = trpc.entry.getAll.useQuery();
  const { data: myReservations } = trpc.reservation.getAll.useQuery();

  // Set greeting on client mount to prevent hydration mismatch
  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  // Get studio ID for invoice query
  const { data: userStudio } = trpc.studio.getAll.useQuery();
  const studioId = userStudio?.studios?.[0]?.id;

  const { data: myInvoices } = trpc.invoice.getByStudio.useQuery(
    { studioId: studioId! },
    { enabled: !!studioId }
  );

  // Calculate routines left to create
  const approvedReservationSpaces = myReservations?.reservations
    ?.filter(r => r.status === 'approved')
    ?.reduce((total, r) => total + (r.spaces_requested || 0), 0) || 0;
  const createdRoutines = myEntries?.entries?.length || 0;
  const routinesLeftToCreate = Math.max(0, approvedReservationSpaces - createdRoutines);

  // Calculate unpaid invoices (all invoices are unpaid by default - payment tracking is per reservation)
  const unpaidInvoices = myInvoices?.invoices?.length || 0;

  // Determine next action for user
  const getNextAction = () => {
    const totalDancers = myDancers?.dancers?.length || 0;
    const approvedReservations = myReservations?.reservations?.filter(r => r.status === 'approved').length || 0;

    if (totalDancers === 0) {
      return {
        icon: '💃',
        label: 'Next Action for You',
        value: 'Create Dancers',
        color: 'text-purple-300',
        href: '/dashboard/dancers',
        tooltip: 'Start by adding your dancers'
      };
    }

    if (approvedReservations === 0) {
      return {
        icon: '📋',
        label: 'Next Action for You',
        value: 'Create Reservation',
        color: 'text-green-300',
        href: '/dashboard/reservations',
        tooltip: 'Reserve routine slots for a competition'
      };
    }

    if (routinesLeftToCreate > 0) {
      return {
        icon: '🎭',
        label: 'Next Action for You',
        value: 'Finish Creating Routines',
        color: 'text-blue-300',
        href: '/dashboard/entries',
        tooltip: `${routinesLeftToCreate} routine${routinesLeftToCreate !== 1 ? 's' : ''} left to create`
      };
    }

    if (unpaidInvoices > 0) {
      return {
        icon: '💰',
        label: 'Next Action for You',
        value: 'Pay Invoice',
        color: 'text-yellow-300',
        href: '/dashboard/invoices',
        tooltip: `${unpaidInvoices} invoice${unpaidInvoices !== 1 ? 's' : ''} awaiting payment`
      };
    }

    return {
      icon: '✅',
      label: 'Next Action for You',
      value: "You're Good for now!",
      color: 'text-green-300',
      tooltip: 'All caught up!'
    };
  };

  const nextAction = getNextAction();

  // Determine which card to highlight based on next action
  const getNextActionCard = (): 'dancers' | 'reservations' | 'routines' | null => {
    const totalDancers = myDancers?.dancers?.length || 0;
    const approvedReservations = myReservations?.reservations?.filter(r => r.status === 'approved').length || 0;

    if (totalDancers === 0) return 'dancers';
    if (approvedReservations === 0) return 'reservations';
    if (routinesLeftToCreate > 0) return 'routines';
    return null; // All caught up
  };

  return (
    <>
      {showLoading && (
        <BalletLoadingAnimation
          onAnimationComplete={() => setShowLoading(false)}
          minDuration={1500}
        />
      )}

      <div className="space-y-8">
      {/* Pending Approval Banner */}
      {studioStatus === 'pending' && (
        <div className="bg-yellow-500/10 backdrop-blur-md rounded-xl border-2 border-yellow-400/50 p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">⏳</div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-yellow-300 mb-2">
                Studio Pending Approval
              </h3>
              <p className="text-gray-300 mb-2">
                Your studio registration is currently under review by the competition administrators.
              </p>
              <p className="text-gray-400 text-sm">
                You will receive an email notification once your studio has been approved. Some features
                may be limited until approval is complete.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-1">
        <h1 className="text-4xl font-bold text-white mb-2">
          {greeting}, {firstName}! 👋
        </h1>
        <p className="text-gray-400 mb-4">
          {studioName && <span className="text-purple-400">{studioName}</span>}
        </p>
        <MotivationalQuote />

        {/* REBUILD: New Entries Page Banner */}
        <div className="mt-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-md rounded-xl border-2 border-purple-400/50 p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">✨</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-semibold text-purple-300">
                  New Entries Page (REBUILD)
                </h3>
                <span className="px-3 py-1 bg-purple-500/30 border border-purple-400/50 rounded-full text-purple-200 text-xs font-bold">
                  🔨 REBUILD
                </span>
              </div>
              <p className="text-gray-300 mb-4">
                Try out our rebuilt entries page with improved performance, smooth animations, and modern design. Your feedback helps us improve!
              </p>
              <Link
                href="/dashboard/entries-rebuild"
                className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                🎨 Open Rebuild Version →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats - 3 large colored cards */}
      <StudioDirectorStats nextActionCard={getNextActionCard()} />

      {/* Quick Actions - 3 cards (Results, Invoices, Music) */}
      <SortableDashboardCards cards={STUDIO_DIRECTOR_CARDS} />

      {/* Quick Stats - 3 clickable cards */}
      <QuickStatsWidget
        className="mt-4"
        stats={[
          {
            icon: '💰',
            value: unpaidInvoices,
            label: 'Unpaid Invoices',
            color: 'text-red-300',
            href: '/dashboard/invoices',
            tooltip: 'Invoices awaiting payment'
          },
          {
            icon: '🎟️',
            value: routinesLeftToCreate,
            label: 'Routines Left',
            color: 'text-yellow-300',
            href: '/dashboard/entries',
            tooltip: 'Remaining routines to create from approved reservations'
          },
          nextAction,
        ]}
      />
    </div>
    </>
  );
}
