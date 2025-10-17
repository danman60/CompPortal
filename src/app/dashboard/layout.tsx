'use client';

import MobileBottomNav from '@/components/MobileBottomNav';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import { SupportChatWrapper } from '@/components/SupportChatWrapper';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
        <div className="pb-20 md:pb-0">{children}</div>
        <MobileBottomNav />
        <KeyboardShortcutsModal />
        <SupportChatWrapper />
      </ErrorBoundary>
    </>
  );
}
