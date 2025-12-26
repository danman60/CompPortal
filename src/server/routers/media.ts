import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import sharp from 'sharp';

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
   * Get all competition entries with their media packages (for CD upload view)
   * This returns ALL entries, not just those with existing media packages
   */
  getEntriesWithMedia: adminProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant not found' });
      }

      // Query entries directly, with optional media package info
      const entries = await prisma.competition_entries.findMany({
        where: {
          tenant_id: ctx.tenantId,
          competition_id: input.competitionId,
        },
        select: {
          id: true,
          entry_number: true,
          title: true,
          dancer_names: true,
          media_packages: {
            select: {
              id: true,
              status: true,
              photo_count: true,
              performance_video_url: true,
              judge1_video_url: true,
              judge2_video_url: true,
              judge3_video_url: true,
            },
          },
        },
        orderBy: {
          entry_number: 'asc',
        },
      });

      // Transform to include mediaPackage as a single object (or null)
      return entries.map(entry => ({
        ...entry,
        mediaPackage: entry.media_packages[0] || null,
      }));
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

  /**
   * Generate thumbnail for a photo
   * Downloads original, creates 200x200 WebP thumbnail, uploads to storage, updates DB
   */
  generateThumbnail: adminProcedure
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

      // Skip if thumbnail already exists
      if (photo.thumbnail_url) {
        return { success: true, thumbnail_url: photo.thumbnail_url, skipped: true };
      }

      if (!photo.storage_url) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Photo has no storage URL' });
      }

      try {
        // Download original image from Supabase Storage
        const { data: downloadData, error: downloadError } = await supabaseAdmin.storage
          .from('media')
          .download(photo.storage_url);

        if (downloadError || !downloadData) {
          logger.error('Failed to download original image', { error: downloadError, path: photo.storage_url });
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to download original image' });
        }

        // Convert Blob to Buffer
        const arrayBuffer = await downloadData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generate 200x200 WebP thumbnail using Sharp
        const thumbnailBuffer = await sharp(buffer)
          .resize(200, 200, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 80 })
          .toBuffer();

        // Generate thumbnail storage path (same folder as original, with _thumb suffix)
        const originalPath = photo.storage_url;
        const pathParts = originalPath.split('/');
        const filename = pathParts.pop() || '';
        const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        const thumbnailPath = [...pathParts, `${filenameWithoutExt}_thumb.webp`].join('/');

        // Upload thumbnail to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from('media')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (uploadError) {
          logger.error('Failed to upload thumbnail', { error: uploadError, path: thumbnailPath });
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to upload thumbnail' });
        }

        // Update photo record with thumbnail URL
        await prisma.media_photos.update({
          where: { id: input.photoId },
          data: { thumbnail_url: thumbnailPath },
        });

        logger.info('Thumbnail generated successfully', {
          photoId: input.photoId,
          thumbnailPath,
          originalSize: buffer.length,
          thumbnailSize: thumbnailBuffer.length,
        });

        return { success: true, thumbnail_url: thumbnailPath, skipped: false };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Thumbnail generation failed', { error: error instanceof Error ? error : new Error(String(error)), photoId: input.photoId });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Thumbnail generation failed' });
      }
    }),

  /**
   * Generate thumbnails for all photos in a package (batch operation)
   */
  generatePackageThumbnails: adminProcedure
    .input(z.object({
      packageId: z.string().uuid(),
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

      // Get all photos without thumbnails
      const photos = await prisma.media_photos.findMany({
        where: {
          media_package_id: input.packageId,
          thumbnail_url: null,
          
        },
      });

      if (photos.length === 0) {
        return { success: true, generated: 0, total: 0, message: 'All photos already have thumbnails' };
      }

      let successCount = 0;
      const errors: string[] = [];

      for (const photo of photos) {
        try {
          // Download original
          const { data: downloadData, error: downloadError } = await supabaseAdmin.storage
            .from('media')
            .download(photo.storage_url!);

          if (downloadError || !downloadData) {
            errors.push(`Photo ${photo.id}: Download failed`);
            continue;
          }

          // Convert and generate thumbnail
          const arrayBuffer = await downloadData.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const thumbnailBuffer = await sharp(buffer)
            .resize(200, 200, { fit: 'cover', position: 'center' })
            .webp({ quality: 80 })
            .toBuffer();

          // Generate thumbnail path
          const pathParts = photo.storage_url!.split('/');
          const filename = pathParts.pop() || '';
          const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');
          const thumbnailPath = [...pathParts, `${filenameWithoutExt}_thumb.webp`].join('/');

          // Upload thumbnail
          const { error: uploadError } = await supabaseAdmin.storage
            .from('media')
            .upload(thumbnailPath, thumbnailBuffer, {
              contentType: 'image/webp',
              upsert: true,
            });

          if (uploadError) {
            errors.push(`Photo ${photo.id}: Upload failed`);
            continue;
          }

          // Update DB
          await prisma.media_photos.update({
            where: { id: photo.id },
            data: { thumbnail_url: thumbnailPath },
          });

          successCount++;
        } catch (error) {
          errors.push(`Photo ${photo.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      logger.info('Batch thumbnail generation complete', {
        packageId: input.packageId,
        total: photos.length,
        success: successCount,
        errors: errors.length,
      });

      return {
        success: true,
        generated: successCount,
        total: photos.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),
});
