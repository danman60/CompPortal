# Client Feedback: LIVE VIEW / AT COMPETITION

**Client:** Selena  
**Date:** Extracted from meeting transcript  
**Topic:** Game Day / At Competition / Live View (Sync between Tabulator, Judges, Backstage)

---

## Overview

The "live view" is what everybody has on competition day. Three separate views are being built:
- **Tabulator**
- **Judge**
- **Backstage**

---

## Tabulator View

### What Tabulator Needs to See
1. Three columns: **Judge A**, **Judge B**, **Judge C** scores
2. The **average score** calculated automatically
3. The **adjudication level result** displayed next to each routine's average (Afterglow, Titanium, Platinum, Dynamic Diamond, etc.)

### What Tabulator Does NOT Need
- All the extra information on the left side of Daniel's demo
- What's on stage / what's not on stage status
- Queue information ("we definitely don't need to know who's in queue")
- Time passed during routine
- They're sitting there the whole time anyway; they see based on what marks have been submitted

### Tabulator Functionality Required
- Ability to make **manual edits to scores** if something goes down (emergency/technical issues)
- Ability to **print out labels** with scores
- Scores flow into system for **post-competition reports**

### Edge Case Alert System
- When one judge's small difference (e.g., 0.01) causes a routine to bump down to a lower adjudication level, the tabulator needs to be aware
- **Example:** Two judges score 99, one scores 98.9 — if this bumps the routine down a level, the tabulator should see this
- This should trigger a **human conversation**, NOT automation
- Tabulator talks to the judge to ask if they want to revisit their score
- Judges re-enter their own corrected scores on their iPads (tabulator doesn't edit judge marks directly)
- Studios receive printouts of all their scores from Judge A, B, C and the average at end of weekend — they will see discrepancies, so this needs to be handled

### Number of Judges
- **Only 3 judges**, not 4

---

## Judge View (iPad)

### Display Requirements
- Simple interface showing:
  - Routine number
  - Routine name
  - "Enter Score"
- **Example:** "Routine 1, Summer Breeze, Enter Score"

### Score Input Requirements
- **Two-decimal system required ALWAYS** (e.g., 89.06, not 89 or 89.0)
- Format must be: `XX.XX` (number + decimal + two decimal places)
- **Invalid formats:** 69, 72, 43, 86.6, 89.3
- **Valid examples:** 89.06, 42.67, 98.90

### Input Method
- **Manual number typing preferred over sliders** — much faster
- Judges just type in the four digits (e.g., "42.67")
- Sliders would be too slow and risk landing on wrong decimal during rushed moments

### Title Division Scoring
When routine is upgraded to Title status:
- Regular score input PLUS **5 additional breakdown scores**:
  1. Technique (20 points)
  2. (4 other categories — screenshot sent separately)
- Title breakdown scores **CAN be whole numbers** (no decimal required)
- Interface should show: Regular score field, then below it "Title Upgrade" section with the 5 breakdown fields

### Submission Flow
1. Judge enters score
2. Hits Submit
3. Score flows to tabulator's main computer
4. Once all 3 judges submit, tabulator sees complete picture

---

## Backstage View

### Music Playback System
- All MP3s should be **downloaded locally** to backstage computer **before competition day**
- App handles the music playback (not manual Winamp-style playlist)
- Creates a synced experience where everyone sees real-time routine progress

### TV Display Feature
- Would be "really cool" to put up on a **TV screen in backstage area**
- Shows **time remaining in routine** while people are waiting in backstage area
- Helpful because "you can't always tell how much is left in the song" with some music

### Sync Functionality
- Routine duration syncs across **ALL different views** (tabulator, judge, backstage)
- Backstage computer has files saved locally
- App plays music on a playlist so duration can be tracked

---

## Emergency Schedule Changes at Competition

### Requirements
- Need to see the day's upcoming routines
- Need ability to **move routines** even after routine numbers are locked
- **Example:** "128 needs to move to after routine 5. It'll go routine 5, 128, routine 6"
- **ONLY the tabulator can move stuff** — not judges, not backstage

---

## Music Upload System (Pre-Competition)

### Studio Upload Portal
- Studios upload MP3s via their routines dashboard
- Competition director gets a report of **missing music**
- Studios get a **"big green checkmark"** when all their music has been uploaded
- Easy to see who to communicate with about missing music

### Current Workflow Reference
- Programmer sends email a week before saying "these ones were missing music"
- Portal should show: "Studio A is missing music from these entries" and how many routines

---

## Terminology Note

> **Don't call it "awards ceremony" — call it "Adjudication"**

---

## Summary Checklist

### Tabulator View
- [ ] 3-column judge score display
- [ ] Auto-calculated average
- [ ] Adjudication level display
- [ ] Manual score edit capability (emergency)
- [ ] Label printing
- [ ] Edge case alerts (score bumping down levels)

### Judge View (iPad)
- [ ] Simple: Routine # + Name + Enter Score
- [ ] Enforce two-decimal format (XX.XX)
- [ ] Manual number input (no sliders)
- [ ] Title upgrade breakdown (5 categories, whole numbers OK)

### Backstage View
- [ ] Local MP3 download before competition
- [ ] App-controlled playlist playback
- [ ] TV display for time remaining
- [ ] Sync with all other views

### At Competition
- [ ] Only tabulator can move routines
- [ ] Routine numbers stay locked but order can change
- [ ] Missing music reports pre-competition
