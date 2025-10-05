# CompPortal Icon & Graphic Asset Specifications

**Project**: GlowDance Competition Portal (CompPortal)
**Design System**: Glassmorphic with Purple/Pink/Yellow Gradient Theme
**Generated**: October 4, 2025
**Purpose**: Comprehensive asset list for graphic design and branding consistency

---

## 🎨 Brand Color Palette

### Primary Colors
| Color Name | Hex Code | RGB | Tailwind Class | Usage |
|-----------|----------|-----|----------------|-------|
| **Brand Pink** | `#ec4899` | rgb(236, 72, 153) | `pink-500` | Primary brand color, CTAs, highlights |
| **Brand Purple** | `#a855f7` | rgb(168, 85, 247) | `purple-500` | Secondary brand color, accents |
| **Brand Yellow** | `#eab308` | rgb(234, 179, 8) | `yellow-500` | Accent color, warnings, highlights |

### Background Colors (Dark Theme)
| Color Name | Hex Code | RGB | Tailwind Class | Usage |
|-----------|----------|-----|----------------|-------|
| **Background Dark** | `#0f172a` | rgb(15, 23, 42) | `slate-900` | Primary background |
| **Background Mid** | `#111827` | rgb(17, 24, 39) | `gray-900` | Secondary background |
| **Background Black** | `#000000` | rgb(0, 0, 0) | `black` | Deep background |

### Functional Colors
| Color Name | Hex Code | RGB | Tailwind Class | Usage |
|-----------|----------|-----|----------------|-------|
| **Success Green** | `#10b981` | rgb(16, 185, 129) | `green-500` | Success states, confirmations |
| **Warning Yellow** | `#f59e0b` | rgb(245, 158, 11) | `yellow-500` | Warnings, alerts |
| **Error Red** | `#ef4444` | rgb(239, 68, 68) | `red-500` | Errors, deletions |
| **Info Blue** | `#3b82f6` | rgb(59, 130, 246) | `blue-500` | Information, links |
| **Neutral Gray** | `#6b7280` | rgb(107, 114, 128) | `gray-500` | Disabled, secondary text |

### Glassmorphic Overlays
| Style | CSS | Usage |
|-------|-----|-------|
| **Light Glass** | `bg-white/10 backdrop-blur-md border border-white/20` | Card backgrounds |
| **Dark Glass** | `bg-black/20 backdrop-blur-md border border-white/10` | Modal overlays |
| **Gradient Glass Pink** | `bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-md border border-pink-400/30` | Primary cards |
| **Gradient Glass Blue** | `bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md border border-blue-400/30` | Secondary cards |

---

## 📐 Icon Size Specifications

### Standard Sizes
| Size Name | Pixels | Usage | File Naming |
|-----------|--------|-------|-------------|
| **Tiny** | 16x16 | Inline icons, badges | `icon-name-16.svg` |
| **Small** | 24x24 | List items, buttons | `icon-name-24.svg` |
| **Medium** | 32x32 | Navigation, cards | `icon-name-32.svg` |
| **Large** | 48x48 | Dashboard tiles | `icon-name-48.svg` |
| **XL** | 64x64 | Hero sections, landing | `icon-name-64.svg` |
| **2XL** | 96x96 | Feature highlights | `icon-name-96.svg` |
| **3XL** | 128x128 | App icons, branding | `icon-name-128.svg` |

### Application Icons (Special Sizes)
| Platform | Size | Format | Usage |
|----------|------|--------|-------|
| **Favicon** | 32x32, 16x16 | ICO, PNG | Browser tab icon |
| **Apple Touch Icon** | 180x180 | PNG | iOS home screen |
| **Android Icon** | 192x192, 512x512 | PNG | Android home screen |
| **PWA Icon** | 192x192, 512x512 | PNG | Progressive Web App |
| **OG Image** | 1200x630 | PNG, JPG | Social media sharing |

---

## 🖼️ Required Icon Assets

### 1. **Primary Brand Logo**
**Description**: Main CompPortal logo with sparkle/glow effect

