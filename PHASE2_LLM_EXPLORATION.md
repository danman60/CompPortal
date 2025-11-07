# Phase 2: LLM-Powered Schedule Generation - Exploration

**Created:** November 7, 2025
**Status:** Exploration / Concept Design

---

## The Traditional Approach (What You'd Normally Build)

### Manual Drag-and-Drop Scheduler

**CD Workflow:**
1. View list of all routines (300-600 items)
2. Manually drag routines into sessions
3. System shows conflict warnings (same dancer, costume changes)
4. CD manually adjusts to resolve conflicts
5. Add breaks and ceremonies manually
6. Submit for feedback, make adjustments based on studio requests
7. Repeat until finalized

**Development Effort:**
- Drag-and-drop UI: 2-3 weeks
- Conflict detection engine: 1-2 weeks
- Rule validation: 1 week
- Feedback integration: 1 week
- **Total: 5-7 weeks development**

**CD Time Investment:**
- Initial schedule creation: 8-12 hours
- Feedback review and adjustments: 4-6 hours
- **Total: 12-18 hours per event**

**Pain Points:**
- Tedious manual work
- Easy to miss conflicts
- Hard to optimize globally (CD sees local moves, not optimal solution)
- Requires deep domain expertise
- Stressful before event

---

## LLM-Powered Approach (What You Could Build Instead)

### AI Schedule Generator with Human Review

**CD Workflow:**
1. Click "Generate Schedule"
2. System uses LLM to create optimized schedule in 30-60 seconds
3. CD reviews schedule, sees conflict-free result
4. CD makes minor tweaks if desired (drag-and-drop still available)
5. Submit for feedback
6. If feedback received, click "Re-optimize with feedback" (LLM incorporates requests)
7. Finalize

**Development Effort:**
- LLM integration: 1 week
- Prompt engineering for scheduling: 3-5 days
- Review UI: 1 week (reuse drag-and-drop if needed)
- Feedback incorporation: 3 days
- **Total: 2.5-3 weeks development**

**CD Time Investment:**
- Initial schedule creation: 5-10 minutes (LLM generates)
- Review and minor tweaks: 30-60 minutes
- Feedback review: 2-3 hours (LLM suggests solutions)
- **Total: 3-5 hours per event**

**Benefits:**
- 70-80% time savings for CD
- Faster development (40% less code)
- Globally optimized schedules (LLM considers all constraints simultaneously)
- Handles edge cases gracefully
- Learns from feedback patterns

---

## What LLM-Powered Scheduling Gains You

### 1. **Constraint Satisfaction at Scale**

**Traditional Approach:**
```
CD manually checks:
- Is Dancer A in back-to-back routines? (NO)
- Are costume changes realistic? (CHECK EACH)
- Are younger solos scheduled early? (VISUAL SCAN)
- Are large groups mid-day? (MANUAL PLACEMENT)
- Is spacing 3-5 routines between same dancer? (COUNT MANUALLY)

For 400 routines × 5 constraints = 2,000 manual checks
```

**LLM Approach:**
```
Prompt:
"Schedule 400 routines optimizing for:
- 3-5 routines between same dancer
- Younger solos before 11am
- Large groups 11am-2pm
- 30min costume change buffer
- Awards ceremonies every 50 routines"

LLM returns globally optimized schedule in 60 seconds.
All 2,000 constraints checked automatically.
```

**Gain:** Manual constraint checking eliminated.

---

### 2. **Natural Language Scheduling Rules**

**Traditional Approach:**
```typescript
// Hard-coded rules engine
if (routine.category === 'solo' && routine.age_division === 'mini') {
  if (session.time > '11:00') {
    throw new ConflictError('Mini solos must be before 11am');
  }
}

if (routine.size_category === 'large_group') {
  if (session.time < '11:00' || session.time > '14:00') {
    throw new ConflictError('Large groups must be 11am-2pm');
  }
}

// 50+ more rules...
```

**LLM Approach:**
```typescript
const schedulingRules = `
You are scheduling a dance competition. Follow these rules:

1. Mini and Petite solos: Schedule before 11am (younger dancers need earlier times)
2. Large groups and productions: Schedule 11am-2pm (peak energy, more audience)
3. Same dancer spacing: 3-5 routines between appearances (costume changes)
4. Costume change buffer: If same dancer different costume, minimum 30 minutes
5. Awards ceremonies: Every 50 routines (gives audience celebration breaks)
6. Teen/Senior solos: After 2pm (older dancers prefer later slots)
7. Category variety: Don't cluster same category (mix ballet, jazz, contemporary)
8. Level progression: Within same category, novice → intermediate → advanced

Apply common sense for edge cases.
`;

const schedule = await llm.generate({
  prompt: schedulingRules,
  routines: routineData,
  sessions: sessionData
});
```

**Gain:** Rules written in plain English, easier to maintain and update. No code changes for rule tweaks.

---

### 3. **Feedback Integration**

**Traditional Approach:**

Studio submits feedback:
> "Dancer Emily has routines #134 and #137 too close together - needs more time for costume change"

