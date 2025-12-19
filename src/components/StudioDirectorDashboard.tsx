'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StudioDirectorStats from './StudioDirectorStats';
import QuickStatsWidget from './QuickStatsWidget';
import { trpc } from '@/lib/trpc';
import SortableDashboardCards, { DashboardCard } from './SortableDashboardCards';
import MotivationalQuote from './MotivationalQuote';
import BalletLoadingAnimation from './BalletLoadingAnimation';
import { FeedbackWidget } from './FeedbackWidget';

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
  studioCode?: string | null;
  studioPublicCode?: string | null;
  studioStatus?: string | null;
  logoUrl?: string | null;
}

// Quick action cards for SD
const STUDIO_DIRECTOR_CARDS: DashboardCard[] = [
  {
    id: 'scheduling',
    href: '/dashboard/schedules',
    icon: '📅',
    title: 'Scheduling',
    description: 'View your competition schedule',
    disabled: true,
  },
  {
    id: 'marks',
    href: '#',
    icon: '📊',
    title: 'Marks',
    description: 'View scores and adjudications',
    disabled: true,
  },
  {
    id: 'media',
    href: '/dashboard/media',
    icon: '📸',
    title: 'Media & Photos',
    description: 'Access photos and videos from competitions',
  },
];

export default function StudioDirectorDashboard({ userEmail, firstName, studioName, studioCode, studioPublicCode, studioStatus, logoUrl }: StudioDirectorDashboardProps) {
  const [showLoading, setShowLoading] = useState(true);
  const [greeting, setGreeting] = useState('Hello');
  const { data: myDancers, isLoading: dancersLoading } = trpc.dancer.getAll.useQuery();
  const { data: entryCounts, isLoading: entriesLoading } = trpc.entry.getCounts.useQuery();
  const { data: myReservations, isLoading: reservationsLoading } = trpc.reservation.getAll.useQuery();

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

  // Calculate routines left to create (only count open approved/adjusted reservations)
  // Don't count entries from summarized/invoiced/closed reservations (Phase1 spec:61)
  const approvedReservationSpaces = myReservations?.reservations
    ?.filter(r => r.status === 'approved' || r.status === 'adjusted')
    ?.reduce((total, r) => total + (r.spaces_requested || 0), 0) || 0;

  const approvedReservationIds = myReservations?.reservations
    ?.filter(r => r.status === 'approved' || r.status === 'adjusted')
    ?.map(r => r.id) || [];

  const createdRoutinesForApprovedReservations = approvedReservationIds
    .reduce((total, resId) => total + (entryCounts?.byReservation[resId] || 0), 0);

  const routinesLeftToCreate = Math.max(0, approvedReservationSpaces - createdRoutinesForApprovedReservations);

  // Calculate unpaid invoices (only count SENT status, not PAID)
  // getByStudio returns both SENT and PAID invoices (invoice.ts:336-338)
  const unpaidInvoices = myInvoices?.invoices?.filter(i => i.status === 'SENT').length || 0;
  const totalInvoices = myInvoices?.invoices?.length || 0;
  const hasPaidInvoice = myInvoices?.invoices?.some(i => i.status === 'PAID') || false;

  // Calculate total deposit amount from all reservations
  const totalDeposit = myReservations?.reservations
    ?.reduce((total, r) => total + (Number(r.deposit_amount) || 0), 0) || 0;

  // Determine next action for user
  const getNextAction = () => {
    const totalDancers = myDancers?.dancers?.length || 0;
    const approvedReservations = myReservations?.reservations?.filter(r => r.status === 'approved').length || 0;
    const pendingReservations = myReservations?.reservations?.filter(r => r.status === 'pending').length || 0;

    // Show "All Done!" if they have at least one paid invoice
    if (hasPaidInvoice) {
      return {
        icon: '✅',
        label: 'Next Action for You',
        value: "All Done!",
        color: 'text-green-300',
        tooltip: 'All caught up!'
      };
    }

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

    if (pendingReservations > 0) {
      return {
        icon: '⏳',
        label: 'Next Action for You',
        value: 'Awaiting Reservation Approval',
        color: 'text-yellow-300',
        href: '/dashboard/reservations',
        tooltip: `${pendingReservations} reservation${pendingReservations !== 1 ? 's' : ''} pending approval from competition director`
      };
    }

    if (approvedReservations === 0) {
      return {
        icon: '📋',
        label: 'Next Action for You',
        value: 'Request Reservation',
        color: 'text-green-300',
        href: '/dashboard/reservations',
        tooltip: 'Reserve routine slots for a competition'
      };
    }

    if (routinesLeftToCreate > 0) {
      return {
        icon: '🎭',
        label: 'Next Action for You',
        value: 'Create Routines',
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
      value: "All Done!",
      color: 'text-green-300',
      tooltip: 'All caught up!'
    };
  };

  const nextAction = getNextAction();

  // Determine which card to highlight based on next action
  // Tutorial mode: disable glow after first summary submitted
  const getNextActionCard = (): 'dancers' | 'reservations' | 'routines' | null => {
    // Disable tutorial glow once ANY reservation has been summarized (Phase1 spec:61)
    const hasSubmittedReservation = myReservations?.reservations?.some(r =>
      ['summarized', 'invoiced', 'closed'].includes(r.status || '')
    );
    if (hasSubmittedReservation) return null;

    const totalDancers = myDancers?.dancers?.length || 0;
    const totalReservations = myReservations?.reservations?.length || 0;
    const approvedReservations = myReservations?.reservations?.filter(r => r.status === 'approved' || r.status === 'adjusted').length || 0;

    // Always pulse dancers first, regardless of reservation status
    // Most SDs join with existing confirmed reservations, dancers come first
    if (totalDancers === 0) return 'dancers';

    // Only pulse reservations if NO reservations exist at all
    if (totalReservations === 0) return 'reservations';

    // Only pulse routines if there are approved reservations and routines left to create
    if (approvedReservations > 0 && routinesLeftToCreate > 0) return 'routines';

    return null; // Tutorial complete or waiting for routine creation
  };

  // Check if critical data is ready (all queries completed)
  const dataReady = !dancersLoading && !entriesLoading && !reservationsLoading;

  return (
    <>
      {showLoading && (
        <BalletLoadingAnimation
          onAnimationComplete={() => setShowLoading(false)}
          minDuration={1500}
          dataReady={dataReady}
        />
      )}

      {!showLoading && (
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
      <div className="flex-1 relative">
        {/* Top Right Logo */}
        {logoUrl && (
          <div className="absolute top-0 right-0 z-10">
            <img
              src={logoUrl}
              alt="Competition Logo"
              className="max-w-[200px] w-full h-auto"
              style={{
                filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.15))'
              }}
            />
          </div>
        )}

        <h1 className="text-4xl font-bold text-white mb-2">
          {greeting}, {firstName}! 👋
        </h1>
        <p className="text-gray-400 mb-4">
          {studioName && (
            <>
              <span className="text-purple-400">{studioName}</span>
              {studioPublicCode && (
                <span className="ml-3 px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-purple-300 text-sm font-mono">
                  Code: {studioPublicCode}
                </span>
              )}
            </>
          )}
        </p>
        <MotivationalQuote />
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
            tooltip: 'Invoices awaiting payment',
            subtitle: `Total Invoices: ${totalInvoices}`
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
    )}

    {/* Feedback Widget */}
    <FeedbackWidget userRole="studio_director" />
    </>
  );
}
