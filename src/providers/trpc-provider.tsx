'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import superjson from 'superjson';
import { trpc } from '@/lib/trpc';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenantTheme();
  const [queryClient] = useState(() => new QueryClient());

  // Store tenant in ref so headers function can access current value
  const tenantRef = useState<{ current: string | null }>(() => ({ current: null }))[0];
  tenantRef.current = tenant?.id || null;

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
            if (tenantRef.current) {
              headers['x-tenant-id'] = tenantRef.current;
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