**Variants Needed**:
- **Full Color Logo** (gradient pink-purple-yellow)
  - Sizes: 128x128, 64x64, 48x48, 32x32
  - Formats: SVG (vector), PNG (transparent background)
  - File: `compportal-logo-[size].svg`, `compportal-logo-[size].png`

- **Logo Mark Only** (icon without text)
  - Sizes: 128x128, 64x64, 48x48, 32x32, 16x16
  - Formats: SVG, PNG
  - File: `compportal-mark-[size].svg`, `compportal-mark-[size].png`

- **Logo with Text** (horizontal lockup)
  - Sizes: 512x128, 256x64
  - Formats: SVG, PNG
  - File: `compportal-wordmark-[size].svg`, `compportal-wordmark-[size].png`

- **Monochrome Logo** (white, black)
  - Sizes: 128x128, 64x64, 48x48
  - Formats: SVG, PNG
  - File: `compportal-logo-white-[size].svg`, `compportal-logo-black-[size].svg`

**Design Notes**:
- Current emoji: ✨ (sparkle)
- Should evoke: Dance, performance, energy, competition, glow effects
- Style: Modern, professional, dynamic
- Must work on dark backgrounds (primary use case)
- Suggested elements: Stylized dancer silhouette, spotlight/stage lights, glowing orbs, movement trails

---

### 2. **Navigation & Dashboard Icons**

All icons should be:
- **Style**: Line icons with 2px stroke weight, rounded caps
- **Formats**: SVG (primary), PNG (fallback)
- **Sizes**: 24x24 (default), 32x32 (large), 48x48 (dashboard)
- **Colors**: Single color (white/gray) for default, gradient option for active states

| Icon Name | Current Emoji | Purpose | File Name | Design Notes |
|-----------|---------------|---------|-----------|--------------|
| **Studios** | 🏢 | Studio management | `icon-studios-[size].svg` | Building with dance studio aesthetic, spotlights |
| **Dancers** | 💃 | Dancer database | `icon-dancers-[size].svg` | Stylized dancer silhouette in motion |
| **Entries** | 🎭 | Competition entries | `icon-entries-[size].svg` | Theater masks or performance stage |
| **Reservations** | 📋 | Reservation requests | `icon-reservations-[size].svg` | Calendar with checkmark or ticket stub |
| **Competitions** | 🏆 | Competition events | `icon-competitions-[size].svg` | Trophy or medal with glow effect |
| **Scheduling** | 📅 | Schedule management | `icon-scheduling-[size].svg` | Calendar with time slots |
| **Judges** | 👨‍⚖️ | Judge management | `icon-judges-[size].svg` | Scorecard or judging panel |
| **Scoring** | 💯 | Judge scoring tablet | `icon-scoring-[size].svg` | Score numbers or slider interface |
| **Scoreboard** | 🏆 | Live rankings | `icon-scoreboard-[size].svg` | Leaderboard with podium (1st, 2nd, 3rd) |
| **Analytics** | 📊 | Insights dashboard | `icon-analytics-[size].svg` | Bar chart or line graph |
| **Invoices** | 💰 | Financial tracking | `icon-invoices-[size].svg` | Invoice document or dollar sign |
| **Emails** | 📨 | Email templates | `icon-emails-[size].svg` | Envelope with notification dot |
| **Settings** | ⚙️ | System config | `icon-settings-[size].svg` | Gear or sliders |
| **Music** | 🎵 | Music uploads | `icon-music-[size].svg` | Musical note or waveform |

**Active State Variant**:
- Add `-active` suffix to filename
- Apply gradient overlay: `from-pink-500 to-purple-500`
- Slightly thicker stroke (2.5px vs 2px)

---

### 3. **Status & Indicator Icons**

