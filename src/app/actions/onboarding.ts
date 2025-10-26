'use server';

import { getTenantId } from '@/lib/tenant-context';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Server action for studio onboarding
 * Uses tenant context from subdomain
 */
export async function createStudioOnboarding(formData: {
  owner_id: string;
  name: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  consent_photo_video?: boolean;
  consent_legal_info?: boolean;
}) {
  // Get tenant from subdomain context
  const tenantId = await getTenantId();

  if (!tenantId) {
    logger.error('Onboarding attempted without tenant context');
    throw new Error('No tenant context - please access via subdomain (e.g., empwr.compsync.net)');
  }

  const now = new Date();

  try {
    const studio = await prisma.studios.create({
      data: {
        tenant_id: tenantId, // ✅ Dynamic from subdomain
        owner_id: formData.owner_id,
        name: formData.name,
        address1: formData.address1 || null,
        address2: formData.address2 || null,
        city: formData.city || null,
        province: formData.province || null,
        postal_code: formData.postal_code || null,
        phone: formData.phone || null,
        email: formData.email || null,
        status: 'approved',
        country: 'Canada',
        consent_photo_video: formData.consent_photo_video ? now : null,
        consent_legal_info: formData.consent_legal_info ? now : null,
      },
    });

    logger.info('Studio created via onboarding', {
      studioId: studio.id,
      tenantId,
      studioName: studio.name,
    });

    return { success: true, studioId: studio.id };
  } catch (error) {
    logger.error('Failed to create studio in onboarding', {
      error: error instanceof Error ? error : new Error(String(error)),
      tenantId,
    });
    throw error;
  }
}

/**
 * Update existing studio during onboarding
 */
export async function updateStudioOnboarding(
  ownerId: string,
  formData: {
    name: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    phone?: string;
    email?: string;
    consent_photo_video?: boolean;
    consent_legal_info?: boolean;
  }
) {
  const tenantId = await getTenantId();

  if (!tenantId) {
    throw new Error('No tenant context - please access via subdomain');
  }

  const now = new Date();

  try {
    const studio = await prisma.studios.updateMany({
      where: { owner_id: ownerId },
      data: {
        name: formData.name,
        address1: formData.address1 || null,
        address2: formData.address2 || null,
        city: formData.city || null,
        province: formData.province || null,
        postal_code: formData.postal_code || null,
        phone: formData.phone || null,
        email: formData.email || null,
        consent_photo_video: formData.consent_photo_video ? now : null,
        consent_legal_info: formData.consent_legal_info ? now : null,
      },
    });

    logger.info('Studio updated via onboarding', { ownerId, tenantId });

    return { success: true, count: studio.count };
  } catch (error) {
    logger.error('Failed to update studio in onboarding', {
      error: error instanceof Error ? error : new Error(String(error)),
      ownerId,
      tenantId,
    });
    throw error;
  }
}
