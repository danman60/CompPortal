# Phase 4: Media/Results Specification

**Last Updated:** December 26, 2025
**Status:** COMPLETE
**Phase:** Phase 4 of 4-phase system (Post-Event Media Distribution)

---

## 1. Overview

Phase 4 provides post-competition media distribution, allowing parents to access performance photos/videos of their dancers, Studio Directors to view all media for their studio's entries, and Competition Directors to manage and upload media packages.

**Core Goals:**
1. Parents can find and download media for their specific dancer
2. Studio Directors can view all media for entries involving their studio's dancers
3. Competition Directors can upload, organize, and publish media packages
4. Multi-tenant isolation ensures data separation between EMPWR and Glow
5. Access logging tracks all media views and downloads

---

## 2. User Roles & Access

### 2.1 Parents (Public Access)

**Authentication:** Name + Date of Birth lookup (no account required)
**Access Location:** `/media` (public portal)

**Capabilities:**
- Search for dancer by first name, last name, and DOB
- View all routines their dancer participated in
- View performance photos and videos
- Download individual photos or entire packages
- Access limited to their specific dancer's entries only

### 2.2 Studio Directors (Authenticated)

**Authentication:** Login required with SD role
**Access Location:** `/dashboard/media`

**Capabilities:**
- View all media packages for entries containing their studio's dancers
- Download media for any of their studio's routines
- View package status (Pending, Processing, Ready, Published)
- No upload capability (CD only)

### 2.3 Competition Directors (Authenticated)

**Authentication:** Login required with CD role
**Access Location:** `/dashboard/director-panel/media`

**Capabilities:**
- Full upload dashboard with drag-and-drop
- Bulk photo upload with automatic thumbnail generation
- Video URL management (performance + 3 judge commentary slots)
- Set package status workflow
- Publish packages to make them visible to parents/SDs
- View access logs and analytics

---

## 3. Data Model

### 3.1 Database Schema

```sql
-- Media packages linked to competition entries
CREATE TABLE media_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  competition_id UUID NOT NULL REFERENCES competitions(id),
  entry_id UUID NOT NULL REFERENCES competition_entries(id),
  entry_number INTEGER,

  -- Status workflow
  status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, ready, published

  -- Video URLs (external hosting like YouTube/Vimeo)
  performance_video_url TEXT,
  judge1_video_url TEXT,
  judge2_video_url TEXT,
  judge3_video_url TEXT,

  -- Counts
  photo_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Individual photos within a package
CREATE TABLE media_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  media_package_id UUID NOT NULL REFERENCES media_packages(id) ON DELETE CASCADE,

  -- Storage paths (Supabase Storage)
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Metadata
  filename VARCHAR(255),
  file_size_bytes BIGINT,
  mime_type VARCHAR(50),
  width INTEGER,
  height INTEGER,
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Access logging for analytics and security
CREATE TABLE media_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  media_package_id UUID NOT NULL REFERENCES media_packages(id),
  dancer_id UUID REFERENCES dancers(id),  -- Only for parent access

  -- Access details
  access_type VARCHAR(30) NOT NULL,  -- parent_view, sd_view, download_all, download_videos, download_photos
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Status Workflow

```
Pending (default)
    ↓ CD starts uploading
Processing
    ↓ Upload complete, ready for review
Ready
    ↓ CD publishes
