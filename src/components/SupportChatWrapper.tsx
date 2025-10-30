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

  // Prevent hydration mismatch - wait for client mount
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Don't render anything until mounted on client
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
    staleTime: Infinity, // Prevent refetching
  });

  // Don't render while loading or on error
  if (isLoading || error || !currentUser) {
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
      tenantName={currentUser.tenant?.name}
      subdomain={currentUser.tenant?.subdomain}
      studioName={currentUser.studio?.name}
      studioPublicCode={currentUser.studio?.public_code}
    />
  );
}
