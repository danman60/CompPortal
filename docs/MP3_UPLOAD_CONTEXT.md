# MP3 Upload Full Context

**Load this file when:** User says "mp3 upload", "music upload", "audio issues"
**Last Updated:** Dec 27, 2025

---

## Current State

| Metric | Value |
|--------|-------|
| Total entries | 4,678 |
| Music uploaded | 0 |
| Code complete | Yes (827 lines router) |
| Bucket | `CompPortalMp3s` |

---

## Architecture Overview

```
Frontend (music-upload/page.tsx: 903 lines)
├── 3-step wizard: Select → Match → Upload
├── Filename matching with confidence scoring
├── Entry number extraction (#123, entry-123)
├── Manual pairing search modal
└── Batch upload (3 parallel)

Backend (music.ts: 827 lines)
├── getMissingMusicByCompetition: Find entries without music
├── getMusicStats: Upload statistics
├── getMP3Url: Signed URL generation (1hr cache)
├── bulkGetMP3Urls: All MP3s for competition
├── updateMP3Duration: Store duration after client extraction
└── sendMissingMusicReminder: Email notifications

Storage (lib/storage.ts: 277 lines)
├── Bucket: compportalmp3s
├── Path: entries/{entryId}/{timestamp}-{filename}
├── Max size: 50MB
├── Formats: MP3, WAV, M4A, AAC
└── Cache control: 3600s
```

---

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/dashboard/music-upload/page.tsx` | 903 | Upload wizard |
| `src/server/routers/music.ts` | 827 | Backend API |
| `src/lib/storage.ts` | 277 | Supabase storage ops |
| `src/lib/mp3-match-utils.ts` | 205 | Filename matching |
| `src/components/MusicUploader.tsx` | 215 | Single file uploader |
| `src/components/MusicUploadForm.tsx` | 128 | Form wrapper |
| `src/app/api/audio/manifest/route.ts` | 200+ | MP3 manifest for offline |

---

## Database Schema

```sql
-- competition_entries columns
music_title           VARCHAR(255)  -- Song title
music_artist          VARCHAR(255)  -- Artist name
music_file_url        TEXT          -- Supabase storage URL
mp3_duration_ms       INT           -- Duration in milliseconds
```

---

## Matching Algorithm (mp3-match-utils.ts)

```
Input: "123 - Jazz Hands FINAL v2.mp3"

1. Strip extension → "123 - Jazz Hands FINAL v2"
2. Remove noise words → "123 Jazz Hands"
   (noise: final, v1, v2, version, mix, edit, master, etc.)
3. Extract entry number → 123
4. Compare to routine titles via Levenshtein distance
5. Add +15 bonus if entry number matches

Confidence Thresholds:
- High: ≥80% similarity
- Medium: 60-79%
- Low: 40-59%
- None: <40%
```

---

## Mutations Reference

| Mutation | Input | Purpose |
|----------|-------|---------|
| `entry.updateMusic` | { entryId, musicFileUrl, musicTitle, musicArtist } | Save upload |
| `music.updateMP3Duration` | { entryId, durationMs } | Store duration |
| `music.sendMissingMusicReminder` | { competitionId, studioId } | Email reminder |
| `music.sendBulkMissingMusicReminders` | { competitionId } | Email all studios |

---

## Queries Reference

| Query | Returns | Purpose |
|-------|---------|---------|
| `music.getMissingMusicByCompetition` | Entries grouped by competition/studio | Find missing |
| `music.getMusicStats` | { total, withMusic, withoutMusic, rate } | Dashboard stats |
| `music.getMP3Url` | Signed URL (1hr expiry) | Single file playback |
| `music.bulkGetMP3Urls` | Array of signed URLs | Bulk download/offline |
| `music.exportMissingMusicCSV` | CSV string | Export report |

---

## Common Issues

### 1. Upload Fails
**Symptom:** File not saving
**Check:**
- Bucket exists and is accessible
- File size < 50MB
- MIME type in allowed list
- storage.ts:43-107

### 2. Matching Wrong Entry
**Symptom:** MP3 matches wrong routine
**Check:**
- Entry number in filename?
- Title similarity score
- mp3-match-utils.ts:133-186

### 3. Duration Not Stored
**Symptom:** mp3_duration_ms is NULL
**Check:**
- Client-side extraction happening?
- updateMP3Duration mutation called?
- music.ts:804-818

### 4. Signed URL Expired
**Symptom:** Audio won't play
**Check:**
- URLs expire after 1 hour
- getMP3Url regenerates on request
- music.ts:571-637

---

## Storage Path Structure

```
compportalmp3s/
└── entries/
    └── {entryId}/
        └── {timestamp}-{sanitizedFilename}.mp3
```

---

## Validation Rules

| Check | Value | Location |
|-------|-------|----------|
| Max file size | 50MB | storage.ts:52 |
| Valid MIME types | audio/mpeg, audio/mp3, audio/wav, audio/m4a, audio/aac | storage.ts:47 |
| Extension check | .mp3, .wav, .m4a, .aac | storage.ts:55 |

---

## Feature Gaps (Not Yet Implemented)

| Feature | Priority | Notes |
|---------|----------|-------|
| Start/end trim points | P1 | music_start_ms, music_end_ms |
| CD preview dashboard | P1 | List all with play button |
| Upload deadline | P1 | Lock after date |
| Volume normalization | P2 | LUFS analysis |
| Fade in/out | P2 | Smooth transitions |
| Duplicate detection | P3 | Audio fingerprinting |
| Offline caching | P3 | Service worker |

---

## Quick Debug

```bash
# Check music router
grep -n "publicProcedure\|protectedProcedure" src/server/routers/music.ts

# Check storage config
grep -n "MUSIC_BUCKET\|competition-music" src/lib/storage.ts

# Check upload handler
grep -n "uploadMusicFile\|music_file_url" src/lib/storage.ts
```

---

## Multi-Tenant Notes

⚠️ **Warning:** music.ts uses `publicProcedure` - no tenant filtering
- Need to add `ctx.tenantId` to queries before production
- Verify Supabase RLS policies on bucket

---

*Created for rapid response to music upload issues*