Published (visible to parents/SDs)
```

**Status Definitions:**
- **Pending:** Package created, no media uploaded yet
- **Processing:** CD is actively uploading media
- **Ready:** All media uploaded, ready for CD review
- **Published:** Live and visible to parents and Studio Directors

---

## 4. API Routes

### 4.1 Public Parent Portal

**`GET /api/media/lookup`**
- Input: `firstName`, `lastName`, `dob` (query params)
- Output: List of matching dancers with their IDs
- Security: DOB acts as verification, no auth required
- Tenant isolation: Filters by current tenant from subdomain

**`GET /api/media/dancer/[dancerId]`**
- Input: Dancer ID from lookup
- Output: All published media packages for entries containing this dancer
- Security: Only returns published packages
- Access logging: Logs `parent_view` for each package returned

### 4.2 Studio Director View

**`GET /api/media/studio/[studioId]`**
- Input: Studio ID from authenticated session
- Output: All media packages for entries with dancers from this studio
- Security: Requires SD role, verified studio ownership
- Access logging: Logs `sd_view` for each package returned

### 4.3 Download Endpoint

**`GET /api/media/download/[packageId]`**
- Input: Package ID + download type (`all`, `photos`, `videos`)
- Output: ZIP file or redirect to video URL
- Security: Verifies access permission (parent via dancer check, SD via studio check)
- Access logging: Logs `download_*` type

### 4.4 CD Upload Dashboard (tRPC)

**`media.getPackages`**
- Returns all packages for current competition
- Includes photo counts and status

**`media.createPackage`**
- Creates new package linked to competition entry
- Auto-populates entry_number

**`media.updatePackage`**
- Updates video URLs and status
- Handles status transitions

**`media.getUploadUrl`**
- Returns signed Supabase Storage URL for direct upload
- Used by frontend for drag-and-drop

**`media.confirmUpload`**
- Called after successful upload
- Triggers thumbnail generation
- Updates photo_count

**`media.deletePhoto`**
- Removes photo from storage and database
- Updates photo_count

**`media.publishPackage`**
- Sets status to 'published'
- Sets published_at timestamp

---

## 5. File Storage

### 5.1 Supabase Storage Configuration

**Bucket:** `media-photos`

**Path Structure:**
```
{tenant_id}/{competition_id}/{package_id}/{filename}
{tenant_id}/{competition_id}/{package_id}/thumbnails/{filename}
```

**Upload Flow:**
1. Frontend requests signed upload URL from `media.getUploadUrl`
2. Frontend uploads directly to Supabase Storage
3. Frontend calls `media.confirmUpload` with file metadata
4. Server generates thumbnail (200x200 WebP) using Sharp library
5. Server stores both URLs in `media_photos` table

### 5.2 Thumbnail Generation

**Specifications:**
- Size: 200x200 pixels
- Format: WebP (for compression)
- Fit: Cover (crops to fill)
- Background: White

**Implementation:**
```typescript
// Thumbnail generation using Sharp
const thumbnail = await sharp(originalBuffer)
  .resize(200, 200, { fit: 'cover', background: { r: 255, g: 255, b: 255 } })
  .webp({ quality: 80 })
  .toBuffer();
```

---

## 6. Access Logging

### 6.1 Access Types

| Access Type | Triggered By | Logged Fields |
|-------------|--------------|---------------|
| `parent_view` | Parent viewing dancer's media | package_id, dancer_id, IP, user-agent |
| `sd_view` | SD viewing studio's media | package_id, IP, user-agent |
| `download_all` | Downloading full package | package_id, dancer_id?, IP, user-agent |
| `download_photos` | Downloading photos only | package_id, dancer_id?, IP, user-agent |
| `download_videos` | Downloading/accessing videos | package_id, dancer_id?, IP, user-agent |

### 6.2 Implementation

```typescript
// Access logging in API routes
await prisma.media_access_logs.createMany({
  data: packages.map((pkg) => ({
    tenant_id: tenant.id,
    media_package_id: pkg.id,
    dancer_id: dancerId,  // For parent access
    access_type: 'parent_view',
    ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  })),
});
```

---

## 7. Multi-Tenant Isolation

### 7.1 Tenant Context

All queries filter by `tenant_id` derived from request subdomain:
- `empwr.compsync.net` → EMPWR tenant
- `glow.compsync.net` → Glow tenant
- `tester.compsync.net` → Test tenant

### 7.2 RLS Policies

Row Level Security ensures:
- Media packages only visible within their tenant
- Photos only accessible within their tenant
- Access logs isolated per tenant

### 7.3 Storage Paths

Tenant ID is first segment of storage path, preventing cross-tenant access even if someone guesses a file path.

---

## 8. UI Components

### 8.1 Parent Media Portal (`/media`)

**Lookup Form:**
- First Name input
- Last Name input
- Date of Birth picker
- Search button

**Results:**
- Dancer name and studio
- List of routines with thumbnails
- Competition name and date
- Download buttons (photos, videos, all)

### 8.2 Studio Director Dashboard (`/dashboard/media`)

**Studio Selector:** (if SD manages multiple studios)

**Package Grid:**
- Entry number and routine title
- Thumbnail preview
- Photo count
- Video availability indicators
- Status badge
- Download button

### 8.3 CD Upload Dashboard (`/dashboard/director-panel/media`)

**Competition Selector:**

**Entry List:**
- All entries for selected competition
- Package status indicator
- Create package button (if none exists)

**Package Editor:**
- Drag-and-drop photo upload zone
- Photo grid with delete buttons
- Video URL inputs (performance + 3 judges)
- Status dropdown
- Publish button

---

## 9. Theming

The media portal supports tenant-specific theming:

```typescript
// Tenant config includes theme colors
const tenantConfig = {
  primaryColor: '#4F46E5',      // Used for buttons, links
  secondaryColor: '#10B981',    // Used for accents
  logoUrl: '/logos/empwr.png',  // Displayed in header
};

