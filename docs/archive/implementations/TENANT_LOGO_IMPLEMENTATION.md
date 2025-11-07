# Tenant Logo Implementation Guide

## Overview

Add tenant-specific competition logos to the main dashboards for both Competition Directors (CD) and Studio Directors (SD).

**Visual Design:**
- **CD Dashboard:** Logo centered between header and Studio Pipeline button (~300px wide)
- **SD Dashboard:** Logo in top-right corner near buttons (~200px wide)

---

## Implementation Steps

### 1. Database Schema Update

**File:** `prisma/schema.prisma`

Update the `tenants` table `branding` JSON field to include logo URL:

```prisma
model tenants {
  // ... existing fields
  branding Json @default("{}")  // Will store: { primaryColor, secondaryColor, logoUrl }
}
```

**Example branding JSON:**
```json
{
  "primaryColor": "#FF1493",
  "secondaryColor": "#EC4899",
  "logoUrl": "/logos/empwr-logo.png"
}
```

**Migration needed:** No schema change required (already JSON field), just update existing data.

---

### 2. Upload Logo Files

**Create directory:** `CompPortal/public/logos/`

**Upload tenant logos:**
- `public/logos/empwr-logo.png` (EMPWR Dance Experience logo)
- `public/logos/glow-logo.png` (Glow Dance Competition logo)

**Recommended specs:**
- Format: PNG with transparency
- Width: 600-800px (will scale down in CSS)
- Aspect ratio: Maintain original (logos will be responsive)

---

### 3. Update Tenant Branding Data

**Using Supabase MCP or SQL:**

```sql
-- Update EMPWR branding
UPDATE tenants
SET branding = jsonb_set(
  branding::jsonb,
  '{logoUrl}',
  '"/logos/empwr-logo.png"'
)
WHERE slug = 'empwr';

-- Update Glow branding
UPDATE tenants
SET branding = jsonb_set(
  branding::jsonb,
  '{logoUrl}',
  '"/logos/glow-logo.png"'
)
WHERE slug = 'glow';
```

**Verify:**
```sql
SELECT slug, branding->>'logoUrl' as logo_url
FROM tenants
WHERE slug IN ('empwr', 'glow');
```

---

### 4. Update Server-Side Dashboard Page

**File:** `src/app/dashboard/page.tsx`

**Around line 54-58** (where branding colors are extracted):

```typescript
// Get branding colors from tenant (defaults to pink/purple for non-admin)
const branding = tenant?.branding as any;
const primaryColor = branding?.primaryColor || '#FF1493';
const secondaryColor = branding?.secondaryColor || '#EC4899';
const logoUrl = branding?.logoUrl || null; // ADD THIS LINE
```

**Pass to components:**

```typescript
// Around line 104-112 (StudioDirectorDashboard)
<StudioDirectorDashboard
  userEmail={user.email || ''}
  firstName={userProfile?.first_name || ''}
  studioName={studioName}
  studioCode={studioCode}
  studioPublicCode={studioPublicCode}
  studioStatus={studioStatus}
  logoUrl={logoUrl}  // ADD THIS
/>

// Around line 114-118 (CompetitionDirectorDashboard)
<CompetitionDirectorDashboard
  userEmail={user.email || ''}
  firstName={userProfile?.first_name || ''}
  role={role as 'competition_director' | 'super_admin'}
  logoUrl={logoUrl}  // ADD THIS
/>
```

---

### 5. Update Competition Director Dashboard Component

**File:** `src/components/CompetitionDirectorDashboard.tsx`

**Update interface (around line 23-27):**

```typescript
interface CompetitionDirectorDashboardProps {
  userEmail: string;
  firstName: string;
  role: 'competition_director' | 'super_admin';
  logoUrl?: string | null;  // ADD THIS
}
```

**Update component signature (around line 127):**

```typescript
export default function CompetitionDirectorDashboard({
  userEmail,
  firstName,
  role,
  logoUrl  // ADD THIS
}: CompetitionDirectorDashboardProps) {
```

**Add centered logo section (after motivational quote, around line 326):**

```tsx
{/* Centered Competition Logo */}
{logoUrl && (
  <div className="text-center my-8">
    <img
      src={logoUrl}
      alt="Competition Logo"
      className="mx-auto max-w-[300px] w-full h-auto"
      style={{
        filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.15))'
      }}
    />
  </div>
)}
```

**Placement:** Between the header section and the "Studio Pipeline" button (for CD role only, not Super Admin).

---

### 6. Update Studio Director Dashboard Component

**File:** `src/components/StudioDirectorDashboard.tsx`

**Update interface (around line 19-26):**

```typescript
interface StudioDirectorDashboardProps {
  userEmail: string;
  firstName: string;
  studioName?: string;
  studioCode?: string | null;
  studioPublicCode?: string | null;
  studioStatus?: string | null;
  logoUrl?: string | null;  // ADD THIS
}
```

**Update component signature (around line 56):**

```typescript
export default function StudioDirectorDashboard({
  userEmail,
  firstName,
  studioName,
  studioCode,
  studioPublicCode,
  studioStatus,
  logoUrl  // ADD THIS
}: StudioDirectorDashboardProps) {
```

**Add top-right logo (in the header section, around line 236-254):**

