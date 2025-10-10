import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Supabase Auth middleware for Next.js App Router
 * Handles session refresh, authentication state, and multi-tenant context
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Extract subdomain from hostname
  const hostname = request.headers.get('host') || '';
  const subdomain = extractSubdomain(hostname);

  // Query tenant by subdomain
  let tenantId: string | null = null;
  let tenantData: any = null;

  if (subdomain) {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, slug, subdomain, name, branding')
      .eq('subdomain', subdomain)
      .single();

    if (!error && data) {
      tenantId = data.id;
      tenantData = data;
    }
  }

  // Fallback to default tenant (empwr) if no subdomain or tenant not found
  if (!tenantId) {
    const { data } = await supabase
      .from('tenants')
      .select('id, slug, subdomain, name, branding')
      .eq('slug', 'empwr')
      .single();

    if (data) {
      tenantId = data.id;
      tenantData = data;
    }
  }

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Inject tenant context into headers for downstream use
  if (tenantId && tenantData) {
    supabaseResponse.headers.set('x-tenant-id', tenantId);
    supabaseResponse.headers.set('x-tenant-data', JSON.stringify(tenantData));
  }

  return supabaseResponse;
}

/**
 * Extract subdomain from hostname
 * Examples:
 *   - empwr.compsync.net → empwr
 *   - demo.compsync.net → demo
 *   - localhost:3000 → null
 *   - compsync.net → null
 */
function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];

  // Split by dots
  const parts = host.split('.');

  // localhost or IP address
  if (parts.length <= 1 || host === 'localhost') {
    return null;
  }

  // compsync.net (no subdomain)
  if (parts.length === 2) {
    return null;
  }

  // empwr.compsync.net → empwr
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}
