# MP3 Bulk Upload - Product Requirements Document

**Version:** 1.1
**Date:** December 14, 2025
**Status:** Draft

**Changelog:**
- v1.1 (Dec 14, 2025): Added Phase 5 - Missing MP3 Notification System with CD/SD alerts, automatic reminders, and manual triggers

---

## Executive Summary

This feature enables Studio Directors (SDs) to efficiently upload multiple MP3 music files and link them to their competition entries. The system will intelligently match filenames to entries and provide a streamlined workflow for handling unmatched files.

---

## Design Principles (CompSync App Standards)

This feature must adhere to the established CompSync design language for visual consistency.

### Color Palette

| Usage | Light Mode | Dark Mode | Tailwind Class |
|-------|------------|-----------|----------------|
| Primary Brand | Purple/Violet | Purple/Violet | `bg-purple-600`, `text-purple-600` |
| Primary Hover | Darker purple | Lighter purple | `hover:bg-purple-700` |
| Success | Green | Green | `bg-green-500`, `text-green-600` |
| Warning | Amber/Yellow | Amber | `bg-amber-500`, `text-amber-600` |
| Error | Red | Red | `bg-red-500`, `text-red-600` |
| Background | Gray-50 | Gray-900 | `bg-gray-50 dark:bg-gray-900` |
| Card Surface | White | Gray-800 | `bg-white dark:bg-gray-800` |
| Border | Gray-200 | Gray-700 | `border-gray-200 dark:border-gray-700` |
| Text Primary | Gray-900 | Gray-100 | `text-gray-900 dark:text-gray-100` |
| Text Secondary | Gray-600 | Gray-400 | `text-gray-600 dark:text-gray-400` |

### Typography

| Element | Size | Weight | Class |
|---------|------|--------|-------|
| Page Title | 2xl/3xl | Bold | `text-2xl font-bold` |
| Section Header | xl | Semibold | `text-xl font-semibold` |
| Card Title | lg | Medium | `text-lg font-medium` |
| Body Text | base | Normal | `text-base` |
| Small/Helper | sm | Normal | `text-sm text-gray-500` |
| Entry Number | sm | Medium | `text-sm font-medium text-purple-600` |

### Component Patterns

**Cards:**
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
  {/* Card content */}
</div>
```

**Primary Button:**
```tsx
<button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors">
  Upload Files
</button>
```

**Secondary Button:**
```tsx
<button className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors">
  Cancel
</button>
```

**Ghost Button:**
```tsx
<button className="px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
  Skip
</button>
```

### Layout Principles

1. **Page Container:** Max width with centered content
   ```tsx
   <div className="max-w-6xl mx-auto px-4 py-6">
   ```

2. **Consistent Spacing:** Use Tailwind's spacing scale
   - Between sections: `space-y-6` or `gap-6`
   - Within cards: `p-4` or `p-6`
   - Between list items: `space-y-2`

3. **Responsive Breakpoints:**
   - Mobile-first design
   - `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)

### Icon Usage

Use **Lucide React** icons consistently:
```tsx
import { Upload, Check, AlertTriangle, X, Music, FileAudio } from 'lucide-react';

// Standard icon sizing
<Upload className="h-5 w-5" />           // Default
<Check className="h-4 w-4" />            // Small/inline
<AlertTriangle className="h-6 w-6" />    // Large/emphasized
```

**Icon + Text Pattern:**
```tsx
<button className="flex items-center gap-2">
  <Upload className="h-4 w-4" />
  <span>Upload Files</span>
</button>
```

### Status Indicators

**Match Status Badges:**
```tsx
// Matched (High Confidence)
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
  <Check className="h-3 w-3" /> Matched
</span>

// Needs Review (Low Confidence)
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
  <AlertTriangle className="h-3 w-3" /> Review
</span>

// Unmatched
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
  <X className="h-3 w-3" /> Unmatched
</span>
```

### Progress Indicators

