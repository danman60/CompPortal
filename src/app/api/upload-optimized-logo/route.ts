import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { optimizeImage, formatBytes, getCompressionRatio } from '@/lib/image-optimization';
import { logger } from '@/lib/logger';

/**
 * Server-side API route for optimized logo upload
 * POST /api/upload-optimized-logo
 *
 * Flow:
 * 1. Receive image file
 * 2. Optimize with Sharp (resize, compress, convert to WebP)
 * 3. Upload optimized image to Supabase Storage
 * 4. Return public URL
 */

const LOGOS_BUCKET = 'studio-logos';

export async function POST(request: NextRequest) {
  try {
    // Get form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const studioId = formData.get('studioId') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    if (!studioId) {
      return NextResponse.json(
        { success: false, error: 'Studio ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are supported.',
        },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB before optimization)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large. Maximum size is 5MB.',
        },
        { status: 400 }
      );
    }

    // Get optimization options from query params
    const searchParams = request.nextUrl.searchParams;
    const maxWidth = parseInt(searchParams.get('maxWidth') || '800');
    const maxHeight = parseInt(searchParams.get('maxHeight') || '800');
    const quality = parseInt(searchParams.get('quality') || '85');

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const originalSize = buffer.length;

    logger.info('Optimizing logo for studio', {
      studioId,
      fileName: file.name,
      originalSize: formatBytes(originalSize),
    });

    // Optimize image with Sharp
    const optimized = await optimizeImage(buffer, {
      maxWidth,
      maxHeight,
      quality,
      convertToWebP: true,
    });

    const compressionRatio = getCompressionRatio(originalSize, optimized.size);
    logger.info('Image optimization complete', {
      optimizedSize: formatBytes(optimized.size),
      savedPercentage: compressionRatio,
      dimensions: `${optimized.width}x${optimized.height}`,
    });

    // Upload to Supabase Storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logger.error('Supabase credentials missing', { error: new Error('Missing SUPABASE credentials') });
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error',
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate unique file path
    const timestamp = Date.now();
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `studios/${studioId}/${timestamp}-${sanitizedName}.${optimized.format}`;

    // Upload optimized image
    const { data, error } = await supabase.storage
      .from(LOGOS_BUCKET)
      .upload(filePath, optimized.buffer, {
        contentType: `image/${optimized.format}`,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      logger.error('Supabase upload error', { error: error instanceof Error ? error : new Error(String(error)) });
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to upload file',
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(LOGOS_BUCKET).getPublicUrl(filePath);

    logger.info('Upload complete', { publicUrl: urlData.publicUrl, filePath });

    return NextResponse.json(
      {
        success: true,
        publicUrl: urlData.publicUrl,
        filePath,
        optimization: {
          originalSize,
          optimizedSize: optimized.size,
          compressionRatio,
          width: optimized.width,
          height: optimized.height,
          format: optimized.format,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Upload API error', { error: error instanceof Error ? error : new Error(String(error)) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check API status
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/upload-optimized-logo',
    method: 'POST',
    accepts: 'multipart/form-data',
    params: {
      image: 'File (required)',
      studioId: 'string (required)',
      maxWidth: 'number (default: 800)',
      maxHeight: 'number (default: 800)',
      quality: 'number 1-100 (default: 85)',
    },
    features: [
      'Automatic image optimization with Sharp',
      'WebP conversion for smaller file sizes',
      'Maintains aspect ratio',
      'Direct upload to Supabase Storage',
    ],
  });
}
