import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantData } from '@/lib/tenant-context';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dancerId: string }> }
) {
  try {
    const tenant = await getTenantData();
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }
    const { dancerId } = await params;
    const dancer = await prisma.dancers.findFirst({
      where: { id: dancerId, tenant_id: tenant.id, status: 'active' },
      select: { id: true, first_name: true, last_name: true },
    });
    if (!dancer) {
      return NextResponse.json({ error: 'Dancer not found' }, { status: 404 });
    }
    const entries = await prisma.entry_participants.findMany({
      where: { dancer_id: dancerId, tenant_id: tenant.id },
      select: { entry_id: true },
    });
    const entryIds = entries.map((e) => e.entry_id);
    if (entryIds.length === 0) {
      return NextResponse.json({ dancer: { id: dancer.id, first_name: dancer.first_name, last_name: dancer.last_name }, routines: [] });
    }
    const mediaPackages = await prisma.media_packages.findMany({
      where: { tenant_id: tenant.id, entry_id: { in: entryIds } },
      include: {
        media_photos: { orderBy: { sort_order: 'asc' } },
        competition_entries: {
          select: { id: true, entry_number: true, title: true, competitions: { select: { name: true, competition_start_date: true } } },
        },
      },
      orderBy: [{ competition_id: 'desc' }, { entry_number: 'asc' }],
    });
    // Log parent access
    if (mediaPackages.length > 0) {
      await prisma.media_access_logs.createMany({
        data: mediaPackages.map((pkg) => ({
          tenant_id: tenant.id,
          media_package_id: pkg.id,
          dancer_id: dancerId,
          access_type: 'parent_view',
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          user_agent: request.headers.get('user-agent'),
        })),
      });
    }
    const routines = mediaPackages.map((pkg) => ({
      id: pkg.id,
      entry_number: pkg.entry_number,
      routine_title: pkg.competition_entries?.title || 'Unknown Routine',
      competition_name: pkg.competition_entries?.competitions?.name || 'Competition',
      competition_date: pkg.competition_entries?.competitions?.competition_start_date
        ? new Date(pkg.competition_entries.competitions.competition_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '',
      status: pkg.status,
      performance_video_url: pkg.performance_video_url,
      judge1_video_url: pkg.judge1_video_url,
      judge2_video_url: pkg.judge2_video_url,
      judge3_video_url: pkg.judge3_video_url,
      photo_count: pkg.photo_count || 0,
      photos: pkg.media_photos.map((photo) => ({ id: photo.id, storage_url: photo.storage_url, thumbnail_url: photo.thumbnail_url, filename: photo.filename })),
    }));
    return NextResponse.json({ dancer: { id: dancer.id, first_name: dancer.first_name, last_name: dancer.last_name }, routines });
  } catch (error) {
    console.error('Media fetch error:', error);
    return NextResponse.json({ error: 'An error occurred fetching media' }, { status: 500 });
  }
}
