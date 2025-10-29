import { prisma } from './prisma';

/**
 * Get the full portal URL for a tenant based on their subdomain
 * @param tenantId - The UUID of the tenant
 * @param path - The path to append to the URL (e.g., '/dashboard/reservations')
 * @returns The full tenant-scoped URL (e.g., 'https://empwr.compsync.net/dashboard/reservations')
 */
export async function getTenantPortalUrl(tenantId: string, path: string): Promise<string> {
  try {
    // Query tenant for subdomain
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { subdomain: true },
    });

    if (!tenant?.subdomain) {
      // Fallback to main domain if subdomain not found
      console.warn(`[getTenantPortalUrl] No subdomain found for tenant ${tenantId}, using fallback`);
      return `https://www.compsync.net${path}`;
    }

    // Return tenant-scoped URL
    return `https://${tenant.subdomain}.compsync.net${path}`;
  } catch (error) {
    // On error, fallback to main domain
    console.error(`[getTenantPortalUrl] Error fetching tenant subdomain:`, error);
    return `https://www.compsync.net${path}`;
  }
}
