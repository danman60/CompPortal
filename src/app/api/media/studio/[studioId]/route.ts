import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantData } from '@/lib/tenant-context';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studioId: string }> }
) {
  try {
    const tenant = await getTenantData();
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const { studioId } = await params;

    // Verify studio belongs to this tenant
    const studio = await prisma.studios.findFirst({
      where: {
        id: studioId,
        tenant_id: tenant.id,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    // Get all dancers belonging to this studio
    const dancers = await prisma.dancers.findMany({
      where: {
        studio_id: studioId,
        tenant_id: tenant.id,
        status: 'active',
      },
      select: {
        id: true,
      },
    });

    const dancerIds = dancers.map(d => d.id);

    if (dancerIds.length === 0) {
      return NextResponse.json({
        studio: { id: studio.id, name: studio.name },
        packages: [],
      });
    }

    // Get all entries that include these dancers
    const entryParticipants = await prisma.entry_participants.findMany({
      where: {
        dancer_id: { in: dancerIds },
        tenant_id: tenant.id,
      },
      select: {
        entry_id: true,
      },
    });

    const entryIds = [...new Set(entryParticipants.map(ep => ep.entry_id))];

    if (entryIds.length === 0) {
      return NextResponse.json({
        studio: { id: studio.id, name: studio.name },
        packages: [],
      });
    }

    // Get media packages for these entries
    const mediaPackages = await prisma.media_packages.findMany({
      where: {
        tenant_id: tenant.id,
        entry_id: { in: entryIds },
      },
      include: {
        media_photos: {
          orderBy: { sort_order: 'asc' },
        },
        competition_entries: {
          select: {
            id: true,
            entry_number: true,
            title: true,
            dancer_names: true,
            competitions: {
              select: {
                name: true,
                competition_start_date: true,
              },
            },
          },
        },
      },
      orderBy: [
        { competition_id: 'desc' },
        { entry_number: 'asc' },
      ],
    });

    // Transform to response format
    const packages = mediaPackages.map((pkg) => ({
      id: pkg.id,
      entry_number: pkg.entry_number,
      routine_title: pkg.competition_entries?.title || 'Unknown Routine',
      dancer_names: pkg.competition_entries?.dancer_names || 'Unknown Dancers',
      competition_name: pkg.competition_entries?.competitions?.name || 'Competition',
      competition_date: pkg.competition_entries?.competitions?.competition_start_date
        ? new Date(pkg.competition_entries.competitions.competition_start_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '',
      status: pkg.status as 'pending' | 'processing' | 'partial' | 'complete',
      performance_video_url: pkg.performance_video_url,
      judge1_video_url: pkg.judge1_video_url,
      judge2_video_url: pkg.judge2_video_url,
      judge3_video_url: pkg.judge3_video_url,
      photo_count: pkg.photo_count || 0,
      photos: pkg.media_photos.map((photo) => ({
        id: photo.id,
        storage_url: photo.storage_url,
        thumbnail_url: photo.thumbnail_url,
        filename: photo.filename,
      })),
    }));

    return NextResponse.json({
      studio: { id: studio.id, name: studio.name },
      packages,
    });
  } catch (error) {
    console.error('Studio media fetch error:', error);
    return NextResponse.json(
      { error: 'An error occurred fetching studio media' },
      { status: 500 }
    );
  }
}
