# Thursday Overnight - Feature Implementation Plan

**Target Date**: Thursday overnight session
**Scope**: 18 features (6 Urgent, 9 High Priority, 3 Medium Priority)

---

## 🔥 URGENT - Studio Director (3 features, ~2-3 hours)

### 1. Support Ticket Chat Embed ⚡ CRITICAL
**Priority**: 🔥 URGENT
**Role**: Studio Director
**Time Estimate**: 60 min
**Description**: Add chat-style support widget bottom-right; users see a chat UI but replies go via email

**Implementation**:
- Widget: Fixed position bottom-right corner
- UI: Chat bubble icon → opens chat panel
- Backend: Messages stored in DB, send email notifications to admin
- Frontend: Real-time-looking UI (but async via email)

**Files to Create**:
- `src/components/SupportChatWidget.tsx` - Chat UI component
- `src/server/routers/support.ts` - tRPC router for messages
- Database: `support_tickets` table

**Design**:
```tsx
// Bottom-right floating button
<div className="fixed bottom-4 right-4 z-50">
  <button className="bg-purple-500 text-white rounded-full p-4 shadow-lg">
    💬
  </button>
  {/* Chat panel slides up */}
  <div className="bg-white rounded-lg shadow-xl w-96 h-96">
    {/* Chat messages */}
  </div>
</div>
```

**Database Schema**:
```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY,
  studio_id UUID REFERENCES studios(id),
  user_email TEXT,
  status TEXT DEFAULT 'open', -- open, replied, closed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE support_messages (
  id UUID PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id),
  from_user BOOLEAN, -- true = user, false = admin
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2. Studio Setup on First Login ⚡ CRITICAL
**Priority**: 🔥 URGENT
**Role**: Studio Director
**Time Estimate**: 45 min
**Description**: On first login (post-confirmation), guide SD through "Setup Wizard" for studio name, address, and settings

**Implementation**:
- Check if `studio.setup_completed` is false
- Show modal wizard (can't dismiss)
- 3 steps: Basic Info → Address → Settings
- Mark complete in DB after final step

**Files to Create**:
- `src/components/StudioSetupWizard.tsx`
- Add `setup_completed` BOOLEAN to studios table

**Wizard Steps**:
1. **Studio Name** (required)
2. **Address** (street, city, province, postal, country)
3. **Settings** (logo upload optional, phone, website)

**Code**:
```tsx
const [currentStep, setCurrentStep] = useState(1);

// Check on dashboard mount
useEffect(() => {
  if (!studio.setup_completed) {
    setShowWizard(true);
  }
}, [studio]);

// Prevent closing wizard
<Dialog open={showWizard} onClose={() => {}} disableEscapeKeyDown>
  <Step1 /> or <Step2 /> or <Step3 />
  <ProgressBar current={currentStep} total={3} />
</Dialog>
```

---

### 3. Custom Signup Email ⚡ CRITICAL
**Priority**: 🔥 URGENT
**Role**: Studio Director
**Time Estimate**: 30 min
**Description**: Fix confirmation emails pointing to localhost; allow customizing signup confirmation email

**Implementation**:
- Update email templates to use `process.env.NEXT_PUBLIC_APP_URL`
- Replace localhost with production URL
- Add customizable email template in admin settings

**Files to Update**:
- `src/server/routers/auth.ts` - Email sending logic
- `.env.local` - Add `NEXT_PUBLIC_APP_URL=https://comp-portal-one.vercel.app`
- Email templates: Use dynamic URL

**Fix**:
```tsx
// OLD: Hard-coded localhost
const confirmUrl = `http://localhost:3000/confirm?token=${token}`;

// NEW: Environment variable
const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/confirm?token=${token}`;
```

**Email Template** (customizable):
```html
<h2>Welcome to GlowDance!</h2>
<p>Please confirm your email address:</p>
<a href="${confirmUrl}">Confirm Email</a>
```

---

## ⭐️ HIGH PRIORITY - Competition Director (4 features, ~3-4 hours)

### 4. Private Notes on Studios
**Priority**: ⭐️ High
**Role**: Competition Director
**Time Estimate**: 45 min
**Description**: CD can leave internal notes on Studios that are not visible to Studio Directors

**Implementation**:
- Add `internal_notes` TEXT field to studios table
- Show textarea in CD studio view only
- Hide from SD completely
- Auto-save on blur

