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
    // Production subdomain provided - lookup required
    const { data, error } = await supabase
      .from('tenants')
      .select('id, slug, subdomain, name, branding')
      .eq('subdomain', subdomain)
      .single();

    if (!error && data) {
      tenantId = data.id;
      tenantData = data;
    } else {
      // ✅ Invalid subdomain - return 404 immediately
      return new Response(
        JSON.stringify({
          error: 'Tenant not found',
          message: `No tenant found for subdomain: ${subdomain}`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } else {
    // No subdomain detected
    if (hostname === 'localhost' || hostname.startsWith('localhost:')) {
      // ✅ Localhost - load demo tenant for development
      const { data, error } = await supabase
        .from('tenants')
        .select('id, slug, subdomain, name, branding')
        .eq('slug', 'demo')
        .single();

      if (!error && data) {
        tenantId = data.id;
        tenantData = data;
      } else {
        // Demo tenant not found - this is a setup issue
        return new Response(
          JSON.stringify({
            error: 'Demo tenant not configured',
            message: 'Contact system administrator',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      // ✅ Production without subdomain (e.g., compsync.net) - serve landing page with null tenant
      // Landing page will display marketing content instead of tenant-specific portal
      tenantId = null;
      tenantData = null;
    }
  }

  // Create modified request headers with tenant context
  const requestHeaders = new Headers(request.headers);

  // ✅ Set tenant headers (may be null for root domain landing page)
  if (tenantId) {
    requestHeaders.set('x-tenant-id', tenantId);
    requestHeaders.set('x-tenant-data', JSON.stringify(tenantData));
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