| Icon Name | Purpose | Sizes | Colors | File Name |
|-----------|---------|-------|--------|-----------|
| **Success Checkmark** | Success states | 16, 24, 32 | Green (#10b981) | `icon-check-[size].svg` |
| **Error X** | Error states | 16, 24, 32 | Red (#ef4444) | `icon-error-[size].svg` |
| **Warning Triangle** | Warnings | 16, 24, 32 | Yellow (#f59e0b) | `icon-warning-[size].svg` |
| **Info Circle** | Information | 16, 24, 32 | Blue (#3b82f6) | `icon-info-[size].svg` |
| **Loading Spinner** | Loading states | 16, 24, 32, 48 | Purple gradient | `icon-loading-[size].svg` |
| **Upload Cloud** | File uploads | 24, 32, 48 | Gray, Pink (active) | `icon-upload-[size].svg` |
| **Download Arrow** | File downloads | 24, 32 | Gray, Blue (active) | `icon-download-[size].svg` |
| **Search Magnifier** | Search fields | 20, 24 | Gray | `icon-search-[size].svg` |
| **Filter Funnel** | Filter controls | 20, 24 | Gray, Purple (active) | `icon-filter-[size].svg` |
| **Sort Arrows** | Sort controls | 16, 20 | Gray | `icon-sort-[size].svg` |

---

### 4. **User Role Badges**

Small badge icons to display user roles:

| Role | Icon Design | Size | Colors | File Name |
|------|-------------|------|--------|-----------|
| **Studio Director** | Building with "SD" initials | 24x24 | Blue gradient | `badge-studio-director-24.svg` |
| **Competition Director** | Trophy with "CD" initials | 24x24 | Purple gradient | `badge-competition-director-24.svg` |
| **Super Admin** | Crown or star with "SA" initials | 24x24 | Pink-yellow gradient | `badge-super-admin-24.svg` |
| **Judge** | Scorecard with "J" initial | 24x24 | Green gradient | `badge-judge-24.svg` |

---

### 5. **Entry Status Icons**

Icons to represent competition entry statuses:

| Status | Icon Design | Size | Color | File Name |
|--------|-------------|------|-------|-----------|
| **Draft** | Pencil or document outline | 20x20 | Gray (#6b7280) | `status-draft-20.svg` |
| **Registered** | Checkmark in circle | 20x20 | Blue (#3b82f6) | `status-registered-20.svg` |
| **Confirmed** | Double checkmark | 20x20 | Green (#10b981) | `status-confirmed-20.svg` |
| **Cancelled** | X in circle | 20x20 | Red (#ef4444) | `status-cancelled-20.svg` |
| **Completed** | Trophy or star | 20x20 | Gold (#eab308) | `status-completed-20.svg` |
| **Music Uploaded** | Musical note with check | 20x20 | Purple (#a855f7) | `status-music-uploaded-20.svg` |
| **Music Missing** | Musical note with X | 20x20 | Orange (#f97316) | `status-music-missing-20.svg` |
| **Late Entry** | Clock or "L" badge | 20x20 | Yellow (#eab308) | `status-late-entry-20.svg` |

---

### 6. **Social Media & Sharing Icons**

| Platform | Size | Style | File Name |
|----------|------|-------|-----------|
| **Facebook** | 24x24, 32x32 | Brand blue (#1877f2) | `social-facebook-[size].svg` |
| **Instagram** | 24x24, 32x32 | Gradient (Instagram colors) | `social-instagram-[size].svg` |
| **Twitter/X** | 24x24, 32x32 | Black/white | `social-twitter-[size].svg` |
| **YouTube** | 24x24, 32x32 | Brand red (#ff0000) | `social-youtube-[size].svg` |
| **TikTok** | 24x24, 32x32 | Brand colors | `social-tiktok-[size].svg` |
| **Email Share** | 24x24, 32x32 | Gray | `social-email-[size].svg` |
| **Copy Link** | 24x24, 32x32 | Gray | `social-link-[size].svg` |

---

### 7. **Illustration Assets**

Larger graphic elements for empty states and onboarding:

| Asset Name | Purpose | Size | Style | File Name |
|------------|---------|------|-------|-----------|
| **Empty Dancers List** | No dancers in database | 256x256 | Minimal line art, purple accent | `illustration-empty-dancers.svg` |
| **Empty Entries List** | No entries created | 256x256 | Minimal line art, pink accent | `illustration-empty-entries.svg` |
| **Empty Schedule** | No scheduled entries | 256x256 | Minimal line art, blue accent | `illustration-empty-schedule.svg` |
| **Upload Success** | File uploaded successfully | 200x200 | Colorful, celebratory | `illustration-upload-success.svg` |
| **Error State** | General error occurred | 200x200 | Gentle, supportive | `illustration-error.svg` |
| **Welcome Studio Director** | Onboarding hero | 400x300 | Dance studio theme | `illustration-welcome-studio.svg` |
| **Welcome Competition Director** | Onboarding hero | 400x300 | Stage/competition theme | `illustration-welcome-director.svg` |

---

## 📦 File Organization Structure

```
/public/
├── icons/
│   ├── brand/
│   │   ├── compportal-logo-128.svg
│   │   ├── compportal-logo-64.svg
│   │   ├── compportal-mark-32.svg
│   │   └── compportal-wordmark-512x128.svg
│   ├── navigation/
│   │   ├── icon-studios-24.svg
│   │   ├── icon-dancers-24.svg
│   │   ├── icon-entries-24.svg
│   │   └── ... (all navigation icons)
│   ├── status/
│   │   ├── icon-check-24.svg
│   │   ├── icon-error-24.svg
│   │   └── ... (all status icons)
│   ├── badges/
│   │   ├── badge-studio-director-24.svg
│   │   └── ... (all role badges)
│   ├── social/
│   │   ├── social-facebook-24.svg
│   │   └── ... (all social icons)
│   └── entry-status/
│       ├── status-draft-20.svg
│       └── ... (all entry status icons)
├── illustrations/
│   ├── illustration-empty-dancers.svg
│   └── ... (all illustrations)
├── favicon.ico
├── apple-touch-icon.png (180x180)
├── android-chrome-192x192.png
└── android-chrome-512x512.png
```

---

## 🎯 Icon Design Guidelines

### General Principles
1. **Consistency**: All icons should follow the same visual language
2. **Simplicity**: Clear at small sizes (16x16 minimum)
3. **Recognition**: Intuitive meaning at a glance
4. **Accessibility**: Minimum 3:1 contrast ratio

### Technical Specifications
- **Format**: SVG as primary, PNG as fallback
- **Stroke Weight**: 2px for line icons
- **Corner Radius**: 2px rounded caps and joins
- **Grid System**: Design on 24x24px grid
- **Padding**: 2px internal padding from edges
- **Export Settings**:
  - SVG: Optimized, remove metadata
  - PNG: Transparent background, no compression artifacts

### Color Usage
- **Default State**: `#9ca3af` (gray-400) for inactive
- **Hover State**: `#ffffff` (white) for hover
- **Active State**: Gradient `from-pink-500 to-purple-500`
- **Disabled State**: `#4b5563` (gray-600) at 50% opacity

### Gradient Application
When applying gradients to icons:
```css
background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

Or for SVG:
```svg
<linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" style="stop-color:#ec4899" />
  <stop offset="50%" style="stop-color:#a855f7" />
  <stop offset="100%" style="stop-color:#eab308" />
</linearGradient>
```

---

## 🌈 Themed Variations

### Light Mode (Future Enhancement)
If implementing light mode in the future:
- Background: White (#ffffff) to gray-50 (#f9fafb)
- Text: gray-900 (#111827) to black (#000000)
- Borders: gray-200 (#e5e7eb)
- Icons: Darker strokes (gray-700 #374151)

### High Contrast Mode (Accessibility)
For users with vision impairments:
- All icons: Solid white or black (no gradients)
- Stroke weight: 2.5px (thicker)
- Background contrast: Minimum 7:1 ratio

---

## 🛠️ Implementation Notes

### React Component Usage
Icons should be implemented as React components for flexibility:

```tsx
// Example: StudioIcon.tsx
export const StudioIcon = ({
  size = 24,
  className = "",
  active = false
}: IconProps) => {
  const gradientClass = active
    ? "text-transparent bg-clip-text bg-gradient-to-br from-pink-500 to-purple-500"
    : "text-gray-400";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`${gradientClass} ${className}`}
    >
      {/* SVG path data */}
    </svg>
  );
};
```

### Tailwind Classes for Consistency
```css
/* Icon container classes */
.icon-sm { @apply w-4 h-4; }        /* 16px */
.icon-base { @apply w-6 h-6; }      /* 24px */
.icon-lg { @apply w-8 h-8; }        /* 32px */
.icon-xl { @apply w-12 h-12; }      /* 48px */

/* Icon gradient utilities */
.icon-gradient-brand {
  @apply bg-gradient-to-br from-pink-500 via-purple-500 to-yellow-500;
}
.icon-gradient-primary {
  @apply bg-gradient-to-br from-pink-500 to-purple-500;
}
```

---

## 📋 Asset Checklist

Use this checklist when creating/updating icon assets:

**For Each Icon**:
- [ ] SVG version created and optimized
- [ ] PNG fallback exported (if needed)
- [ ] All required sizes generated
- [ ] Tested at smallest size (16x16)
- [ ] Accessible color contrast verified
- [ ] File named according to convention
- [ ] Saved to correct directory
- [ ] Added to component library (if applicable)
- [ ] Documented in design system

**Before Production**:
- [ ] All navigation icons complete
- [ ] All status icons complete
- [ ] Brand logo finalized (all variants)
- [ ] Favicon set generated
- [ ] PWA icons created
- [ ] Social sharing images ready
- [ ] Empty state illustrations complete
- [ ] Icon component library updated
- [ ] Storybook/documentation updated

---

## 📚 Resources & References

### Design Tools
- **Figma**: Recommended for icon design
- **Sketch**: Alternative design tool
- **Adobe Illustrator**: For complex illustrations
- **Inkscape**: Free SVG editor

### Icon Libraries (For Inspiration)
- **Heroicons**: https://heroicons.com/ (similar style)
- **Lucide Icons**: https://lucide.dev/ (clean line icons)
- **Phosphor Icons**: https://phosphoricons.com/ (versatile set)
- **Feather Icons**: https://feathericons.com/ (minimalist)

### SVG Optimization
- **SVGO**: Command-line SVG optimizer
- **SVGOMG**: Web-based SVG optimizer (https://jakearchibald.github.io/svgomg/)

### Testing Tools
- **Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Color Blindness Simulator**: https://www.color-blindness.com/coblis-color-blindness-simulator/

---

## 🎨 Example Prompt for AI Image Generation

**For creating the CompPortal brand logo**:

```
Create a modern, professional logo icon for a dance competition management platform called "CompPortal".

Design Requirements:
- Style: Minimalist, geometric, contemporary
- Elements: Stylized dancer silhouette in dynamic motion OR spotlight/stage light beams OR glowing orb with movement trails
- Color Scheme: Gradient from vibrant pink (#ec4899) through purple (#a855f7) to bright yellow (#eab308)
- Shape: Contained within a rounded square (128x128px with 8px corner radius)
- Background: Transparent
- Aesthetic: Professional yet energetic, evoking dance, performance, and competition
- Must work well on dark backgrounds (slate-900/black)
- Should convey: Motion, energy, excellence, prestige

Technical Specs:
- Size: 128x128px
- Format: SVG (vector) or high-res PNG
- No text/typography (icon only)
- Scalable design (must remain clear at 16x16px)
- 2px stroke weight for any line elements

Mood: Dynamic, elegant, prestigious, modern
Avoid: Clipart style, overly complex details, text/letters
```

---

**End of Icon Asset Specifications**
**Total Assets Required**: ~150 individual files
**Priority Order**: Brand logo → Navigation icons → Status icons → Illustrations
**Timeline Estimate**: 2-3 days for complete asset library with professional designer

For questions or clarifications, refer to the live design system at:
https://comp-portal-one.vercel.app/