**Files to Update**:
- `src/components/StudiosList.tsx` - Add notes section for CD
- Database migration: `ALTER TABLE studios ADD COLUMN internal_notes TEXT;`

**UI**:
```tsx
{!isStudioDirector && (
  <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
    <label className="text-yellow-400 text-sm font-semibold">
      🔒 Private Notes (CD Only)
    </label>
    <textarea
      value={internalNotes}
      onChange={(e) => setInternalNotes(e.target.value)}
      onBlur={() => saveNotes()}
      className="w-full mt-2 p-3 bg-white/5 border border-white/20 rounded-lg text-white"
      rows={4}
      placeholder="Internal notes about this studio..."
    />
  </div>
)}
```

---

### 5. Judge Assignment via Drag/Drop
**Priority**: ⭐️ High
**Role**: Competition Director
**Time Estimate**: 90 min
**Description**: CD can drag and drop judges into competitions; visual confirmation after placement

**Implementation**:
- Use @dnd-kit (already installed)
- Source: Available judges list
- Target: Competition slots
- Save to `competition_judges` table

**Files to Create**:
- `src/components/JudgeAssignment.tsx` - Drag/drop interface
- Database: `competition_judges` table

**Database Schema**:
```sql
CREATE TABLE competition_judges (
  id UUID PRIMARY KEY,
  competition_id UUID REFERENCES competitions(id),
  judge_id UUID REFERENCES judges(id),
  panel_number INT, -- Panel 1, 2, 3, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competition_id, judge_id)
);
```

**UI**:
```tsx
<DndContext onDragEnd={handleDragEnd}>
  <div className="grid grid-cols-2 gap-8">
    {/* Available Judges */}
    <div>
      <h3>Available Judges</h3>
      {availableJudges.map(judge => (
        <DraggableJudge key={judge.id} judge={judge} />
      ))}
    </div>

    {/* Competition Panels */}
    <div>
      <h3>Panel 1</h3>
      <DroppablePanel panelId="panel-1" />

      <h3>Panel 2</h3>
      <DroppablePanel panelId="panel-2" />
    </div>
  </div>
</DndContext>
```

---

### 6. Dashboard Reordering (CD)
**Priority**: ⭐️ High
**Role**: Competition Director
**Time Estimate**: 30 min (already implemented!)
**Description**: CD can rearrange dashboard buttons and widgets; layout persists per user

**Status**: ✅ **ALREADY IMPLEMENTED**
- `SortableDashboardCards.tsx` exists
- Uses @dnd-kit
- Saves to `user_dashboard_layout` via tRPC

**Verification Needed**: Ensure works for CD role

---

### 7. Add Judges Flow
**Priority**: ⭐️ High
**Role**: Competition Director
**Time Estimate**: 60 min
**Description**: Add judges in row-based form (similar to dancers), then drag/drop into competitions; send email invites automatically

**Implementation**:
- Multi-row form like DancerBatchForm
- Email invitation on save
- Integration with drag/drop (#5 above)

**Files to Create**:
- `src/components/JudgeBatchForm.tsx`
- `src/server/routers/judge.ts` - Create/invite endpoints

**Form Design**:
```tsx
// 3 rows initially, add more rows
{judges.map((judge, index) => (
  <div key={index} className="grid grid-cols-4 gap-4">
    <input placeholder="First Name" />
    <input placeholder="Last Name" />
    <input type="email" placeholder="Email" />
    <select placeholder="Level">
      <option>Certified</option>
      <option>Adjudicator</option>
      <option>Master</option>
    </select>
  </div>
))}
```

**Email Invitation**:
```tsx
const sendInvite = async (judge) => {
  await sendEmail({
    to: judge.email,
    subject: 'Invitation to Judge at GlowDance',
    body: `Hi ${judge.first_name}, you've been invited to judge...`,
  });
};
```

---

## ⭐️ HIGH PRIORITY - Studio Director (2 features, ~1-2 hours)

### 8. Edit Routines Inline
**Priority**: ⭐️ High
**Role**: Studio Director
**Time Estimate**: 60 min
**Description**: Allow editing routine fields directly on cards (title, category, etc.) instead of full-page click-through

**Implementation**:
- Add "Edit" mode toggle on routine cards
- Inline input fields
- Save on blur or Enter key
- Cancel on Esc

**Files to Update**:
- `src/components/EntriesList.tsx`

**UI**:
```tsx
const [editingId, setEditingId] = useState<string | null>(null);