**Progress Bar:**
```tsx
<div className="w-full bg-gray-200 rounded-full h-2">
  <div
    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
    style={{ width: `${percent}%` }}
  />
</div>
```

**Upload Status Row:**
```tsx
<div className="flex items-center justify-between py-2 border-b border-gray-100">
  <div className="flex items-center gap-3">
    <FileAudio className="h-5 w-5 text-gray-400" />
    <span className="text-sm font-medium">filename.mp3</span>
  </div>
  <span className="text-sm text-green-600">Uploaded</span>
</div>
```

### Feedback & Notifications

Use **Sonner toast** for notifications (existing app pattern):
```tsx
import { toast } from 'sonner';

// Success
toast.success('45 files uploaded successfully');

// Error
toast.error('3 files failed to upload');

// With action
toast.warning('Low confidence match detected', {
  action: { label: 'Review', onClick: () => {} }
});
```

### Drag & Drop Zone

```tsx
<div
  className={cn(
    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
    isDragging
      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
      : "border-gray-300 hover:border-gray-400"
  )}
>
  <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
  <p className="text-gray-600">Drag & drop MP3 files here</p>
  <p className="text-sm text-gray-400 mt-1">or</p>
  <button className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg">
    Browse Files
  </button>
</div>
```

### Table Styling

For the file matching list, use consistent table patterns:
```tsx
<table className="w-full">
  <thead className="bg-gray-50 dark:bg-gray-800">
    <tr>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        File
      </th>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Match
      </th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
    {/* rows */}
  </tbody>
</table>
```

### Accessibility Requirements

1. **Focus states:** All interactive elements must have visible focus rings
   ```tsx
   className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
   ```

2. **ARIA labels:** Provide labels for icon-only buttons
   ```tsx
   <button aria-label="Remove file">
     <X className="h-4 w-4" />
   </button>
   ```

3. **Keyboard navigation:** Support Tab, Enter, Space, Escape
4. **Color contrast:** Minimum 4.5:1 ratio for text

### Animation & Transitions

Use subtle, purposeful animations:
```tsx
// Hover transitions
className="transition-colors duration-150"

// Progress animations
className="transition-all duration-300"

// Entry animations (for new items)
className="animate-in fade-in slide-in-from-bottom-2 duration-200"
```

---

## Entry Points & Navigation

**Two ways for SDs to upload music:**

| Method | Location | Use Case |
|--------|----------|----------|
| **Single Upload** | Routine Detail view | Upload/replace music for one entry |
| **Bulk Upload** | Dedicated page at `/dashboard/music-upload` | Upload music for multiple entries at once |

### Routine Detail View (Single Upload)

The existing entry detail panel will include music upload functionality:

**UI Components:**
- "Upload Music" button when no music file exists
- "Replace Music" button when music file already exists
- Current file info display (filename, duration, upload date)
- Audio preview/playback mini-player
- "Remove Music" option to delete existing file

**User Flow:**
1. SD views entry in their entries list
2. Clicks on entry to open detail view
3. Scrolls to "Music" section
4. Clicks "Upload Music" or "Replace Music"
5. File picker opens (single file selection)
6. File validates and uploads immediately
7. Success toast: "Music uploaded for [Entry Title]"
8. Entry detail updates to show file info and playback

**Validation:**
- Same client-side validation as bulk upload (file type, duration)
- Immediate feedback on errors

**Code Location:** Existing `EntryDetailView` component (or similar)

### SD Dashboard Navigation (Bulk Upload)

The bulk upload feature is accessed from the SD dashboard as a dedicated page:

**Dashboard Entry Point:**
```tsx
// In SD Dashboard - new card/link
<Link href="/dashboard/music-upload" className="...">
  <div className="flex items-center gap-3">
    <Music className="h-6 w-6 text-purple-600" />
    <div>
      <h3 className="font-medium">Bulk Music Upload</h3>
      <p className="text-sm text-gray-500">
        Upload music files for multiple entries at once
      </p>
    </div>
  </div>
</Link>
```

