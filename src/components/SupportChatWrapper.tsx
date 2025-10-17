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

  // Get current user
  const { data: currentUser } = trpc.user.getCurrentUser.useQuery(undefined, {
    enabled: mounted,
    retry: false,
  });

  if (!mounted || !currentUser) {
    return null;
  }

  // Only show for SD and CD (not SA)
  if (
    currentUser.role !== 'studio_director' &&
    currentUser.role !== 'competition_director'
  ) {
    return null;
  }

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