{editingId === entry.id ? (
  <input
    value={editedTitle}
    onChange={(e) => setEditedTitle(e.target.value)}
    onBlur={() => saveEdit()}
    onKeyDown={(e) => {
      if (e.key === 'Enter') saveEdit();
      if (e.key === 'Escape') cancelEdit();
    }}
    autoFocus
  />
) : (
  <div onClick={() => setEditingId(entry.id)}>
    {entry.routine_title}
    <button className="ml-2 text-xs">✏️ Edit</button>
  </div>
)}
```

---

### 9. Dashboard Reordering (SD)
**Priority**: ⭐️ High
**Role**: Studio Director
**Time Estimate**: 0 min
**Description**: SD can rearrange dashboard layout; layout persists between sessions

**Status**: ✅ **ALREADY IMPLEMENTED**
- Same as CD (#6)
- Verify works for SD role

---

## ⭐️ MEDIUM PRIORITY - Competition Director (2 features, ~1 hour)

### 10. Studio Updates Feed
**Priority**: ⭐️ Medium
**Role**: Competition Director
**Time Estimate**: 45 min
**Description**: CD dashboard displays latest updates from studios (e.g., new routines, dancers, or uploads)

**Implementation**:
- Query recent entries, dancers, uploads (last 7 days)
- Display as activity feed
- Group by studio

**Files to Create**:
- `src/components/StudioActivityFeed.tsx`

**UI**:
```tsx
<div className="bg-white/10 rounded-xl p-6">
  <h3 className="text-xl font-bold mb-4">📊 Studio Updates</h3>
  {activities.map(activity => (
    <div key={activity.id} className="flex items-start gap-3 mb-3">
      <div className="text-2xl">{activity.icon}</div>
      <div>
        <div className="text-white font-semibold">{activity.studio_name}</div>
        <div className="text-gray-400 text-sm">{activity.action}</div>
        <div className="text-gray-500 text-xs">{formatDistanceToNow(activity.created_at)} ago</div>
      </div>
    </div>
  ))}
</div>
```

**Query**:
```tsx
const activities = await prisma.$queryRaw`
  SELECT 'entry' as type, routine_title as title, created_at, studio_id
  FROM competition_entries
  WHERE created_at > NOW() - INTERVAL '7 days'
  UNION ALL
  SELECT 'dancer' as type, first_name || ' ' || last_name as title, created_at, studio_id
  FROM dancers
  WHERE created_at > NOW() - INTERVAL '7 days'
  ORDER BY created_at DESC
  LIMIT 20
`;
```

---

### 11. Consistent Routine Card Height (CD)
**Priority**: ⭐️ Medium
**Role**: Competition Director
**Time Estimate**: 15 min
**Description**: Align all routine cards starting at "Music Not Uploaded" for consistent grid layout

**Implementation**:
- Add `min-height` to card sections
- Use CSS grid with `align-items: start`
- Ensure all cards have same structure

**Files to Update**:
- `src/components/EntriesList.tsx`

**CSS Fix**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {entries.map(entry => (
    <div className="flex flex-col" style={{ minHeight: '320px' }}>
      {/* Title section */}
      <div className="flex-grow">...</div>

      {/* Music section - always at same height */}
      <div className="mt-auto">
        {entry.music_uploaded ? '✅ Music Uploaded' : '❌ Music Not Uploaded'}
      </div>
    </div>
  ))}
</div>
```

---

## ⭐️ MEDIUM PRIORITY - Studio Director (3 features, ~45 min)

### 12. Random Dance Quote
**Priority**: ⭐️ Medium
**Role**: Studio Director
**Time Estimate**: 15 min
**Description**: Display randomized inspirational dance quote in italics beneath dashboard header

**Implementation**:
- Array of quotes in constants
- Random selection on mount
- Italics styling

**Files to Update**:
- `src/components/StudioDirectorDashboard.tsx`