// Applied via CSS variables or Tailwind config
```

---

## 10. Decision Log

| Date | Decision | Details |
|------|----------|---------|
| 2025-12-01 | Parent auth | Name + DOB lookup, no account required |
| 2025-12-10 | Video hosting | External URLs (YouTube/Vimeo), not self-hosted |
| 2025-12-15 | Thumbnail size | 200x200 WebP for optimal load time |
| 2025-12-20 | 4 video slots | Performance video + 3 judge commentaries |
| 2025-12-26 | No download limits | Removed from requirements |

---

## 11. Files Inventory

### 11.1 API Routes

| File | Purpose |
|------|---------|
| `src/app/api/media/lookup/route.ts` | Parent dancer lookup |
| `src/app/api/media/dancer/[dancerId]/route.ts` | Parent media fetch |
| `src/app/api/media/studio/[studioId]/route.ts` | SD media fetch |
| `src/app/api/media/download/[packageId]/route.ts` | Download handler |

### 11.2 tRPC Router

| File | Purpose |
|------|---------|
| `src/server/routers/media.ts` | All CD media operations |

### 11.3 UI Components

| File | Purpose |
|------|---------|
| `src/app/media/page.tsx` | Parent portal lookup |
| `src/app/media/[dancerId]/page.tsx` | Parent media dashboard |
| `src/app/dashboard/media/page.tsx` | SD media view |
| `src/app/dashboard/director-panel/media/page.tsx` | CD upload dashboard |

### 11.4 Database

| Table | Purpose |
|-------|---------|
| `media_packages` | Package metadata and status |
| `media_photos` | Individual photo records |
| `media_access_logs` | Access tracking |

---

## 12. Testing Checklist

### 12.1 Parent Portal
- [ ] Dancer lookup returns correct results
- [ ] Only published packages visible
- [ ] Can download photos
- [ ] Can access video URLs
- [ ] Access logged correctly
- [ ] Multi-tenant isolation verified

### 12.2 Studio Director
- [ ] Only sees their studio's packages
- [ ] Can download packages
- [ ] Access logged correctly
- [ ] Multi-tenant isolation verified

### 12.3 CD Upload
- [ ] Can create packages
- [ ] Drag-and-drop upload works
- [ ] Thumbnails generated
- [ ] Video URLs saved
- [ ] Status workflow works
- [ ] Publish makes visible
- [ ] Multi-tenant isolation verified

---

**END OF PHASE 4 SPECIFICATION**

*For Phase 1 implementation, see: `PHASE1_SPEC.md`*
*For Phase 3 (Game Day) specification, see: `GAME_DAY_SPEC.md`*