**Page Location:** `/dashboard/music-upload` 
**Navigation Context:**
- Breadcrumb: Dashboard → Bulk Music Upload
- Back button returns to dashboard
- "View Entries" link available in summary view

**Access Control:**
- SD role required
- Studio filter applies (can only upload to own studio's entries)
- Tenant isolation enforced

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

### Phase 5: Notification & Reminder System
- Missing MP3 detection for all entries
- CD notifications (studios with missing MP3s summary)
- SD notifications (individual missing MP3 alerts)
- Automatic reminder schedule
- Manual reminder triggers
- Email notification templates

---

## Missing MP3 Notification System

This section defines the notification and reminder system to help ensure all competition entries have their music files uploaded before the competition.

### Overview

| Role | Notification Type | Purpose |
|------|------------------|---------|
| **CD** | Studios Summary | See which studios still have entries missing music files |
| **SD** | Entry List | See exactly which entries need music uploaded |

### Notification Triggers

#### Automatic Triggers (System-Initiated)

| Trigger | Timing | Recipients | Content |
|---------|--------|------------|---------|
| **Competition Created** | 48 hours after competition opens for entries | CDs | "Reminder: Music upload is now available for [Competition Name]" |
| **Entry Deadline Approaching** | 7 days before entry deadline | SDs with missing MP3s | List of entries needing music |
| **Entry Deadline Approaching** | 7 days before entry deadline | CDs | Summary of studios with missing MP3s |
| **48-Hour Warning** | 48 hours before entry deadline | SDs with missing MP3s | URGENT: Entries without music |
| **24-Hour Final Warning** | 24 hours before entry deadline | SDs with missing MP3s | FINAL: Music required for X entries |
| **Post-Deadline Report** | 2 hours after entry deadline | CDs only | Complete missing music report |

#### Manual Triggers (CD-Initiated)

| Action | Available To | Effect |
|--------|--------------|--------|
| **Send Reminder to All Studios** | CD | Emails all SDs with missing MP3s in their studio |
| **Send Reminder to Single Studio** | CD | Emails specific SD with their missing entries list |
| **Download Missing MP3 Report** | CD | Exports CSV/PDF of all entries missing music |
| **Bulk Mark as Exempt** | CD | Mark entries that don't need music (e.g., a cappella) |

### CD Dashboard: Missing Music View

**Location:** `/dashboard/director-panel/music-status` or tab within existing competition view

**UI Components:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Music Status: 2026 Spring Competition                               │
├─────────────────────────────────────────────────────────────────────┤
│  Overview                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │     147      │  │      23      │  │      12      │               │
│  │   Entries    │  │  Missing     │  │   Studios    │               │
│  │   Total      │  │  Music       │  │  Affected    │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
│  [Send Reminder to All ▼]  [Download Report]  [View by Studio]      │
├─────────────────────────────────────────────────────────────────────┤
│  Studios with Missing Music                                          │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Dance Academy Elite                          8 entries missing   ││
│  │ Last reminder: Never                         [Send Reminder]     ││
│  │ Entries: #12, #15, #23, #45, #67, #78, #89, #101               ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Star Performers Studio                       5 entries missing   ││
│  │ Last reminder: Dec 10, 2025                  [Send Reminder]     ││
│  │ Entries: #33, #34, #56, #57, #92                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Rhythm & Motion Dance                        10 entries missing  ││
│  │ Last reminder: Dec 12, 2025                  [Send Reminder]     ││
│  │ Entries: #5, #6, #7, #8, #9, #10, #25, #26, #27, #28            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### SD Dashboard: Missing Music Alert

**Location:** SD Dashboard - prominent alert banner + dedicated section

**Alert Banner (when entries missing music):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ 8 entries are missing music files                                │
│    Upload deadline: December 20, 2025 (5 days remaining)            │
│    [Upload Music Now]  [View Entries]                               │
└─────────────────────────────────────────────────────────────────────┘
```

**Missing Music Section:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Entries Missing Music Files                                         │
├─────────────────────────────────────────────────────────────────────┤
│  Entry #12 - "Firework"              Lyrical / Teen   [Upload]       │
│  Entry #15 - "Don't Stop Believin'"  Jazz / Junior    [Upload]       │
│  Entry #23 - "Swan Lake"             Ballet / Senior  [Upload]       │
│  ...                                                                 │
│                                                                      │
│  [Upload All at Once (Bulk Upload)]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Email Notification Templates

#### Template 1: SD - Missing Music Reminder

**Subject:** Action Required: Music files needed for [Competition Name]

```
Hi [Studio Name],

You have [X] entries in [Competition Name] that still need music files uploaded.

Missing music for:
• #[EntryNum] - [Entry Title] ([Category] / [Age Group])
• #[EntryNum] - [Entry Title] ([Category] / [Age Group])
• ...

⏰ Deadline: [Date] ([X] days remaining)

Upload your music files now:
[Button: Upload Music Files]
[Link: https://app.compsync.net/dashboard/music-upload]

Need help? Reply to this email or contact [CD Name] at [CD Email].

Best regards,
[Competition Name] Team
```

#### Template 2: SD - 48-Hour Warning

**Subject:** ⚠️ URGENT: Music files due in 48 hours for [Competition Name]

```
Hi [Studio Name],

This is an urgent reminder that music files are due in 48 hours.

You still have [X] entries without music:
• #[EntryNum] - [Entry Title]
• #[EntryNum] - [Entry Title]
• ...

⏰ Deadline: [Date] at [Time]

Entries without music may not be able to perform at the competition.

[Button: Upload Music Now]

— [Competition Name] Team
```

#### Template 3: CD - Studios Summary Report

**Subject:** Music Upload Status: [Competition Name]

```
Hi [CD Name],

Here's your weekly music upload status for [Competition Name]:

📊 Overview:
• Total entries: [X]
• With music: [Y] ✓
• Missing music: [Z] ⚠️
• Studios affected: [N]

Studios needing music uploads:
1. [Studio Name] - [X] entries missing
2. [Studio Name] - [X] entries missing
3. [Studio Name] - [X] entries missing

[Button: View Full Report]
[Button: Send Reminders to All]

— CompSync
```

#### Template 4: CD - Post-Deadline Report

**Subject:** Final Music Upload Report: [Competition Name]

```
Hi [CD Name],

The entry deadline has passed. Here's the final music upload status:

✅ Complete: [X] entries have music files
⚠️ Incomplete: [Y] entries missing music

Entries without music:
[Table: Entry #, Title, Studio, Category]

Options:
1. Contact studios directly for missing files
2. Mark entries as exempt (a cappella, etc.)
3. Request music at check-in

[Button: Download Full Report]
[Button: Send Final Notice to Studios]

— CompSync
```

### Database Schema Additions

```sql
-- Track notification history
CREATE TABLE mp3_reminder_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  studio_id UUID REFERENCES studios(id),  -- NULL for CD-targeted notifications
  user_id UUID REFERENCES auth.users(id),
  notification_type VARCHAR(50) NOT NULL,
    -- 'automatic_7day', 'automatic_48hour', 'automatic_24hour',
    -- 'manual_single', 'manual_bulk', 'post_deadline'
  entries_missing INT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  email_id VARCHAR(100),  -- From email service for tracking
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

-- Track entries exempt from music requirement
ALTER TABLE competition_entries ADD COLUMN
  music_exempt BOOLEAN DEFAULT FALSE,
  music_exempt_reason VARCHAR(100);  -- 'a_cappella', 'cd_approved', etc.
```

### API Endpoints

```typescript
// Get missing music summary for CD
musicNotification.getMissingMusicSummary: {
  input: { competitionId: string }
  output: {
    totalEntries: number;
    withMusic: number;
    missingMusic: number;
    studioBreakdown: Array<{
      studioId: string;
      studioName: string;
      missingCount: number;
      entryNumbers: number[];
      lastReminderAt: Date | null;
    }>;
  }
}

// Send reminder to single studio
musicNotification.sendStudioReminder: {
  input: { competitionId: string; studioId: string }
  output: { success: boolean; emailId: string }
}

// Send reminders to all studios with missing MP3s
musicNotification.sendBulkReminders: {
  input: { competitionId: string }
  output: {
    sent: number;
    failed: number;
    studioResults: Array<{ studioId: string; success: boolean; error?: string }>
  }
}

// Mark entries as music exempt
musicNotification.markExempt: {
  input: {
    entryIds: string[];
    exempt: boolean;
    reason?: string
  }
  output: { updated: number }
}

// Get notification history
musicNotification.getReminderHistory: {
  input: { competitionId: string; studioId?: string }
  output: Array<{
    id: string;
    type: string;
    sentAt: Date;
    entriesMissing: number;
    opened: boolean;
    clicked: boolean;
  }>
}
```

### Automatic Reminder Configuration

**Competition Settings Addition:**

```typescript
// In competition_settings table or competition record
{
  musicReminderEnabled: boolean;  // Toggle automatic reminders on/off
  musicReminderSchedule: {
    sevenDayReminder: boolean;    // 7 days before deadline
    fortyEightHourReminder: boolean;  // 48 hours before
    twentyFourHourReminder: boolean;  // 24 hours before
    postDeadlineReport: boolean;  // Report after deadline
  };
  musicDeadlineOffset: number;    // Hours before entry deadline (default: 0)
}
```

**CD Configuration UI:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Automatic Music Reminders                                           │
├─────────────────────────────────────────────────────────────────────┤
│  ☑ Enable automatic reminders for missing music                     │
│                                                                      │
│  Schedule:                                                          │
│  ☑ 7 days before deadline - Friendly reminder                       │
│  ☑ 48 hours before deadline - Urgent warning                        │
│  ☑ 24 hours before deadline - Final notice                          │
│  ☑ Send me a report after deadline                                  │
│                                                                      │
│  Music deadline: ○ Same as entry deadline                           │
│                  ○ [X] hours before entry deadline                  │
│                                                                      │
│  [Save Settings]                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Cron Job Schedule

```typescript
// Scheduled tasks for automatic reminders
// Run daily at 9:00 AM in competition's timezone

async function processMusicReminders() {
  const competitions = await getActiveCompetitions();

  for (const comp of competitions) {
    const daysUntilDeadline = getDaysUntil(comp.entryDeadline);
    const settings = comp.musicReminderSettings;

    // 7-day reminder
    if (daysUntilDeadline === 7 && settings.sevenDayReminder) {
      await sendMissingMusicReminders(comp.id, 'automatic_7day');
    }

    // 48-hour reminder
    if (daysUntilDeadline === 2 && settings.fortyEightHourReminder) {
      await sendMissingMusicReminders(comp.id, 'automatic_48hour');
    }

    // 24-hour reminder
    if (daysUntilDeadline === 1 && settings.twentyFourHourReminder) {
      await sendMissingMusicReminders(comp.id, 'automatic_24hour');
    }

    // Post-deadline report (2 hours after)
    if (daysUntilDeadline === -1 && settings.postDeadlineReport) {
      await sendPostDeadlineReport(comp.id);
    }
  }
}
```

### Success Metrics for Notification System

1. **Reminder Effectiveness:** 50%+ of studios upload after receiving first reminder
2. **Email Engagement:** 60%+ open rate, 40%+ click rate on reminder emails
3. **Missing Music Reduction:** <5% of entries missing music at deadline
4. **CD Time Savings:** Reduce manual follow-up time by 80%

### Edge Cases & Handling

| Scenario | Handling |
|----------|----------|
| Studio has no email | Show warning to CD, skip email, log attempt |
| Entry marked as exempt then re-enabled | Clear exempt status when music uploaded |
| Competition deadline extended | Recalculate reminder schedule |
| SD uploads after reminder sent | Track in analytics, don't send duplicate |
| Studio has 0 entries | Skip from reminder list |
| All entries have music | Show success badge, no reminders |

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
