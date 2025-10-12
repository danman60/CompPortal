import { createClient } from './supabase';
import { logger } from './logger';

/**
 * Storage utilities for Supabase file uploads
 * Handles music files for competition entries
 *
 * NOTE: Image optimization is handled server-side via /api/optimize-image
 * This file remains client-side compatible
 */

const MUSIC_BUCKET = 'competition-music';
const LOGOS_BUCKET = 'studio-logos';

export interface UploadMusicParams {
  file: File;
  entryId: string;
  onProgress?: (progress: number) => void;
}

export interface UploadMusicResult {
  success: boolean;
  publicUrl?: string;
  filePath?: string;
  error?: string;
}

export interface UploadLogoParams {
  file: File;
  studioId: string;
}

export interface UploadLogoResult {
  success: boolean;
  publicUrl?: string;
  filePath?: string;
  error?: string;
}

/**
 * Upload music file to Supabase Storage
 */
export async function uploadMusicFile({
  file,
  entryId,
  onProgress,
}: UploadMusicParams): Promise<UploadMusicResult> {
  try {
    const supabase = createClient();

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|aac)$/i)) {
      return {
        success: false,
        error: 'Invalid file type. Please upload MP3, WAV, M4A, or AAC files only.',
      };
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File too large. Maximum size is 50MB.',
      };
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `entries/${entryId}/${timestamp}-${sanitizedFileName}`;

    // Upload file
    const { data, error } = await supabase.storage
      .from(MUSIC_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      logger.error('Upload error', { error: error instanceof Error ? error : new Error(String(error)) });
      return {
        success: false,
        error: error.message || 'Failed to upload file',
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(MUSIC_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      publicUrl: urlData.publicUrl,
      filePath,
    };
  } catch (error) {
    logger.error('Upload exception', { error: error instanceof Error ? error : new Error(String(error)) });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete music file from Supabase Storage
 */
export async function deleteMusicFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { error } = await supabase.storage
      .from(MUSIC_BUCKET)
      .remove([filePath]);

    if (error) {
      logger.error('Delete error', { error: error instanceof Error ? error : new Error(String(error)) });
      return {
        success: false,
        error: error.message || 'Failed to delete file',
      };
    }

    return { success: true };
  } catch (error) {
    logger.error('Delete exception', { error: error instanceof Error ? error : new Error(String(error)) });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload logo file to Supabase Storage
 * For optimized uploads, use /api/upload-optimized-logo endpoint
 */
export async function uploadLogoFile({
  file,
  studioId,
}: UploadLogoParams): Promise<UploadLogoResult> {
  try {
    const supabase = createClient();

    // Validate file type (images only)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return {
        success: false,
        error: 'Invalid file type. Please upload JPG, PNG, GIF, or WEBP images only.',
      };
    }

    // Validate file size (max 5MB for images)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File too large. Maximum size is 5MB.',
      };
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `studios/${studioId}/${timestamp}-${sanitizedFileName}`;

    // Upload file
    const { data, error} = await supabase.storage
      .from(LOGOS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      logger.error('Upload error', { error: error instanceof Error ? error : new Error(String(error)) });
      return {
        success: false,
        error: error.message || 'Failed to upload file',
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(LOGOS_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      publicUrl: urlData.publicUrl,
      filePath,
    };
  } catch (error) {
    logger.error('Upload exception', { error: error instanceof Error ? error : new Error(String(error)) });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete logo file from Supabase Storage
 */
export async function deleteLogoFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { error } = await supabase.storage
      .from(LOGOS_BUCKET)
      .remove([filePath]);

    if (error) {
      logger.error('Delete error', { error: error instanceof Error ? error : new Error(String(error)) });
      return {
        success: false,
        error: error.message || 'Failed to delete file',
      };
    }

    return { success: true };
  } catch (error) {
    logger.error('Delete exception', { error: error instanceof Error ? error : new Error(String(error)) });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get music file info
 */
export function getMusicFileInfo(url: string) {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];

    return {
      fileName,
      url,
    };
  } catch {
    return null;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