**Code**:
```tsx
const DANCE_QUOTES = [
  "Dance is the hidden language of the soul.",
  "To dance is to be out of yourself, larger, more powerful, more beautiful.",
  "Dancing is like dreaming with your feet.",
  "Dance first. Think later. It's the natural order.",
  "Life is the dancer and you are the dance.",
  "Dance is the joy of movement and the heart of life.",
  "When you dance, your purpose is not to get to a certain place on the floor.",
  "Dance is the poetry of the foot.",
  "Dancing is creating a sculpture that is visible only for a moment.",
  "The dance is a poem of which each movement is a word.",
];

const randomQuote = DANCE_QUOTES[Math.floor(Math.random() * DANCE_QUOTES.length)];

<div className="text-center mb-8">
  <h1 className="text-4xl font-bold text-white mb-2">My Dashboard</h1>
  <p className="text-gray-400 italic text-lg">"{randomQuote}"</p>
</div>
```

---

### 13. Welcome Back by Name
**Priority**: ⭐️ Medium
**Role**: Studio Director
**Time Estimate**: 15 min
**Description**: Replace email in dashboard greeting with "Welcome back, [Name]"; store name in Studio Settings and Account Setup

**Implementation**:
- Add `contact_name` field to studios table
- Pull from studio settings
- Fallback to email if not set

**Files to Update**:
- `src/components/StudioDirectorDashboard.tsx`
- Database: `ALTER TABLE studios ADD COLUMN contact_name TEXT;`

**Code**:
```tsx
const displayName = studio.contact_name || user.email;

<h2 className="text-2xl text-white mb-6">
  Welcome back, {displayName}! 👋
</h2>
```

---

### 14. Consistent Routine Card Height (SD)
**Priority**: ⭐️ Medium
**Role**: Studio Director
**Time Estimate**: 15 min
**Description**: Align routine cards starting at "Music Not Uploaded" line for visual uniformity

**Status**: Same fix as #11 (CD version)

---

## 🤝 SHARED FEATURES (3 features, already covered above)

### 15. Unified Dashboard Layout System
**Priority**: ⭐️ High
**Status**: ✅ **ALREADY IMPLEMENTED** (see #6 and #9)

### 16. Welcome Greeting Update
**Priority**: ⭐️ Medium
**Status**: Covered in #13 (Welcome Back by Name)

### 17. Randomized Dance Quote
**Priority**: ⭐️ Medium
**Status**: Covered in #12

---

## 📊 Implementation Order (Thursday Overnight)

### Round 1: URGENT (2-3 hours)
1. ✅ Custom Signup Email (30 min) - Quick fix
2. ✅ Studio Setup Wizard (45 min)
3. ✅ Support Chat Widget (60 min)

### Round 2: HIGH PRIORITY CD (3-4 hours)
4. ✅ Private Notes on Studios (45 min)
5. ✅ Add Judges Flow (60 min)
6. ✅ Judge Drag/Drop Assignment (90 min)
7. ⏭️ Dashboard Reordering - Skip (already done)

### Round 3: HIGH PRIORITY SD (1 hour)
8. ✅ Edit Routines Inline (60 min)
9. ⏭️ Dashboard Reordering - Skip (already done)

### Round 4: MEDIUM PRIORITY (1.5 hours)
10. ✅ Studio Updates Feed (45 min)
11. ✅ Random Dance Quote (15 min)
12. ✅ Welcome Back by Name (15 min)
13. ✅ Consistent Card Heights (15 min both roles)

### Round 5: TEST & DEPLOY
14. ✅ Build test all features
15. ✅ Manual QA on production
16. ✅ Commit and push

---

## 📋 Database Migrations Needed

```sql
-- Support chat
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(id),
  user_email TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id),
  from_user BOOLEAN NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studio setup
ALTER TABLE studios ADD COLUMN setup_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE studios ADD COLUMN contact_name TEXT;
ALTER TABLE studios ADD COLUMN internal_notes TEXT;

-- Judge assignment
CREATE TABLE competition_judges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id),
  judge_id UUID REFERENCES judges(id),
  panel_number INT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competition_id, judge_id)
);

-- Judges table (if doesn't exist)
CREATE TABLE IF NOT EXISTS judges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  level TEXT, -- Certified, Adjudicator, Master
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ Success Criteria

**All features must**:
- ✅ Build without errors
- ✅ Work in production
- ✅ Not break existing functionality
- ✅ Have appropriate role restrictions (CD vs SD)
- ✅ Be committed with descriptive messages

**Total Estimated Time**: 8-10 hours
**Features to Implement**: 14 (4 already done, 10 new)
**Build Tests**: After every 2-3 features

---

## 🚀 Ready for Thursday Overnight Session!