**CD Workflow:**
1. Find routine #134 in schedule (scroll, search)
2. Find routine #137 in schedule
3. Manually calculate spacing (3 routines apart)
4. Decide where to move one of them
5. Check if new position creates OTHER conflicts
6. Repeat for 10-15 feedback requests
7. 2-3 hours of manual work

**LLM Approach:**

Studio submits feedback (same example)

**CD Workflow:**
1. Click "Re-optimize with feedback"
2. LLM reads feedback, adjusts schedule automatically
3. CD reviews suggested changes
4. Accept or reject
5. 10 minutes of work

**LLM Prompt:**
```
Current schedule: [JSON of schedule]

Studio feedback:
- "Dancer Emily routines #134 and #137 too close - needs costume change time"
- "Routine #201 conflicts with studio's other event at 3pm"
- "Can routine #88 be moved earlier? Dancer has school conflict"

Re-optimize schedule incorporating this feedback while maintaining all original constraints.
Show me what changed and why.
```

**Gain:** Feedback resolution 80-90% faster.

---

### 4. **Explainability**

**Traditional Approach:**
Studio asks: "Why is my routine scheduled at 4pm?"
CD response: "Uh, that's where it fit based on the rules..."

**LLM Approach:**
Studio asks: "Why is my routine scheduled at 4pm?"

**System prompt:**
```
Explain why Routine #234 (Teen Solo, Contemporary) is scheduled at 4:15pm.
```

**LLM response:**
```
Routine #234 is scheduled at 4:15pm because:

1. Teen solos are scheduled after 2pm (older dancers prefer later times)
2. The dancer (Sarah) has 2 earlier routines at 1:30pm and 2:45pm,
   requiring 3-5 routine spacing for costume changes
3. Contemporary category is distributed throughout the day for variety
4. This slot is after the 3pm awards ceremony, providing natural break
5. Sarah's parent requested "not before 2pm" in registration notes

Alternative slots considered:
- 3:45pm: Would cluster too many contemporary routines
- 5:00pm: Too close to Sarah's large group routine at 5:30pm
```

**Gain:** Transparent, defensible scheduling decisions. Reduces CD stress and studio complaints.

---

### 5. **Learning from Past Events**

**Traditional Approach:**
Every event starts from scratch. CD relies on memory.

**LLM Approach:**
```
Prompt:
"You are scheduling Event #12. Here are the schedules and feedback from Events #1-11.

Event #3 feedback summary: 'Too many solos at end of day - audience left early'
Event #7 feedback summary: 'Large groups at 9am had low energy'
Event #10 feedback summary: 'Spacing between costume changes perfect this time!'

Use these learnings to optimize Event #12 schedule.
"
```

**Gain:** System improves over time. New CDs benefit from collective wisdom.

---

### 6. **Multi-Objective Optimization**

**Traditional Approach:**
CD optimizes for ONE thing at a time:
- First pass: Resolve all conflicts
- Second pass: Try to group categories
- Third pass: Adjust for timing preferences
- Each pass potentially breaks previous optimizations

**LLM Approach:**
```
Optimize simultaneously for:
1. Zero conflicts (hard constraint)
2. Audience engagement (variety, pacing)
3. Dancer wellness (spacing, age-appropriate times)
4. Studio preferences (requested time slots)
5. Awards ceremony placement
6. Break placement for staff/judges

Return schedule with best overall score across all objectives.
```

**Gain:** Globally optimal solution, not just "good enough."

---

## What You'd Need to Build

### Data Inputs for LLM

```typescript
interface ScheduleGenerationRequest {
  event: {
    id: string;
    start_time: string;
    end_time: string;
    sessions_count: number;
  };

  routines: Array<{
    id: string;
    title: string;
    dancers: Array<{ id: string; name: string }>;
    size_category: string; // solo, duet, small_group, large_group, production
    age_division: string; // mini, petite, junior, teen, senior
    category: string; // ballet, jazz, contemporary, tap, etc.
    level: string; // novice, intermediate, advanced
    music_duration: number; // seconds
    estimated_runtime: number; // includes setup/teardown
    studio_id: string;
    preferences?: {
      time_preference?: 'morning' | 'afternoon' | 'evening';
      notes?: string;
    };
  }>;

  constraints: {
    rules: string; // Natural language rules
    sessions: Array<{
      id: string;
      start_time: string;
      end_time: string;
      capacity?: number;
    }>;
    breaks: Array<{
      time: string;
      duration: number; // minutes
    }>;
    ceremonies: Array<{
      after_routine_count: number; // e.g., every 50 routines
      duration: number;
    }>;
  };

  feedback?: Array<{
    studio_id: string;
    routine_id: string;
    request: string; // Natural language feedback
    priority: 'low' | 'medium' | 'high';
  }>;

  past_events?: Array<{
    id: string;
    feedback_summary: string;
    what_worked: string;
    what_didnt: string;
  }>;
}
```

### LLM Prompt Structure

```typescript
const systemPrompt = `
You are an expert dance competition scheduler. You understand:
- Dancer wellness (young dancers tire early, need spacing for costume changes)
- Audience engagement (variety in categories, pacing, energy flow)
- Practical logistics (setup time, break placement, awards ceremonies)
- Studio preferences (while maintaining fairness)

