'use client';

/**
 * Support Chat Wrapper
 *
 * Client-side wrapper that fetches user data and renders SupportChatButton
 * Only shows for authenticated users (SD and CD roles)
 *
 * Wave 4.1: Chatwoot Integration
 */

import { useEffect, useState } from 'react';
import { SupportChatButton } from './SupportChatButton';
import { trpc } from '@/lib/trpc';

export function SupportChatWrapper() {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't query until mounted
  if (!mounted) {
    return null;
  }

  return <SupportChatWrapperInner />;
}

function SupportChatWrapperInner() {
  // Get current user
  const { data: currentUser, error, isLoading } = trpc.user.getCurrentUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Don't render on error, loading, or no user data
  if (isLoading) {
    console.log('SupportChatWrapper: Loading user data...');
    return null;
  }

  if (error) {
    console.error('SupportChatWrapper: Error loading user', error);
    return null;
  }

  if (!currentUser) {
    console.warn('SupportChatWrapper: No user data');
    return null;
  }

  // Only show for SD and CD (not SA)
  if (
    currentUser.role !== 'studio_director' &&
    currentUser.role !== 'competition_director'
  ) {
    console.log('SupportChatWrapper: User role not SD/CD', currentUser.role);
    return null;
  }

  console.log('SupportChatWrapper: Rendering chat button for', currentUser.role);

  return (
    <SupportChatButton
      userRole={currentUser.role as 'studio_director' | 'competition_director'}
      userEmail={currentUser.email || undefined}
      userName={
        currentUser.first_name && currentUser.last_name
          ? `${currentUser.first_name} ${currentUser.last_name}`
          : currentUser.first_name || currentUser.email || undefined
      }
      userId={currentUser.id}
    />
  );
}
