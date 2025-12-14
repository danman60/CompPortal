# CompPortal Page Design Principles

**Purpose:** Ensure brand consistency across all pages. Load this before creating or modifying UI.
**Referenced By:** CLAUDE.md
**Last Updated:** December 13, 2025

---

## Quick Reference (Copy-Paste Ready)

### Page Wrapper Template
```tsx
<div className="min-h-screen bg-[#0a0a0a]">
  <div className="container mx-auto px-4 py-8 max-w-7xl">
    {/* Page Header */}
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-white mb-2">Page Title</h1>
      <p className="text-gray-400">Description of this page</p>
    </div>

    {/* Content */}
    {children}
  </div>
</div>
```

### Glass Card Template
```tsx
<div className="glass-card p-6">
  {/* OR manually: */}
  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-lg">
    {/* Card content */}
  </div>
</div>
```

### Primary Button
```tsx
<button className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white px-6 py-3 rounded-lg font-semibold transition-all min-h-[44px]">
  Action
</button>
```

### Secondary Button
```tsx
<button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-lg font-semibold transition-all min-h-[44px]">
  Cancel
</button>
```

---

## 1. Brand Identity - Elite Dark Theme

### Core Principles
- **True Black Background:** `#0a0a0a` (NOT gray-900 or slate-900)
- **Purple Accent:** Primary interactive color (purple-600 → purple-400 gradients)
- **Glassmorphic Cards:** Semi-transparent with backdrop blur
- **High Contrast Text:** White for primary, gray-400 for secondary
- **Subtle Glow Effects:** Purple/blue ambient lighting on key elements

### Color Palette

| Use Case | Color | Tailwind Class |
|----------|-------|----------------|
| Background | `#0a0a0a` | `bg-[#0a0a0a]` |
| Elevated Surface 1 | `#111111` | `bg-[#111111]` |
| Elevated Surface 2 | `#1a1a1a` | `bg-[#1a1a1a]` |
| Card Background | `rgba(255,255,255,0.05)` | `bg-white/5` |
| Card Border | `rgba(255,255,255,0.1)` | `border-white/10` |
| Primary Text | White | `text-white` |
| Secondary Text | Gray-400 | `text-gray-400` |
| Muted Text | Gray-500 | `text-gray-500` |
| Primary Action | Purple-600 | `bg-purple-600` |
| Success | Green-500 | `text-green-500` |
| Warning | Yellow-500 | `text-yellow-500` |
| Error | Red-500 | `text-red-500` |

### FORBIDDEN - Never Use These
- `bg-white` (too bright for dark theme)
- `bg-gray-50`, `bg-gray-100` (light mode colors)
- `text-black` (invisible on dark background)
- Unspecified text colors (will inherit incorrectly)

---

## 2. Typography

### Hierarchy
| Level | Size | Weight | Class |
|-------|------|--------|-------|
| H1 | 2rem-3.5rem (fluid) | Bold (700) | `text-3xl font-bold` |
| H2 | 1.5rem-2.5rem (fluid) | Semibold (600) | `text-2xl font-semibold` |
| H3 | 1.25rem-2rem (fluid) | Semibold (600) | `text-xl font-semibold` |
| Body | 1rem | Normal (400) | `text-base` |
| Small | 0.875rem | Normal (400) | `text-sm` |
| Caption | 0.75rem | Normal (400) | `text-xs` |

### Text Color Rules
- Page titles: `text-white`
- Section headers: `text-white`
- Body text: `text-gray-300`
- Labels: `text-gray-400`
- Placeholders: `placeholder:text-gray-500`
- Disabled: `text-gray-600`

---

## 3. Component Patterns

### Cards (Glassmorphic)
```tsx
// Standard card
<div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-lg hover:bg-white/10 transition-all">
  <h3 className="text-lg font-semibold text-white mb-2">Card Title</h3>
  <p className="text-gray-400">Card description...</p>
</div>

// Elevated card (more prominent)
<div className="bg-[#111111] border border-white/10 rounded-xl p-6 shadow-xl">
  {/* Content */}
</div>

// Interactive card with hover lift
<div className="glass-card hover-lift p-6 cursor-pointer">
  {/* Content */}
</div>
```

### Buttons
```tsx
// Primary action (purple gradient)
<button className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white px-6 py-3 rounded-lg font-semibold transition-all min-h-[44px]">
  Save Changes
</button>

// Secondary action (ghost)
<button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-lg font-semibold transition-all min-h-[44px]">
  Cancel
</button>

// Danger action
<button className="bg-red-600/80 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-all min-h-[44px]">
  Delete
</button>

// Success action
<button className="bg-green-600/80 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all min-h-[44px]">
  Approve
</button>

// Icon button
<button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all min-h-[44px] min-w-[44px]">
  <IconComponent className="w-5 h-5 text-white" />
</button>
```

### Form Inputs
```tsx
// Text input
<input
  type="text"
  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all min-h-[44px]"
  placeholder="Enter value..."
/>

// Select dropdown
<select className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all min-h-[44px]">
  <option value="" className="bg-[#1a1a1a]">Select option...</option>
  <option value="1" className="bg-[#1a1a1a]">Option 1</option>
</select>

// Textarea
<textarea
  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all min-h-[120px]"
  placeholder="Enter description..."
/>

// Checkbox
<label className="flex items-center gap-3 cursor-pointer">
  <input type="checkbox" className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-600 focus:ring-purple-500" />
  <span className="text-gray-300">Checkbox label</span>
</label>
```