```tsx
{/* Header */}
<div className="flex-1 relative">
  {/* Top Right Logo */}
  {logoUrl && (
    <div className="absolute top-0 right-0 z-10">
      <img
        src={logoUrl}
        alt="Competition Logo"
        className="max-w-[200px] w-full h-auto"
        style={{
          filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.15))'
        }}
      />
    </div>
  )}

  <h1 className="text-4xl font-bold text-white mb-2">
    {greeting}, {firstName}! 👋
  </h1>
  {/* ... rest of header */}
</div>
```

**Note:** Make sure the parent container has `position: relative` so the absolute positioning works correctly.

---

### 7. CSS Considerations

**Image styling** (applied inline in examples above):
- Use `max-w-[Xpx]` for maximum width
- Use `w-full h-auto` to maintain aspect ratio
- Use `drop-shadow` for subtle glow effect matching tenant colors

**Responsive design:**
- Logos should scale down on mobile (`max-w-[200px] md:max-w-[300px]`)
- SD top-right logo may need adjustment on mobile (consider moving below header)

**Optional: Add to globals.css if consistent styling needed across multiple places:**

```css
.tenant-logo-centered {
  @apply mx-auto max-w-[300px] w-full h-auto;
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.15));
}

.tenant-logo-corner {
  @apply max-w-[200px] w-full h-auto;
  filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.15));
}
```

---

### 8. Testing Protocol

**Test on BOTH tenants using Playwright MCP:**

**EMPWR (empwr.compsync.net):**
1. Login as CD: `empwrdance@gmail.com` / `1CompSyncLogin!`
   - Verify EMPWR logo appears centered below header
   - Check size is appropriate (~300px wide)
   - Verify logo doesn't break layout on mobile

2. Login as SD: `djamusic@gmail.com` / `123456`
   - Verify EMPWR logo appears in top-right corner
   - Check size is appropriate (~200px wide)
   - Verify logo doesn't overlap with buttons

**Glow (glow.compsync.net):**
1. Login as CD: `stefanoalyessia@gmail.com` / `1CompSyncLogin!`
   - Verify Glow logo appears centered below header
   - Check size is appropriate (~300px wide)

2. Login as SD: (need to create test SD account for Glow)
   - Verify Glow logo appears in top-right corner
   - Check size is appropriate (~200px wide)

**Check for issues:**
- Logo doesn't load (404) → Check public/logos/ path
- Logo too large/small → Adjust max-w-[Xpx] values
- Logo overlaps content → Adjust margins/padding
- Logo missing on one tenant → Check branding JSON in database

---

### 9. Fallback Behavior

**If logoUrl is null or missing:**
- Dashboard should render normally without logo
- No broken image placeholders
- No layout shift

**Example:**
```tsx
{logoUrl && (
  <div>
    <img src={logoUrl} alt="Competition Logo" />
  </div>
)}
```

**This ensures:**
- New tenants without logos configured still work
- No errors if logo file is missing
- Gradual rollout possible (add logos tenant by tenant)

---

### 10. Future Enhancements (Optional)

**If more customization needed later:**

1. **Per-tenant logo sizing:**
   ```json
   {
     "logoUrl": "/logos/empwr-logo.png",
     "logoWidthCD": 320,
     "logoWidthSD": 180
   }
   ```

2. **Multiple logo variants:**
   ```json
   {
     "logoUrl": "/logos/empwr-logo.png",
     "logoUrlDark": "/logos/empwr-logo-dark.png",
     "logoUrlLight": "/logos/empwr-logo-light.png"
   }
   ```

3. **Logo positioning options:**
   ```json
   {
     "logoUrl": "/logos/empwr-logo.png",
     "logoPositionCD": "centered",  // or "header"
     "logoPositionSD": "top-right"  // or "header"
   }
   ```

---

## Files Modified Summary

1. **Database:** `tenants` table branding JSON (data update, no migration)
2. **Assets:** `public/logos/empwr-logo.png`, `public/logos/glow-logo.png`
3. **Server Page:** `src/app/dashboard/page.tsx` (pass logoUrl to components)
4. **CD Dashboard:** `src/components/CompetitionDirectorDashboard.tsx` (centered logo)
5. **SD Dashboard:** `src/components/StudioDirectorDashboard.tsx` (top-right logo)

**Estimated effort:** 1-2 hours (including testing on both tenants)

---

## Deployment Checklist

- [ ] Upload logo files to `public/logos/`
- [ ] Update tenant branding JSON in database
- [ ] Update dashboard page to extract logoUrl
- [ ] Update CD dashboard component (interface + JSX)
- [ ] Update SD dashboard component (interface + JSX)
- [ ] Build passes: `npm run build`
- [ ] Test on EMPWR production (CD + SD roles)
- [ ] Test on Glow production (CD + SD roles)
- [ ] Verify mobile responsiveness
- [ ] Deploy to production
- [ ] Verify no broken images in production

---

## Rollback Plan

If issues occur after deployment:

1. **Remove logo from view** (quick fix):
   ```typescript
   // In dashboard/page.tsx, temporarily set:
   const logoUrl = null; // Force hide logos
   ```

2. **Revert branding JSON** (if data corrupt):
   ```sql
   UPDATE tenants
   SET branding = jsonb_set(
     branding::jsonb,
     '{logoUrl}',
     'null'
   )
   WHERE slug IN ('empwr', 'glow');
   ```

3. **Full rollback:** Revert git commits and redeploy previous version

---

**End of Implementation Guide**
