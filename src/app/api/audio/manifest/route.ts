import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// Supabase client for generating signed URLs
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface MP3FileManifest {
  entryId: string;
  entryNumber: number;
  routineName: string;
  studioName: string;
  studioCode: string;
  category: string;
  ageGroup: string;
  musicFileUrl: string | null;
  signedUrl: string | null;
  durationMs: number;
  validated: boolean;
  validationError: string | null;
  scheduleSequence: number | null;
}

interface ManifestResponse {
  competitionId: string;
  competitionName: string;
  day: string;
  totalFiles: number;
  filesWithMp3: number;
  filesMissing: number;
  estimatedSizeBytes: number;
  files: MP3FileManifest[];
  generatedAt: string;
}

// Public API for backstage MP3 download - no authentication required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get('competitionId');
    const day = searchParams.get('day'); // Optional: filter by specific day

    // Find target competition
    let targetCompetitionId = competitionId;

    if (!targetCompetitionId) {
      // Get most recent active competition
      const activeCompetition = await prisma.$queryRaw<Array<{ competition_id: string }>>`
        SELECT competition_id FROM live_competition_state
        WHERE competition_state = 'active'
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      if (activeCompetition.length > 0) {
        targetCompetitionId = activeCompetition[0].competition_id;
      } else {
        // Fall back to most recent competition
        const recentComp = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM competitions
          ORDER BY created_at DESC
          LIMIT 1
        `;
        if (recentComp.length > 0) {
          targetCompetitionId = recentComp[0].id;
        }
      }
    }

    if (!targetCompetitionId) {
      return NextResponse.json({
        error: 'No competition found',
        files: [],
        totalFiles: 0,
        filesWithMp3: 0,
        filesMissing: 0,
      }, { status: 404 });
    }

    // Check for operating_date from live_competition_state
    let targetDay = day;
    if (!targetDay) {
      const liveState = await prisma.$queryRaw<Array<{ operating_date: Date | null }>>`
        SELECT operating_date FROM live_competition_state
        WHERE competition_id = ${targetCompetitionId}::uuid
        LIMIT 1
      `;
      if (liveState.length > 0 && liveState[0].operating_date) {
        targetDay = new Date(liveState[0].operating_date).toISOString().split('T')[0];
      }
    }

    // Get competition info
    const competition = await prisma.competitions.findUnique({
      where: { id: targetCompetitionId },
      select: { name: true },
    });

    // Build day filter
    const dayFilter = day ? `AND e.performance_date = '${day}'::date` : '';

    // Get all entries with their MP3 info
    const entries = await prisma.$queryRaw<Array<{
      id: string;
      entry_number: number;
      title: string;
      studio_name: string;
      studio_code: string;
      category: string;
      age_group: string;
      music_file_url: string | null;
      mp3_duration_ms: number | null;
      mp3_validated: boolean | null;
      mp3_validation_error: string | null;
      schedule_sequence: number | null;
      performance_date: Date | null;
    }>>`
      SELECT
        e.id,
        e.entry_number,
        e.title,
        s.name as studio_name,
        COALESCE(s.code, SUBSTRING(s.name, 1, 3)) as studio_code,
        COALESCE(c.name, 'Unknown') as category,
        COALESCE(ag.name, 'Unknown') as age_group,
        e.music_file_url,
        e.mp3_duration_ms,
        COALESCE(e.mp3_validated, false) as mp3_validated,
        e.mp3_validation_error,
        e.schedule_sequence,
        e.performance_date
      FROM competition_entries e
      JOIN studios s ON e.studio_id = s.id
      LEFT JOIN dance_categories c ON e.category_id = c.id
      LEFT JOIN age_groups ag ON e.age_group_id = ag.id
      WHERE e.competition_id = ${targetCompetitionId}::uuid
        AND e.status != 'cancelled'
        ${targetDay ? Prisma.sql`AND e.performance_date = ${targetDay}::date` : Prisma.empty}
      ORDER BY e.performance_date ASC NULLS LAST, e.schedule_sequence ASC NULLS LAST, e.entry_number ASC
    `;

    // Generate signed URLs for files in Supabase Storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const files: MP3FileManifest[] = await Promise.all(
      entries.map(async (entry) => {
        let signedUrl: string | null = null;

        // If there's a music_file_url, try to generate a signed URL
        if (entry.music_file_url) {
          try {
            // Extract the path from the URL (assuming it's a Supabase storage URL)
            const urlPath = entry.music_file_url;

            // Check if it's already a full URL or just a path
            if (urlPath.includes('supabase') || urlPath.startsWith('http')) {
              // Extract bucket and path from full URL
              // Format: https://xxx.supabase.co/storage/v1/object/public/bucket/path
              const match = urlPath.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
              if (match) {
                const [, bucket, path] = match;
                const { data, error } = await supabase.storage
                  .from(bucket)
                  .createSignedUrl(path, 3600); // 1 hour expiry

                if (!error && data?.signedUrl) {
                  signedUrl = data.signedUrl;
                }
              } else {
                // Already a full URL, use as-is
                signedUrl = urlPath;
              }
            } else {
              // Assume it's a path in the 'music' bucket
              const { data, error } = await supabase.storage
                .from('music')
                .createSignedUrl(urlPath, 3600);

              if (!error && data?.signedUrl) {
                signedUrl = data.signedUrl;
              }
            }
          } catch (err) {
            console.error(`Error generating signed URL for entry ${entry.id}:`, err);
          }
        }

        return {
          entryId: entry.id,
          entryNumber: entry.entry_number,
          routineName: entry.title || '',
          studioName: entry.studio_name || '',
          studioCode: entry.studio_code || '',
          category: entry.category || '',
          ageGroup: entry.age_group || '',
          musicFileUrl: entry.music_file_url,
          signedUrl,
          durationMs: entry.mp3_duration_ms || 180000, // Default 3 minutes
          validated: entry.mp3_validated || false,
          validationError: entry.mp3_validation_error,
          scheduleSequence: entry.schedule_sequence,
        };
      })
    );

    const filesWithMp3 = files.filter(f => f.signedUrl !== null).length;
    const filesMissing = files.length - filesWithMp3;

    // Estimate size: average MP3 is ~4MB for 3 minute song at 192kbps
    // 192kbps = 24KB/s, so 180s = 4.3MB
    const estimatedBytesPerMs = 24; // bytes per ms at 192kbps
    const estimatedSizeBytes = files.reduce((sum, f) => {
      if (f.signedUrl) {
        return sum + (f.durationMs * estimatedBytesPerMs / 1000);
      }
      return sum;
    }, 0);

    const response: ManifestResponse = {
      competitionId: targetCompetitionId,
      competitionName: competition?.name || 'Unknown Competition',
      day: targetDay || 'all',
      totalFiles: files.length,
      filesWithMp3,
      filesMissing,
      estimatedSizeBytes: Math.round(estimatedSizeBytes),
      files,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Audio manifest API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio manifest', files: [] },
      { status: 500 }
    );
  }
}
