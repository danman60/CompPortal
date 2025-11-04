'use client';

import dynamic from 'next/dynamic';
import MobileBottomNav from '@/components/MobileBottomNav';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black pb-28 md:pb-0">
          {children}
        </div>
        <MobileBottomNav />
        <KeyboardShortcutsModal />
        <SupportChatWrapper />
      </ErrorBoundary>
    </>
  );
}
