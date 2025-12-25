import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

/**
 * Media Router - Handles media packages, photos, and video management
 *
 * Storage structure: media/{tenant_id}/{competition_id}/{entry_id}/photos/
 *                   media/{tenant_id}/{competition_id}/{entry_id}/videos/
 */
export const mediaRouter = router({
  /**
   * Get media package for an entry (creates if doesn't exist)
   */
  getPackageByEntry: protectedProcedure
    .input(z.object({
      entryId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant not found' });
      }

      // Helper to fetch package with includes
      const fetchPackageWithIncludes = async (packageId: string) => {
        return prisma.media_packages.findFirst({
          where: { id: packageId },
          include: {
            competition_entries: {
              select: {
                id: true,
                title: true,
                entry_number: true,
              },
            },
          },
        });
      };

      // Find existing media package
      const existingPackage = await prisma.media_packages.findFirst({
        where: {
          tenant_id: ctx.tenantId,
          entry_id: input.entryId,
        },
      });

      let packageId: string;

      if (existingPackage) {
        packageId = existingPackage.id;
      } else {
        // Get entry info to create package
        const entry = await prisma.competition_entries.findFirst({
          where: {
            id: input.entryId,
            tenant_id: ctx.tenantId,
          },
          select: {
            id: true,
            competition_id: true,
            entry_number: true,
          },
        });

        if (!entry) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Entry not found' });
        }

        // Create media package
        const newPackage = await prisma.media_packages.create({
          data: {
            tenant_id: ctx.tenantId,
            competition_id: entry.competition_id,
            entry_id: entry.id,
            entry_number: entry.entry_number ?? 0,
            status: 'pending',
            photo_count: 0,
          },
        });
        packageId = newPackage.id;
      }

      // Fetch package with includes
      const mediaPackage = await fetchPackageWithIncludes(packageId);

      if (!mediaPackage) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch media package' });
      }

      // Get photos for this package
      const photos = await prisma.media_photos.findMany({
        where: {
          media_package_id: mediaPackage.id,
        },
        orderBy: {
          sort_order: 'asc',
        },
      });

      return {
        ...mediaPackage,
        photos,
      };
    }),

  /**
   * Get all media packages for a competition (CD view)
   */
  getPackagesByCompetition: adminProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant not found' });
      }

      const packages = await prisma.media_packages.findMany({
        where: {
          tenant_id: ctx.tenantId,
          competition_id: input.competitionId,
        },
        include: {
          competition_entries: {
            select: {
              id: true,
              title: true,
              entry_number: true,
              dancer_names: true,
            },
          },
        },
        orderBy: {
          entry_number: 'asc',
        },
      });

      return packages;
    }),

  /**
   * Generate signed upload URL for a photo
   */
  getPhotoUploadUrl: adminProcedure
    .input(z.object({
      entryId: z.string().uuid(),
      filename: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant not found' });
      }

      // Get entry to verify access and get competition_id
      const entry = await prisma.competition_entries.findFirst({
        where: {
          id: input.entryId,
          tenant_id: ctx.tenantId,
        },
        select: {
          id: true,
          competition_id: true,
        },
      });

      if (!entry) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Entry not found' });
      }

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const sanitizedFilename = input.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${ctx.tenantId}/${entry.competition_id}/${input.entryId}/photos/${timestamp}_${sanitizedFilename}`;

      // Generate signed URL for upload (valid for 1 hour)
      const { data, error } = await supabaseAdmin.storage
        .from('media')
        .createSignedUploadUrl(storagePath);

      if (error) {
        logger.error('Failed to create signed upload URL', { error, storagePath });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create upload URL' });
      }

      return {
        signedUrl: data.signedUrl,
        path: storagePath,
        token: data.token,
      };
    }),

  /**
   * Confirm photo upload and create database record
   */
  confirmPhotoUpload: adminProcedure
    .input(z.object({
      entryId: z.string().uuid(),
      storagePath: z.string(),
      filename: z.string(),
      fileSize: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant not found' });
      }

      // Get or create media package
      const entry = await prisma.competition_entries.findFirst({
        where: {
          id: input.entryId,
          tenant_id: ctx.tenantId,
        },
        select: {
          id: true,
          competition_id: true,
          entry_number: true,
        },
      });

      if (!entry) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Entry not found' });
      }

      let mediaPackage = await prisma.media_packages.findFirst({
        where: {
          tenant_id: ctx.tenantId,
          entry_id: input.entryId,
        },
      });

      if (!mediaPackage) {
        mediaPackage = await prisma.media_packages.create({
          data: {
            tenant_id: ctx.tenantId,
            competition_id: entry.competition_id,
            entry_id: entry.id,
            entry_number: entry.entry_number ?? 0,
            status: 'pending',
            photo_count: 0,
          },
        });
      }

      // Get current max sort_order
      const maxOrder = await prisma.media_photos.aggregate({
        where: { media_package_id: mediaPackage.id },
        _max: { sort_order: true },
      });

      // Create photo record
      const photo = await prisma.media_photos.create({
        data: {
          media_package_id: mediaPackage.id,
          storage_url: input.storagePath,
          filename: input.filename,
          file_size_bytes: input.fileSize,
          sort_order: (maxOrder._max.sort_order ?? 0) + 1,
        },
      });

      // Update photo count (trigger should handle this, but let's be safe)
      await prisma.media_packages.update({
        where: { id: mediaPackage.id },
        data: { photo_count: { increment: 1 } },
      });

      return photo;
    }),

  /**
   * Delete a photo
   */
  deletePhoto: adminProcedure
    .input(z.object({
      photoId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant not found' });
      }

      // Get photo with package to verify tenant access
      const photo = await prisma.media_photos.findUnique({
        where: { id: input.photoId },
        include: {
          media_packages: {
            select: {
              id: true,
              tenant_id: true,
            },
          },
        },
      });

      if (!photo || photo.media_packages.tenant_id !== ctx.tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
      }

      // Delete from storage
      if (photo.storage_url) {
        const { error } = await supabaseAdmin.storage
          .from('media')
          .remove([photo.storage_url]);

        if (error) {
          logger.error('Failed to delete photo from storage', { error, path: photo.storage_url });
        }
      }

      // Delete thumbnail if exists
      if (photo.thumbnail_url) {
        await supabaseAdmin.storage
          .from('media')
          .remove([photo.thumbnail_url]);
      }

      // Delete database record
      await prisma.media_photos.delete({
        where: { id: input.photoId },
      });

      // Update photo count
      await prisma.media_packages.update({
        where: { id: photo.media_packages.id },
        data: { photo_count: { decrement: 1 } },
      });

      return { success: true };
    }),

  /**
   * Update video URL for a package
   */
  updateVideoUrl: adminProcedure
    .input(z.object({
      packageId: z.string().uuid(),
      videoType: z.enum(['performance', 'judge1', 'judge2', 'judge3']),
      videoUrl: z.string().url().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant not found' });
      }

      // Verify package belongs to tenant
      const pkg = await prisma.media_packages.findFirst({
        where: {
          id: input.packageId,
          tenant_id: ctx.tenantId,
        },
      });

      if (!pkg) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Package not found' });
      }

      // Map video type to field
      const fieldMap: Record<string, string> = {
        performance: 'performance_video_url',
        judge1: 'judge1_video_url',
        judge2: 'judge2_video_url',
        judge3: 'judge3_video_url',
      };

      const field = fieldMap[input.videoType];

      const updated = await prisma.media_packages.update({
        where: { id: input.packageId },
        data: { [field]: input.videoUrl },
      });

      return updated;
    }),

  /**
   * Get signed download URL for a photo
   */
  getPhotoDownloadUrl: protectedProcedure
    .input(z.object({
      photoId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant not found' });
      }

      const photo = await prisma.media_photos.findUnique({
        where: { id: input.photoId },
        include: {
          media_packages: {
            select: {
              tenant_id: true,
            },
          },
        },
      });

      if (!photo || photo.media_packages.tenant_id !== ctx.tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo not found' });
      }

      // Generate signed download URL (valid for 1 hour)
      const { data, error } = await supabaseAdmin.storage
        .from('media')
        .createSignedUrl(photo.storage_url!, 3600);

      if (error) {
        logger.error('Failed to create signed download URL', { error });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create download URL' });
      }

      return {
        signedUrl: data.signedUrl,
        filename: photo.filename,
      };
    }),

  /**
   * Log media access (for analytics and limiting)
   */
  logAccess: protectedProcedure
    .input(z.object({
      packageId: z.string().uuid(),
      dancerId: z.string().uuid().optional(),
      accessType: z.enum(['view', 'download']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant not found' });
      }

      await prisma.media_access_logs.create({
        data: {
          tenant_id: ctx.tenantId,
          media_package_id: input.packageId,
          dancer_id: input.dancerId,
          access_type: input.accessType,
          accessed_at: new Date(),
        },
      });

      return { success: true };
    }),

  /**
   * Bulk upload photos (get multiple upload URLs)
   */
  getBulkPhotoUploadUrls: adminProcedure
    .input(z.object({
      entryId: z.string().uuid(),
      files: z.array(z.object({
        filename: z.string(),
        contentType: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant not found' });
      }

      // Get entry to verify access
      const entry = await prisma.competition_entries.findFirst({
        where: {
          id: input.entryId,
          tenant_id: ctx.tenantId,
        },
        select: {
          id: true,
          competition_id: true,
        },
      });

      if (!entry) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Entry not found' });
      }

      const uploadUrls = await Promise.all(
        input.files.map(async (file, index) => {
          const timestamp = Date.now() + index;
          const sanitizedFilename = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
          const storagePath = `${ctx.tenantId}/${entry.competition_id}/${input.entryId}/photos/${timestamp}_${sanitizedFilename}`;

          const { data, error } = await supabaseAdmin.storage
            .from('media')
            .createSignedUploadUrl(storagePath);

          if (error) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to create upload URL for ${file.filename}` });
          }

          return {
            filename: file.filename,
            signedUrl: data.signedUrl,
            path: storagePath,
            token: data.token,
          };
        })
      );

      return uploadUrls;
    }),

  /**
   * Update package status
   */
  updatePackageStatus: adminProcedure
    .input(z.object({
      packageId: z.string().uuid(),
      status: z.enum(['pending', 'processing', 'ready', 'published']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant not found' });
      }

      const pkg = await prisma.media_packages.findFirst({
        where: {
          id: input.packageId,
          tenant_id: ctx.tenantId,
        },
      });

      if (!pkg) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Package not found' });
      }

      const updated = await prisma.media_packages.update({
        where: { id: input.packageId },
        data: { status: input.status },
      });

      return updated;
    }),
});
