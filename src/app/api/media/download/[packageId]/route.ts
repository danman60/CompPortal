import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantData } from '@/lib/tenant-context';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const tenant = await getTenantData();
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const { packageId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    // Get the media package with all files
    const mediaPackage = await prisma.media_packages.findFirst({
      where: {
        id: packageId,
        tenant_id: tenant.id,
      },
      include: {
        media_photos: true,
        competition_entries: {
          select: {
            title: true,
            entry_number: true,
          },
        },
      },
    });

    if (!mediaPackage) {
      return NextResponse.json({ error: 'Media package not found' }, { status: 404 });
    }

    // Log access
    await prisma.media_access_logs.create({
      data: {
        tenant_id: tenant.id,
        media_package_id: packageId,
        access_type: `download_${type}`,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent'),
      },
    });

    // Collect all URLs to download
    const downloads: { url: string; filename: string }[] = [];
    const routineName = mediaPackage.competition_entries?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'routine';
    const entryNum = mediaPackage.entry_number;

    // Add videos if requested or type is 'all'
    if (type === 'all' || type === 'videos') {
      if (mediaPackage.performance_video_url) {
        downloads.push({
          url: mediaPackage.performance_video_url,
          filename: `${entryNum}_${routineName}_performance.mp4`,
        });
      }
      if (mediaPackage.judge1_video_url) {
        downloads.push({
          url: mediaPackage.judge1_video_url,
          filename: `${entryNum}_${routineName}_judge1.mp4`,
        });
      }
      if (mediaPackage.judge2_video_url) {
        downloads.push({
          url: mediaPackage.judge2_video_url,
          filename: `${entryNum}_${routineName}_judge2.mp4`,
        });
      }
      if (mediaPackage.judge3_video_url) {
        downloads.push({
          url: mediaPackage.judge3_video_url,
          filename: `${entryNum}_${routineName}_judge3.mp4`,
        });
      }
    }

    // Add photos if requested or type is 'all'
    if (type === 'all' || type === 'photos') {
      mediaPackage.media_photos.forEach((photo, index) => {
        downloads.push({
          url: photo.storage_url,
          filename: `${entryNum}_${routineName}_photo_${(index + 1).toString().padStart(2, '0')}.jpg`,
        });
      });
    }

    // Return download manifest for client to handle
    // Client can iterate through and download each file
    return NextResponse.json({
      package_id: packageId,
      entry_number: entryNum,
      routine_name: mediaPackage.competition_entries?.title || 'Unknown',
      total_files: downloads.length,
      downloads,
    });
  } catch (error) {
    console.error('Media download error:', error);
    return NextResponse.json(
      { error: 'An error occurred preparing download' },
      { status: 500 }
    );
  }
}
