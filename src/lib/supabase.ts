import { createBrowserClient } from '@supabase/ssr';

/**
 * Client-side Supabase client for browser usage
 * Used in Client Components for authentication and client-side queries
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