Your goal: Create an optimal schedule that satisfies all hard constraints
(no conflicts) while maximizing soft constraints (preferences, variety, flow).

Output format: JSON array of scheduled routines with start times,
explanations for key decisions, and conflict analysis.
`;

const userPrompt = `
${JSON.stringify(scheduleRequest)}

Generate an optimized schedule. For each routine, provide:
1. Assigned time slot
2. Session assignment
3. Reasoning (if non-obvious placement)

Flag any unavoidable conflicts with severity and suggested resolutions.
`;
```

### Output Format

```typescript
interface ScheduleGenerationResponse {
  schedule: Array<{
    routine_id: string;
    session_id: string;
    start_time: string;
    end_time: string;
    order_in_session: number;
    routine_number: number; // Sequential numbering
    reasoning?: string; // Why scheduled here
  }>;

  breaks: Array<{
    session_id: string;
    start_time: string;
    end_time: string;
    type: 'lunch' | 'transition' | 'technical';
  }>;

  ceremonies: Array<{
    session_id: string;
    start_time: string;
    duration: number;
    awards_for_session: string[];
  }>;

  conflicts: Array<{
    severity: 'error' | 'warning' | 'info';
    routines: string[]; // Routine IDs involved
    description: string;
    suggested_resolution?: string;
  }>;

  optimization_summary: {
    total_routines_scheduled: number;
    constraints_satisfied: number;
    constraints_failed: number;
    average_spacing_between_same_dancer: number;
    category_variety_score: number; // 0-100
    age_appropriateness_score: number; // 0-100
  };
}
```

---

## Implementation Effort Comparison

### Traditional Drag-and-Drop Scheduler

**Features to Build:**
- Drag-and-drop UI (complex state management)
- Conflict detection engine (hard-coded rules)
- Real-time validation
- Manual break/ceremony placement
- Feedback submission interface
- Manual feedback resolution workflow
- Routine numbering system

**Estimated:** 5-7 weeks, 8,000-10,000 lines of code

---

### LLM-Powered Scheduler

**Features to Build:**
- LLM integration (Claude API or similar)
- Prompt engineering and testing
- Simple schedule review UI (read-only with edit button)
- Feedback collection interface
- Re-optimize with feedback button
- Schedule approval workflow

**Estimated:** 2.5-3 weeks, 3,000-4,000 lines of code

**Cost:**
- Claude API: ~$0.50-$2.00 per schedule generation
- For 50 events/year, 2-3 iterations each: ~$50-$300/year
- **Way cheaper than 4 extra weeks of development time**

---

## Risks & Mitigations

### Risk 1: LLM Hallucinates Invalid Schedule
**Mitigation:**
- Backend validation layer (same rules engine you'd build anyway)
- CD must approve before finalization
- Option to fall back to manual drag-and-drop

### Risk 2: Prompts Don't Generalize
**Mitigation:**
- Start with structured prompt templates
- Collect feedback on generated schedules
- Iterate on prompt engineering
- Version control prompts like code

### Risk 3: LLM API Downtime
**Mitigation:**
- Async generation (not real-time)
- Retry logic with exponential backoff
- Cache generated schedules
- Manual mode always available

### Risk 4: Cost at Scale
**Mitigation:**
- Cache schedules (don't regenerate on every page load)
- Rate limit regeneration requests
- Use cheaper models for minor tweaks
- At $2/schedule × 50 events = $100/year (negligible)

---

## Recommendation

### Build LLM-Powered Scheduler If:
- ✅ You want to ship Phase 2 faster (40% less dev time)
- ✅ You want to differentiate from competitors (most use manual schedulers)
- ✅ You want CD time savings (12 hours → 3 hours per event)
- ✅ You're comfortable with prompt engineering
- ✅ You want system that improves over time

### Build Traditional Scheduler If:
- ❌ You need 100% deterministic results (LLMs have variability)
- ❌ You can't rely on external APIs (air-gapped systems)
- ❌ You have unlimited dev time and want full control
- ❌ Cost is a major concern (but $100/year is trivial)

---

## My Take

**You should absolutely build the LLM-powered version.**

**Why:**
1. You proved with Phase 1 you can spec + ship complex features fast
2. LLM scheduling is a **killer differentiator** (no competitors have this)
3. CD time savings = huge value prop (12 hours → 3 hours)
4. Faster to market (2.5 weeks vs 5-7 weeks)
5. Better UX (one-click optimize vs tedious drag-and-drop)
6. Your spec-driven approach works perfectly for prompt engineering

**How to start:**
1. Build the data structures (inputs/outputs above)
2. Create prompt templates for basic scheduling
3. Test with real Phase 1 data (you have 59 entries to use)
4. Iterate on prompts until quality is high
5. Add review UI
6. Ship to production with "experimental" flag
7. Gather feedback, improve prompts
8. Remove flag when confident

**Timeline:** 2-3 weeks to MVP, then iterate based on real usage.

Want to explore this further or spec it out properly?
