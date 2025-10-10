# Communication Protocol: Claude ↔ Codex

## Directory Structure

```
codex-tasks/
├── [task_name].md           ← Claude creates tasks
├── outputs/                 ← Codex outputs code
├── questions/               ← Codex asks Claude
├── answers/                 ← Claude responds
├── blockers/                ← Codex reports blockers
├── status/                  ← Codex reports progress
└── feedback/                ← Claude gives code review feedback
```

## Codex → Claude

### 1. Questions (Need Clarification)

**When**: Unclear requirements, ambiguous spec, multiple valid approaches

**Codex creates**: `codex-tasks/questions/QUESTION_[topic].md`

```markdown
## Question: [Brief Topic]

**Task**: create_feature.md
**Context**: I'm implementing [feature] and need clarification

**Question**:
Should the form submit on Enter key press, or require explicit button click?

**Options**:
1. Submit on Enter (faster UX)
2. Require button click (prevents accidental submission)

**Current Status**: Paused, waiting for guidance

**Codex**
```

**Codex then**: Waits for answer, checks `codex-tasks/answers/` on next "continue"

### 2. Blockers (Can't Proceed)

**When**: Missing info, broken dependency, impossible requirement

**Codex creates**: `codex-tasks/blockers/BLOCKER_[issue].md`

```markdown
## Blocker: Missing Prisma Field

**Task**: create_entry_form.md
**Issue**: Task requires field 'participants' but schema shows 'entry_participants'

**What I Tried**:
- Checked prisma_models in config
- Found 'entry_participants' field
- Task spec says 'participants'

**Question**: Which field name is correct?

**Impact**: Cannot complete form without correct field name

**Status**: Blocked

**Codex**
```

### 3. Status Updates (Progress Reports)

**When**: Starting task, making progress, completing task

**Codex creates**: `codex-tasks/status/STATUS_[task_name].md`

```markdown
## Status: create_studio_form

**Status**: COMPLETED
**Started**: [timestamp]
**Completed**: [timestamp]

**Generated**:
- File: src/components/StudioForm.tsx (248 lines)
- Output: codex-tasks/outputs/create_studio_form_result.md

**Validation**:
- ✅ Prisma fields: Exact match
- ✅ Glassmorphic pattern: Applied
- ✅ Form validation: Complete
- ✅ Error handling: Toast notifications
- ✅ Loading states: Present

**Ready for Claude review**

**Codex**
```

## Claude → Codex

### 1. Tasks (New Assignments)

**Claude creates**: `codex-tasks/[task_name].md`

```markdown
## Task: Create Studio Settings Form

**Type**: Form Component
**Priority**: Medium
**Complexity**: Low

**File**: src/components/StudioSettingsForm.tsx

**Requirements**:
1. React Hook Form + Zod validation
2. Fields: studio_name, contact_email, contact_phone, address
3. Pre-populate from tRPC query: studio.getById
4. Submit via tRPC mutation: studio.update
5. Toast on success/error
6. Disable submit during loading

**Prisma Fields** (exact):
- studio_name
- contact_email
- contact_phone
- address

**Deliverables**:
- Complete component code
- Export default StudioSettingsForm

**Claude**
```

### 2. Answers (Responding to Questions)

**Claude creates**: `codex-tasks/answers/ANSWER_[topic].md`

```markdown
## Answer: Form Submit Behavior

**Question**: codex-tasks/questions/QUESTION_form_submit.md
**Decision**: Submit on Enter key press

**Rationale**:
- Faster UX for data entry
- Standard form behavior users expect
- Can add confirmation modal if needed later

**Implementation**:
Use default form behavior (Enter submits):
```tsx
<form onSubmit={handleSubmit(onSubmit)}>
  {/* form fields */}
  <button type="submit">Save</button>
</form>
```

**Proceed with task**

**Claude**
```

### 3. Feedback (Code Review)

**Claude creates**: `codex-tasks/feedback/FEEDBACK_[task].md`

```markdown
## Feedback: create_studio_form

**Output**: codex-tasks/outputs/create_studio_form_result.md
**Status**: APPROVED with minor fixes

**Issues Found**:
1. ⚠️ Missing loading state on submit button
2. ✅ Prisma fields correct
3. ✅ Validation complete
4. ⚠️ Toast position should be 'top-right' not 'top-center'

**Changes Made by Claude**:
- Added `disabled={mutation.isLoading}` to button
- Fixed toast position to 'top-right'

**Integrated**: Committed c4a92d1

**Next time**: Remember to disable buttons during loading

**Claude**
```

## Workflow

### Codex's "continue" Checklist

1. **Check answers**: `ls codex-tasks/answers/` - Any new responses?
2. **Check tasks**: `ls codex-tasks/*.md` - Any new assignments?
3. **If answered question**: Resume paused task with new info
4. **If new task**: Start generating code
5. **Update status**: Create/update STATUS file
6. **Output result**: When complete, write to outputs/

### Claude's CADENCE Loop

```typescript
// In continuous loop
const communications = {
  questions: glob('codex-tasks/questions/*.md'),
  blockers: glob('codex-tasks/blockers/*.md'),
  status: glob('codex-tasks/status/*.md'),
  outputs: glob('codex-tasks/outputs/*.md')
}

// Answer questions
if (communications.questions.length > 0) {
  answerQuestions()
}

// Resolve blockers
if (communications.blockers.length > 0) {
  resolveBlockers()
}

// Review outputs
if (communications.outputs.length > 0) {
  reviewCode()
  integrate()
  commit()
  deleteProcessedFiles()
}

// Check status for progress
if (communications.status.length > 0) {
  logProgress()
}
```

## File Lifecycle

```
TASK CREATED (by Claude)
  ↓
codex-tasks/create_feature.md
  ↓
CODEX PICKS UP (on "continue")
  ↓
codex-tasks/status/STATUS_create_feature.md (IN_PROGRESS)
  ↓
[If unclear]
  ↓
codex-tasks/questions/QUESTION_feature_detail.md
  ↓
[Claude answers]
  ↓
codex-tasks/answers/ANSWER_feature_detail.md
  ↓
[Codex resumes]
  ↓
codex-tasks/outputs/create_feature_result.md (COMPLETED)
codex-tasks/status/STATUS_create_feature.md (COMPLETED)
  ↓
CLAUDE REVIEWS
  ↓
[If feedback needed]
  ↓
codex-tasks/feedback/FEEDBACK_create_feature.md
  ↓
INTEGRATED → COMMITTED → FILES DELETED
```

## Example Exchange

**Day 1, 10:00 AM - Claude creates task**
```
codex-tasks/create_dashboard_widget.md
```

**Day 1, 10:05 AM - User says "continue" to Codex**

Codex:
- Reads task
- Creates `STATUS_create_dashboard_widget.md` (IN_PROGRESS)
- Starts generating...
- Has question about data source
- Creates `QUESTION_dashboard_data_source.md`
- Updates status to PAUSED

**Day 1, 10:10 AM - Claude checks questions/**

Claude sees question:
- Creates `ANSWER_dashboard_data_source.md`
- Tells user: "Answered Codex question, ask Codex to continue"

**Day 1, 10:15 AM - User says "continue" to Codex**

Codex:
- Checks answers/
- Reads answer
- Resumes task with new info
- Generates code
- Creates `create_dashboard_widget_result.md`
- Updates status to COMPLETED

**Day 1, 10:20 AM - Claude checks outputs/**

Claude:
- Reviews code
- Validates quality gates
- Integrates into codebase
- Commits
- Deletes processed files
- Continues to next task

---

**Simple, file-based, reliable communication between two autonomous agents.**
