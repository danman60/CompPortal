# MP3 Bulk Upload - Product Requirements Document

**Version:** 1.0
**Date:** December 13, 2025
**Status:** Draft

---

## Executive Summary

This feature enables Studio Directors (SDs) to efficiently upload multiple MP3 music files and link them to their competition entries. The system will intelligently match filenames to entries and provide a streamlined workflow for handling unmatched files.

---

## Problem Statement

Currently, SDs must upload music files one at a time for each entry. For studios with 50+ entries, this is extremely time-consuming. Additionally, there's no validation to ensure uploaded files meet competition technical requirements.

---

## User Stories

### Primary User: Studio Director (SD)

1. **As an SD**, I want to select multiple MP3 files at once so I can save time uploading music for all my entries.

2. **As an SD**, I want the system to automatically match my MP3 files to my entries based on filename so I don't have to manually pair each one.

3. **As an SD**, I want to manually pair any unmatched files to entries so I can handle edge cases.

4. **As an SD**, I want to be notified if my MP3 files have technical issues (silence, corruption, audio quality) so I can fix them before the competition.

5. **As an SD**, I want to see upload progress and success/failure status for each file so I know what needs attention.

---

## Feature Requirements

### 1. Multi-File Selection Interface

**Location:** New page at `/dashboard/music-upload` (SD access)

**UI Components:**
- Drag-and-drop zone for files
- "Browse files" button for file picker
- Support for selecting multiple files (no limit)
- Display selected files with filename, size, duration preview

**Acceptance Criteria:**
- [ ] Can select 100+ files at once
- [ ] Shows file list before upload begins
- [ ] Can remove individual files from selection
- [ ] Displays total file count and estimated upload size

---

### 2. Intelligent Filename-to-Entry Matching

**Matching Algorithm Priority:**
1. **Exact entry number match:** `#123.mp3` or `123.mp3` or `Entry 123.mp3`
2. **Routine title match:** `Firework.mp3` matches entry titled "Firework"
3. **Fuzzy title match:** `Fire Work.mp3` matches "Firework" (case-insensitive, ignore spaces/punctuation)
4. **Entry number + title combo:** `123 - Firework.mp3`

**Filename Patterns Supported:**
```
#123.mp3
123.mp3
Entry 123.mp3
Entry_123.mp3
123 - Firework.mp3
123_Firework.mp3
Firework.mp3
Firework (Lyrical).mp3
My Studio - Firework - Junior.mp3
```

**Match Display:**
| Status | Description |
|--------|-------------|
| Matched (High Confidence) | Exact entry number or title match |
| Matched (Low Confidence) | Fuzzy match, needs review |
| Unmatched | No match found, requires manual pairing |

**Acceptance Criteria:**
- [ ] Algorithm matches files to correct entries with 90%+ accuracy for well-named files
- [ ] Shows confidence level for each match
- [ ] Allows SD to approve/reject suggested matches
- [ ] Displays entry details (title, category, age group) next to matched files

---

### 3. Manual Pairing Interface

**UI Components:**
- List of unmatched files on the left
- Searchable/filterable entry list on the right
- Drag-and-drop or click-to-pair functionality
- Clear visual indication of paired items

**Features:**
- Search entries by title, entry number, or dancer name
- Filter entries by category, age group
- Show only entries without music files
- Bulk actions: "Skip all unmatched" or "Match similar names"

**Acceptance Criteria:**
- [ ] Can pair any file to any of the studio's entries
- [ ] Shows entries that already have music (with option to replace)
- [ ] Can unpair files before upload
- [ ] Keyboard navigation support for power users

---

### 4. MP3 Validation & Quality Checks

**Client-Side Validation (Before Upload):**
| Check | Requirement | User Message |
|-------|-------------|--------------|
| File Type | Must be MP3 | "Only MP3 files are supported" |
| Readable | Must be valid MP3 | "File appears corrupted" |
| Duration | 30 seconds - 10 minutes | "File duration must be 30s-10min" |

