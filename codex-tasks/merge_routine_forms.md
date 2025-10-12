# Task: Merge Routine Creation Forms into Single Screen

**Priority**: MEDIUM (Workflow Redesign)
**Estimate**: 2-3 hours
**Status**: Ready for Codex

---

## Context

Currently, routine creation has multiple separate screens (Basic + Details + Props). User feedback requests a single unified "Routine Info" screen for smoother UX with fewer clicks.

**Current Flow**: Multi-step form with separate pages
**New Flow**: Single unified form with all fields

---

## Files to Modify

Primary file: `src/app/dashboard/entries/create/page.tsx` or similar
Alternative: `src/components/EntryForm.tsx` (if form is componentized)

---

## Current State Analysis

**Step 1: Find the routine creation form**
```bash
# Search for routine/entry creation form
grep -r "Create Routine\|Create Entry\|EntryForm" src/app/dashboard/entries/
```

**Likely locations:**
- `src/app/dashboard/entries/create/page.tsx`
- `src/components/EntryForm.tsx`
- `src/components/CreateRoutineModal.tsx`

---

## Required Fields (Unified Form)

Combine ALL these fields into one screen:

### Basic Info
- **Routine Name** (text input, required)
- **Choreographer** (text input, optional)
- **Studio** (dropdown, auto-filled and locked for Studio Directors)
- **Competition** (dropdown, required)

### Classification
- **Dance Category** (dropdown with auto-suggest)
  - Options: Ballet, Contemporary, Jazz, Tap, Hip Hop, Lyrical, etc.
- **Classification** (dropdown, required)
  - Options: Solo, Duo/Trio, Small Group, Large Group, Production
- **Age Group** (will be auto-calculated, but allow manual override)

### Additional Details
- **Props** (textarea, optional)
  - Description of any props used
- **Title Routine** (checkbox, optional)
  - Mark as studio's signature routine

### Hidden/Auto Fields
- **Music** - Handle separately (existing music upload flow)
- **Status** - Auto-set to 'draft'
- **Dancers** - Assigned in Step 2 (keep separate)

---

## Implementation Steps

### Step 1: Read Current Implementation

**Files to read:**
- Entry creation form/page
- Entry form component (if exists)
- Existing form validation schema

### Step 2: Redesign Form Layout

**Recommended Structure:**
```tsx
<form onSubmit={handleSubmit}>
  {/* Section 1: Basic Info */}
  <div className="bg-white/5 rounded-xl p-6 mb-6">
    <h3 className="text-xl font-semibold text-white mb-4">📝 Basic Information</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label>Routine Name *</label>
        <input type="text" name="routine_title" required />
      </div>
      <div>
        <label>Choreographer</label>
        <input type="text" name="choreographer" />
      </div>
      <div>
        <label>Competition *</label>
        <select name="competition_id" required>
          {/* Competition options */}
        </select>
      </div>
      <div>
        <label>Studio</label>
        <input type="text" value={studioName} disabled />
      </div>
    </div>
  </div>

  {/* Section 2: Classification */}
  <div className="bg-white/5 rounded-xl p-6 mb-6">
    <h3 className="text-xl font-semibold text-white mb-4">🎭 Classification</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label>Dance Category *</label>
        <select name="dance_category" required>
          <option value="">Select category...</option>
          <option value="Ballet">Ballet</option>
          <option value="Contemporary">Contemporary</option>
          <option value="Jazz">Jazz</option>
          <option value="Tap">Tap</option>
          <option value="Hip Hop">Hip Hop</option>
          <option value="Lyrical">Lyrical</option>
          <option value="Musical Theatre">Musical Theatre</option>
          <option value="Acro">Acro</option>
        </select>
      </div>
      <div>
        <label>Classification *</label>
        <select name="classification" required>
          <option value="">Select classification...</option>
          <option value="Solo">Solo</option>
          <option value="Duo/Trio">Duo/Trio</option>
          <option value="Small Group">Small Group (4-9)</option>
          <option value="Large Group">Large Group (10+)</option>
          <option value="Production">Production</option>
        </select>
      </div>
    </div>
  </div>

  {/* Section 3: Additional Details */}
  <div className="bg-white/5 rounded-xl p-6 mb-6">
    <h3 className="text-xl font-semibold text-white mb-4">✨ Additional Details</h3>
    <div className="space-y-4">
      <div>
        <label>Props</label>
        <textarea
          name="props"
          rows={3}
          placeholder="Describe any props used in this routine..."
          className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white"
        />
      </div>
      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_title_routine" />
          <span>Mark as Title Routine (signature piece)</span>
        </label>
      </div>
    </div>
  </div>

  {/* Submit */}
  <div className="flex gap-3">
    <button type="button" onClick={() => router.back()}>Cancel</button>
    <button type="submit">Create Routine & Add Dancers →</button>
  </div>
</form>
```

### Step 3: Update Form Validation

**Zod Schema:**
```typescript
const routineSchema = z.object({
  routine_title: z.string().min(1, "Routine name is required"),
  choreographer: z.string().optional(),
  competition_id: z.string().uuid(),
  studio_id: z.string().uuid(),
  dance_category: z.string().min(1, "Dance category is required"),
  classification: z.string().min(1, "Classification is required"),
  props: z.string().optional(),
  is_title_routine: z.boolean().optional()
});
```

### Step 4: Remove Multi-Step Logic

**Remove:**
- Step indicators (1/2/3)
- "Next" / "Previous" buttons
- Step state management
- Separate step components

**Keep:**
- Form validation
- Submit handler
- Navigation to dancer assignment after creation

---

## After Creation Flow

**After "Create Routine" button:**
1. Create routine with status='draft'
2. Redirect to `/dashboard/entries/[id]/assign` (dancer assignment)
3. Allow dancer assignment (existing flow)

---

## Design Requirements

### Glassmorphic Sections
- Use `bg-white/5` for section backgrounds
- Each section has heading with emoji
- Responsive grid layout (2 columns on desktop, 1 on mobile)

### Form Controls
```css
/* Input fields */
bg-white/5 border border-white/20 rounded-lg text-white
placeholder-gray-400 focus:ring-2 focus:ring-purple-500

/* Dropdowns */
bg-white/5 border border-white/20 rounded-lg text-white
[option selected should show white background in dropdown]

/* Buttons */
Primary: bg-gradient-to-r from-purple-500 to-pink-500
Secondary: bg-white/10 border border-white/20
```

### Accessibility
- All form fields have labels
- Required fields marked with *
- Error messages displayed below fields
- Focus states visible

---

## Quality Gates

1. ✅ **All fields present**: Name, choreographer, category, classification, props, title checkbox
2. ✅ **Single screen**: No multi-step navigation
3. ✅ **Validation works**: Required fields enforced
4. ✅ **TypeScript compiles**: No errors
5. ✅ **Mobile responsive**: Forms stack on small screens
6. ✅ **Glassmorphic styling**: Matches existing design system
7. ✅ **Creates routine successfully**: Test submission
8. ✅ **Redirects to dancer assignment**: After creation

---

## Deliverables

Output file: `codex-tasks/outputs/merge_routine_forms_result.md`

Include:
1. Files modified
2. Lines changed
3. Form layout screenshot description
4. Validation schema
5. Test results (if possible)
6. Build output

---

**Start Time**: [Record]
**Expected Duration**: 2-3 hours
