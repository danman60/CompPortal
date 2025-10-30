import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Supabase Auth middleware for Next.js App Router
 * Handles session refresh, authentication state, and multi-tenant context
 */
export async function updateSession(request: NextRequest) {
  // Extract subdomain from hostname FIRST
  const hostname = request.headers.get('host') || '';
  const subdomain = extractSubdomain(hostname);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // No-op in middleware - cookies are set on response below
        },
      },
    }
  );

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

  // Redirect to tenant selection if no tenant detected (except for public routes)
  const publicRoutes = ['/login', '/signup', '/select-tenant', '/api/tenants', '/api/auth'];
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  if (!tenantId && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/select-tenant';
    return NextResponse.redirect(url);
  }

  // Create modified request headers with tenant context
  const requestHeaders = new Headers(request.headers);

  if (tenantId && tenantData) {
    requestHeaders.set('x-tenant-id', tenantId);
    requestHeaders.set('x-tenant-data', JSON.stringify(tenantData));
  }

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if site is paused (maintenance mode)
  // Only check for subdomain users (not compsync.net main landing)
  if (subdomain) {
    const { data: siteSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'site_paused')
      .single();

    const isPaused = siteSetting?.value === true || siteSetting?.value === 'true';

    if (isPaused) {
      // Check if user is super_admin (only they can bypass)
      let isSuperAdmin = false;
      if (user) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        isSuperAdmin = userProfile?.role === 'super_admin';
      }

      // Redirect to maintenance unless super_admin or already on maintenance page
      if (!isSuperAdmin && !request.nextUrl.pathname.startsWith('/maintenance')) {
        const url = request.nextUrl.clone();
        url.pathname = '/maintenance';
        return NextResponse.redirect(url);
      }
    }
  }

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Return response with modified request headers
  const supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

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