**Server-Side Validation (After Upload):**
| Check | Requirement | User Message |
|-------|-------------|--------------|
| Silence Detection | Max 30 consecutive seconds of silence | "Warning: Long silence detected at [timestamp]" |
| Audio Corruption | File must decode without errors | "File may be corrupted - playback issues detected" |
| Channel Detection | Stereo (2-channel) preferred | "Warning: Mono audio detected - stereo recommended" |
| Bitrate | Minimum 128kbps recommended | "Warning: Low audio quality (bitrate: Xkbps)" |

**Validation Display:**
- Green checkmark: All checks passed
- Yellow warning: Minor issues (mono, low bitrate)
- Red error: Critical issues (corruption, excessive silence)

**Acceptance Criteria:**
- [ ] Client-side checks complete within 2 seconds per file
- [ ] Server-side checks complete within 10 seconds per file
- [ ] Detailed error messages with timestamps for silence/corruption
- [ ] Option to proceed with warnings (not errors)

---

### 5. Bulk Upload & Progress Tracking

**Upload Process:**
1. Files validated client-side
2. Files uploaded in parallel (configurable concurrency)
3. Server validates and processes each file
4. Entry records updated with music URLs
5. Duration extracted and stored

**Progress UI:**
```
Uploading: 45 of 67 files
[====================----------] 67%

File                          Status
#101 - Firework.mp3           Uploaded
#102 - Solo Dance.mp3         Uploading... 75%
#103 - Group Number.mp3       Queued
#104 - Bad File.mp3           Failed: Corrupted file
```

**Features:**
- Real-time progress bar
- Individual file status
- Retry failed uploads
- Cancel remaining uploads
- Background upload (can navigate away)

**Acceptance Criteria:**
- [ ] No upload file size limit (handle large files gracefully)
- [ ] Concurrent uploads (3-5 files simultaneously)
- [ ] Resume interrupted uploads where possible
- [ ] Clear success/failure summary at completion

---

### 6. Post-Upload Summary

**Summary Display:**
- Total files processed
- Successful uploads count
- Failed uploads with reasons
- Warnings issued
- Links to entries for each uploaded file

**Actions:**
- "Upload More" - return to upload interface
- "View Entries" - go to entries page
- "Fix Issues" - filter to entries with problems

---

## Technical Architecture

### Database Changes

None required - uses existing fields:
- `competition_entries.music_file_url` - Supabase storage URL
- `competition_entries.mp3_duration_ms` - Duration in milliseconds
- `competition_entries.mp3_validated` - Boolean
- `competition_entries.mp3_validation_error` - Error message

### API Endpoints

**New tRPC Procedures:**

```typescript
// Get entries for matching
musicUpload.getEntriesToMatch: {
  input: { competitionId: string }
  output: Array<{
    id: string;
    entryNumber: number;
    title: string;
    category: string;
    ageGroup: string;
    hasMusicFile: boolean;
  }>
}

// Validate MP3 (server-side)
musicUpload.validateMp3: {
  input: { fileUrl: string }
  output: {
    valid: boolean;
    durationMs: number;
    bitrate: number;
    channels: number;
    silenceWarnings: Array<{ startMs: number; endMs: number }>;
    errors: string[];
    warnings: string[];
  }
}

// Link MP3 to entry
musicUpload.linkMp3ToEntry: {
  input: {
    entryId: string;
    fileUrl: string;
    durationMs: number;
    validationResult: ValidationResult;
  }
  output: { success: boolean }
}
```

### Storage

- Bucket: `music` (existing)
- Path: `{tenant_id}/{competition_id}/{entry_id}/{filename}`
- Signed URLs for playback

### Dependencies

- `music-metadata` npm package for MP3 parsing
- Client-side Web Audio API for preview
- ffprobe/ffmpeg for server-side validation (optional)

---

## UI Mockups

