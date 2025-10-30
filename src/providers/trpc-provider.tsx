'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState, useEffect, useRef } from 'react';
import superjson from 'superjson';
import { trpc } from '@/lib/trpc';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenantTheme();
  const [queryClient] = useState(() => new QueryClient());

  // Store tenant ID in a ref that persists across renders
  const tenantIdRef = useRef<string | null>(tenant?.id || null);

  // Update ref whenever tenant changes
  useEffect(() => {
    tenantIdRef.current = tenant?.id || null;
  }, [tenant?.id]);

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: typeof window !== 'undefined'
            ? `${window.location.origin}/api/trpc`
            : `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/trpc`,
          transformer: superjson,
          headers: () => {
            // Include tenant ID in headers for proper multi-tenant isolation
            // Read from ref to get current tenant (not stale closure value)
            const headers: Record<string, string> = {};
            const currentTenantId = tenantIdRef.current;
            if (currentTenantId) {
              headers['x-tenant-id'] = currentTenantId;
            }
            return headers;
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
