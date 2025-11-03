'use client';

import dynamic from 'next/dynamic';
import MobileBottomNav from '@/components/MobileBottomNav';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import { SuperAdminActivityBar } from '@/components/SuperAdminActivityBar';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { trpc } from '@/lib/trpc';

// Dynamically import SupportChatWrapper with no SSR to prevent hydration issues
const SupportChatWrapper = dynamic(
  () => import('@/components/SupportChatWrapper').then((mod) => ({ default: mod.SupportChatWrapper })),
  { ssr: false }
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enable global keyboard navigation
  useKeyboardNavigation();

  return (
    <>
      <ErrorBoundary boundaryName="Dashboard">
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black pb-20 md:pb-0">
          {/* Super Admin Activity Bar - Shows system-wide activity (backend restricts to SA) */}
          <div className="fixed top-4 left-4 right-4 z-50 max-w-7xl mx-auto">
            <SuperAdminActivityBar />
          </div>

          {/* Main content with top padding for activity bar */}
          <div className="pt-48">
            {children}
          </div>
        </div>
        <MobileBottomNav />
        <KeyboardShortcutsModal />
        <SupportChatWrapper />
      </ErrorBoundary>
    </>
  );
}