### Step 1: File Selection
```
┌─────────────────────────────────────────────────────────────┐
│                    Upload Music Files                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │     Drag & drop MP3 files here                       │   │
│  │              or                                       │   │
│  │        [Browse Files]                                │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Selected: 0 files (0 MB)                                   │
│                                                             │
│                              [Continue to Matching →]       │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Matching Review
```
┌─────────────────────────────────────────────────────────────┐
│                    Review Matches                            │
├─────────────────────────────────────────────────────────────┤
│  Matched: 45/50  │  Needs Review: 3  │  Unmatched: 2        │
├─────────────────────────────────────────────────────────────┤
│  ✓ 101 - Firework.mp3      →  #101 Firework (Lyrical)      │
│  ✓ 102 - Solo.mp3          →  #102 Solo Dance              │
│  ⚠ Fire Work.mp3           →  #103 Firework? [Confirm]     │
│  ✗ Random Name.mp3         →  [Select Entry ▼]             │
│  ✓ 104.mp3                 →  #104 Group Number            │
│  ...                                                        │
├─────────────────────────────────────────────────────────────┤
│  [← Back]                        [Upload 48 Files →]        │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Upload Progress
```
┌─────────────────────────────────────────────────────────────┐
│                    Uploading Files                           │
├─────────────────────────────────────────────────────────────┤
│  Progress: 23 of 48 files                                   │
│  [████████████████░░░░░░░░░░░░░░░░░░] 48%                   │
│                                                             │
│  Currently uploading:                                       │
│  • 105 - Jazz.mp3 (2.3 MB / 4.5 MB)                        │
│  • 106 - Tap.mp3 (1.1 MB / 3.2 MB)                         │
│  • 107 - Ballet.mp3 (0.5 MB / 5.1 MB)                      │
│                                                             │
│  Completed: 20  │  Failed: 3  │  Queued: 22                 │
├─────────────────────────────────────────────────────────────┤
│                                   [Cancel Remaining]        │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

1. **Upload Speed:** 95% of uploads complete within 30 seconds
2. **Match Accuracy:** 90%+ automatic match rate for well-named files
3. **Error Detection:** Catch 100% of corrupted files
4. **User Adoption:** 80%+ of SDs use bulk upload vs single file upload

---

## Implementation Phases

### Phase 1: Core Upload (MVP)
- Multi-file selection
- Basic filename matching (entry number only)
- Sequential upload with progress
- Duration extraction
- Basic validation (file type, size)

### Phase 2: Enhanced Matching
- Fuzzy title matching
- Manual pairing interface
- Confidence indicators
- Search/filter entries

### Phase 3: Advanced Validation
- Silence detection
- Corruption detection
- Channel detection
- Bitrate warnings

### Phase 4: Polish
- Background upload
- Resume interrupted uploads
- Batch operations
- Keyboard shortcuts

---

## Security Considerations

1. **File Type Validation:** Verify MIME type, not just extension
2. **Size Limits:** While no hard limit, implement streaming for large files
3. **Tenant Isolation:** Files stored in tenant-specific paths
4. **Malware Scanning:** Consider integrating virus scanning
5. **Access Control:** Only SDs can upload for their entries

---

## Open Questions

1. Should we allow WAV/FLAC uploads and convert to MP3?
2. What is the maximum acceptable file duration?
3. Should we preview audio before upload?
4. Should we store multiple versions (original + normalized)?

---

## Appendix: Filename Parsing Regex

```javascript
// Entry number patterns
const entryNumberPatterns = [
  /^#?(\d+)/,                    // #123 or 123 at start
  /entry[_\s-]*(\d+)/i,          // Entry 123, Entry_123
  /^(\d+)\s*[-_]\s*/,            // 123 - Title
];

// Title extraction (after entry number removal)
const extractTitle = (filename) => {
  let title = filename
    .replace(/\.(mp3|wav|m4a)$/i, '')  // Remove extension
    .replace(/^#?\d+\s*[-_]?\s*/, '')   // Remove entry number
    .replace(/[-_]/g, ' ')              // Normalize separators
    .trim();
  return title;
};
```

---

*Document prepared for CompSync platform - Phase 2 features*