### Tables
```tsx
<div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="border-b border-white/10">
        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Column</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-white/5">
      <tr className="hover:bg-white/5 transition-colors">
        <td className="px-6 py-4 text-white">Cell content</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Modals
```tsx
{/* Backdrop */}
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
  {/* Modal */}
  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#111111] border border-white/10 rounded-xl p-6 shadow-2xl z-50">
    <h2 className="text-xl font-semibold text-white mb-4">Modal Title</h2>
    <p className="text-gray-400 mb-6">Modal content...</p>
    <div className="flex justify-end gap-3">
      <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all">Cancel</button>
      <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all">Confirm</button>
    </div>
  </div>
</div>
```

---

## 4. Loading States

### Skeleton Loader
```tsx
<div className="animate-pulse space-y-4">
  <div className="h-8 bg-white/10 rounded w-1/3"></div>
  <div className="h-4 bg-white/10 rounded w-full"></div>
  <div className="h-4 bg-white/10 rounded w-2/3"></div>
</div>
```

### Shimmer Effect
```tsx
<div className="animate-shimmer bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:1000px_100%] h-20 rounded-lg"></div>
```

### Loading Spinner
```tsx
<div className="flex items-center justify-center">
  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
</div>
```

### Full Page Loading
```tsx
<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
  <div className="text-center">
    <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
    <p className="text-gray-400">Loading...</p>
  </div>
</div>
```

---

## 5. Status Indicators

### Status Badges
```tsx
// Success
<span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">Approved</span>

// Warning
<span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">Pending</span>

// Error
<span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full">Rejected</span>

// Info
<span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full">Processing</span>

// Neutral
<span className="px-3 py-1 bg-white/10 text-gray-400 text-sm rounded-full">Draft</span>
```

### Progress Indicators
```tsx
// Progress bar
<div className="h-2 bg-white/10 rounded-full overflow-hidden">
  <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all" style={{ width: '75%' }}></div>
</div>

// Step indicator
<div className="flex items-center gap-2">
  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
  <div className="flex-1 h-1 bg-purple-600"></div>
  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
  <div className="flex-1 h-1 bg-white/20"></div>
  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-gray-500 font-bold">3</div>
</div>
```

---

## 6. Layout Patterns

### Page with Sidebar
```tsx
<div className="min-h-screen bg-[#0a0a0a] flex">
  {/* Sidebar */}
  <aside className="w-64 bg-[#111111] border-r border-white/10 p-4">
    {/* Navigation */}
  </aside>

  {/* Main content */}
  <main className="flex-1 p-8">
    {/* Page content */}
  </main>
</div>
```

### Dashboard Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>
```

### Two-Column Form
```tsx
<form className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div className="space-y-2">
    <label className="text-sm text-gray-400">Field 1</label>
    <input className="..." />
  </div>
  <div className="space-y-2">
    <label className="text-sm text-gray-400">Field 2</label>
    <input className="..." />
  </div>
</form>
```

---

## 7. Animation Guidelines

### Use Built-in Utilities
- `animate-fade-in` - Page/component entrance
- `animate-fadeInUp` - Card stagger animations
- `animate-shimmer` - Skeleton loading
- `animate-pulse` - Subtle loading indication
- `animate-pulse-slow` - Attention states (unpaid invoices)
- `hover-lift` - Hover state with subtle elevation

### Transition Standards
- Button hover: `transition-all` (150ms)
- Color changes: `transition-colors` (200ms)
- Modal entrance: `transition-all duration-300`

### NEVER Use
- Heavy/jarring animations
- Animations longer than 500ms
- Layout-shifting animations during user input

---

## 8. Responsive Breakpoints

| Breakpoint | Width | Use Case |
|------------|-------|----------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small desktops |
| `xl` | 1280px | Standard desktops |
| `2xl` | 1536px | Large monitors |

### Mobile-First Pattern
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* Items */}
</div>
```

---

## 9. Accessibility Requirements (WCAG AAA)

### Touch Targets
- ALL interactive elements: `min-h-[44px] min-w-[44px]`
- Form inputs automatically styled via globals.css

### Focus Indicators
- Keyboard focus: 2px purple outline (automatic via globals.css)
- Never remove focus indicators

### Contrast Ratios
- Primary text (white) on dark: ✓ AAA
- Secondary text (gray-400) on dark: ✓ AA
- Avoid gray-600 for important text

---

## 10. Common Anti-Patterns to Avoid

### 1. Light Mode Colors on Dark Background
```tsx
// WRONG
<div className="bg-white text-black">

// CORRECT
<div className="bg-white/5 text-white">
```

### 2. Missing Text Colors
```tsx
// WRONG - text color not specified
<p>Some text</p>

// CORRECT
<p className="text-gray-300">Some text</p>
```

### 3. Hardcoded Gray Backgrounds
```tsx
// WRONG - Light gray doesn't fit elite theme
<div className="bg-gray-100">

// CORRECT
<div className="bg-white/5">
```

### 4. Non-Gradient Primary Buttons
```tsx
// WRONG - Flat color feels generic
<button className="bg-purple-600">

// CORRECT - Gradient feels premium
<button className="bg-gradient-to-r from-purple-600 to-purple-500">
```

### 5. Missing Loading States
```tsx
// WRONG - Empty space during load
{data && <Component />}

// CORRECT - Show skeleton
{!data ? <Skeleton /> : <Component />}
```

---

## 11. Reference: Existing Well-Designed Pages

Study these for patterns:
- `/dashboard/director-panel/schedule-v2` - Complex interactive UI
- `/dashboard/pipeline-v2` - Table with glassmorphic design
- `/dashboard/invoices` - Card layouts and modals
- Login/Signup pages - Simple form layouts

---

## When to Load This Document

**ALWAYS load before:**
- Creating new pages
- Modifying existing page layouts
- Adding new components
- Fixing UI inconsistencies
- "Generic page" feedback from user

**Referenced from:** CLAUDE.md UI/UX Requirements section

---

*This document ensures all pages match the CompPortal Elite design system.*
