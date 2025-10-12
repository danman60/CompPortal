import sharp from 'sharp';
import { logger } from './logger';

/**
 * Image optimization utilities using Sharp
 * Handles resizing, compression, and format conversion
 */

export interface ImageOptimizationOptions {
  /**
   * Maximum width in pixels
   * @default 1920
   */
  maxWidth?: number;
  /**
   * Maximum height in pixels
   * @default 1080
   */
  maxHeight?: number;
  /**
   * Quality for JPEG/WebP (1-100)
   * @default 80
   */
  quality?: number;
  /**
   * Convert to WebP format
   * @default true
   */
  convertToWebP?: boolean;
  /**
   * Generate multiple sizes (thumbnail, medium, original)
   * @default false
   */
  generateMultipleSizes?: boolean;
}

export interface OptimizedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface MultipleSizeResult {
  thumbnail: OptimizedImage;
  medium: OptimizedImage;
  large: OptimizedImage;
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 80,
  convertToWebP: true,
  generateMultipleSizes: false,
};

/**
 * Optimize a single image
 */
export async function optimizeImage(
  input: Buffer | string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    let pipeline = sharp(input);

    // Get original metadata
    const metadata = await pipeline.metadata();

    // Resize if needed (maintain aspect ratio)
    if (
      (metadata.width && metadata.width > opts.maxWidth) ||
      (metadata.height && metadata.height > opts.maxHeight)
    ) {
      pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert format and compress
    if (opts.convertToWebP) {
      pipeline = pipeline.webp({ quality: opts.quality });
    } else if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      pipeline = pipeline.jpeg({ quality: opts.quality, mozjpeg: true });
    } else if (metadata.format === 'png') {
      pipeline = pipeline.png({ compressionLevel: 9, quality: opts.quality });
    }

    // Process image
    const buffer = await pipeline.toBuffer();
    const info = await sharp(buffer).metadata();

    return {
      buffer,
      width: info.width || 0,
      height: info.height || 0,
      format: opts.convertToWebP ? 'webp' : info.format || 'unknown',
      size: buffer.length,
    };
  } catch (error) {
    logger.error('Image optimization error', { error: error instanceof Error ? error : new Error(String(error)) });
    throw new Error(
      `Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate multiple sizes of an image (thumbnail, medium, large)
 */
export async function optimizeImageMultipleSizes(
  input: Buffer | string
): Promise<MultipleSizeResult> {
  try {
    const [thumbnail, medium, large] = await Promise.all([
      // Thumbnail: 200x200
      optimizeImage(input, {
        maxWidth: 200,
        maxHeight: 200,
        quality: 80,
        convertToWebP: true,
      }),
      // Medium: 800x800
      optimizeImage(input, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 85,
        convertToWebP: true,
      }),
      // Large: 1920x1080
      optimizeImage(input, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 90,
        convertToWebP: true,
      }),
    ]);

    return { thumbnail, medium, large };
  } catch (error) {
    logger.error('Multiple sizes optimization error', { error: error instanceof Error ? error : new Error(String(error)) });
    throw new Error(
      `Failed to generate multiple sizes: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Optimize image from File object (browser)
 */
export async function optimizeImageFromFile(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return optimizeImage(buffer, options);
}

/**
 * Convert optimized image back to File object
 */
export function optimizedImageToFile(
  optimized: OptimizedImage,
  originalFileName: string
): File {
  // Replace extension with format
  const nameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '');
  const newFileName = `${nameWithoutExt}.${optimized.format}`;

  // Convert Buffer to Uint8Array for Blob compatibility
  const uint8Array = new Uint8Array(optimized.buffer);

  const blob = new Blob([uint8Array], {
    type: `image/${optimized.format}`,
  });

  return new File([blob], newFileName, {
    type: `image/${optimized.format}`,
    lastModified: Date.now(),
  });
}

/**
 * Get image dimensions without optimization
 */
export async function getImageDimensions(
  input: Buffer | string
): Promise<{ width: number; height: number; format: string }> {
  try {
    const metadata = await sharp(input).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
    };
  } catch (error) {
    logger.error('Get dimensions error', { error: error instanceof Error ? error : new Error(String(error)) });
    throw new Error(
      `Failed to get image dimensions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate if file is a valid image
 */
export async function isValidImage(input: Buffer | string): Promise<boolean> {
  try {
    await sharp(input).metadata();
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculate compression ratio
 */
export function getCompressionRatio(originalSize: number, optimizedSize: number): number {
  if (originalSize === 0) return 0;
  return Math.round(((originalSize - optimizedSize) / originalSize) * 100);
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
