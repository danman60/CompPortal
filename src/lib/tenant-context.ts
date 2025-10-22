import { headers } from 'next/headers';
import { createServerSupabaseClient } from './supabase-server-client';
import { prisma } from './prisma';

/**
 * Tenant context data structure
 */
export interface TenantData {
  id: string;
  slug: string;
  subdomain: string;
  name: string;
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string | null;
    tagline?: string;
  };
}

/**
 * Extract subdomain from hostname
 */
function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0];
  const parts = host.split('.');

  if (parts.length <= 1 || host === 'localhost') return null;
  if (parts.length === 2) return null;
  if (parts.length >= 3) return parts[0];

  return null;
}

/**
 * Get tenant ID from request headers (server-side only)
 * Fetches from database based on subdomain
 */
export async function getTenantId(): Promise<string | null> {
  const tenantData = await getTenantData();
  return tenantData?.id || null;
}

/**
 * Get full tenant data from request headers (server-side only)
 * Fetches from database based on subdomain
 * Uses Prisma to bypass RLS (tenant data is public)
 */
export async function getTenantData(): Promise<TenantData | null> {
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  const subdomain = extractSubdomain(hostname);

  // Query by subdomain if present
  if (subdomain) {
    const tenant = await prisma.tenants.findFirst({
      where: { subdomain },
      select: {
        id: true,
        slug: true,
        subdomain: true,
        name: true,
        branding: true,
      },
    });

    if (tenant) {
      return {
        id: tenant.id,
        slug: tenant.slug || '',
        subdomain: tenant.subdomain || '',
        name: tenant.name || 'Competition Portal',
        branding: (tenant.branding && typeof tenant.branding === 'object' ? tenant.branding : {}) as any,
      };
    }
  }

  // Fallback to demo tenant
  const tenant = await prisma.tenants.findFirst({
    where: { slug: 'demo' },
    select: {
      id: true,
      slug: true,
      subdomain: true,
      name: true,
      branding: true,
    },
  });

  if (!tenant) return null;

  return {
    id: tenant.id,
    slug: tenant.slug || '',
    subdomain: tenant.subdomain || '',
    name: tenant.name || 'Competition Portal',
    branding: (tenant.branding && typeof tenant.branding === 'object' ? tenant.branding : {}) as any,
  };
}

/**
 * Get tenant ID from tRPC context
 * Use this in tRPC procedures
 */
export function getTenantIdFromContext(ctx: any): string | null {
  return ctx.tenantId || null;
}

/**
 * Get tenant data from tRPC context
 * Use this in tRPC procedures
 */
export function getTenantDataFromContext(ctx: any): TenantData | null {
  return ctx.tenantData || null;
}

/**
 * Ensure tenant ID exists, throw error if not
 * Use this for routes that require tenant context
 */
export async function requireTenantId(): Promise<string> {
  const tenantId = await getTenantId();

  if (!tenantId) {
    throw new Error('Tenant context not found. Multi-tenant middleware may not be configured.');
  }

  return tenantId;
}
