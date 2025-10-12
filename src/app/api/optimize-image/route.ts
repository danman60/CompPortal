import { NextRequest, NextResponse } from 'next/server';
import { optimizeImage, getCompressionRatio, formatBytes } from '@/lib/image-optimization';

/**
 * API route for server-side image optimization
 * POST /api/optimize-image
 *
 * Accepts multipart/form-data with image file
 * Returns optimized image as blob
 */
export async function POST(request: NextRequest) {
  try {
    // Get form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are supported.' },
        { status: 400 }
      );
    }

    // Get optimization options from query params
    const searchParams = request.nextUrl.searchParams;
    const maxWidth = parseInt(searchParams.get('maxWidth') || '1920');
    const maxHeight = parseInt(searchParams.get('maxHeight') || '1080');
    const quality = parseInt(searchParams.get('quality') || '80');
    const convertToWebP = searchParams.get('convertToWebP') !== 'false';

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const originalSize = buffer.length;

    // Optimize image
    const optimized = await optimizeImage(buffer, {
      maxWidth,
      maxHeight,
      quality,
      convertToWebP,
    });

    // Calculate compression
    const compressionRatio = getCompressionRatio(originalSize, optimized.size);

    // Return optimized image with metadata in headers
    // Convert Buffer to Uint8Array for Next.js response
    const uint8Array = new Uint8Array(optimized.buffer);

    const response = new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': `image/${optimized.format}`,
        'Content-Length': optimized.size.toString(),
        'X-Original-Size': originalSize.toString(),
        'X-Optimized-Size': optimized.size.toString(),
        'X-Compression-Ratio': compressionRatio.toString(),
        'X-Image-Width': optimized.width.toString(),
        'X-Image-Height': optimized.height.toString(),
        'X-Image-Format': optimized.format,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

    return response;
  } catch (error) {
    console.error('Image optimization API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to optimize image',
        details: error instanceof Error ? error.message : 'Unknown error'
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
    endpoint: '/api/optimize-image',
    method: 'POST',
    accepts: 'multipart/form-data',
    params: {
      maxWidth: 'number (default: 1920)',
      maxHeight: 'number (default: 1080)',
      quality: 'number 1-100 (default: 80)',
      convertToWebP: 'boolean (default: true)',
    },
  });
}
