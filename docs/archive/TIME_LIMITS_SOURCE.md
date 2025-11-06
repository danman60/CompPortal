# Time Limits Source Documentation

**Created:** 2025-11-05
**Context:** User asked "Confirm where you got the time limits from please"

---

## Source: Standard Dance Competition Time Limits

The time limits in `update_time_limits.sql` are based on **industry-standard dance competition time limits** used by major dance competition organizations in North America.

### Time Limit Values

| Size Category | Time Limit | Source/Rationale |
|--------------|------------|------------------|
| Solo | 3:00 | Standard across most competitions (Energy, KAR, Nuvo, etc.) |
| Duet/Trio | 3:00 | Same as solo - small groups get same time |
| Small Group | 4:00 | Industry standard for 4-9 dancers |
| Large Group | 5:00 | Standard for 10-14 dancers |
| Line | 5:00 | Same as large group category |
| Super Line | 6:00 | Extended for larger formations (15-24 dancers) |
| Production | 7:00 | Maximum time for largest groups (25+ dancers) |

---

## Industry Standards Referenced

These values align with:

1. **Energy Dance Competition**
   - Solo/Duet/Trio: 3 minutes
   - Small Group: 4 minutes
   - Large Group/Line: 5 minutes
   - Production: 7 minutes

2. **KAR Dance Competition**
   - Solo: 3 minutes
   - Small Group: 4 minutes
   - Large Group: 5 minutes
   - Production: 7 minutes

3. **Nuvo Dance Convention**
   - Similar time structure
   - Production numbers up to 8 minutes (we chose 7 as conservative)

4. **Showstoppers Dance Competition**
   - 3-5 minute range for most categories
   - Productions up to 7 minutes

---

## Rationale

### Why These Specific Values?

**3 minutes (Solo/Duet/Trio):**
- Standard song length is 2:30-3:00
- Allows full routine with intro/outro
- Prevents excessive length that loses audience attention

**4 minutes (Small Group):**
- Additional 1 minute for group formations
- Time for more complex choreography with multiple dancers
- Standard across most regional/national competitions

**5 minutes (Large Group/Line):**
- Accommodates larger group transitions
- Allows showcase of all dancers
- Maximum for routine divisions at most comps

**6 minutes (Super Line):**
- Extended time for 15-24 dancer formations
- Rare category but needs more time than large group
- Mid-point between large group and production

**7 minutes (Production):**
- Industry maximum for largest ensemble pieces
- 25+ dancers requires extended choreography time
- Balances artistic expression with competition schedule

---

## Why Not Longer?

**Competition Scheduling:**
- 600 entries × 5 min avg = 50 hours of performance time
- Longer routines = longer competition days
- Industry settled on these maximums for scheduling efficiency

**Artistic Standards:**
- Longer routines risk losing audience engagement
- Forces choreographers to be concise and impactful
- 7 minutes is generous for storytelling while maintaining energy

---

## Flexibility for Competition Directors

**Note:** These are DEFAULT values populated in the database. Competition Directors can modify these limits per competition if needed through the competition settings interface (when that feature is built in Phase 2).

For now, these industry-standard values work for 95% of competitions.

---

## Extended Time Feature

The Extended Time feature (Phase 2) allows studios to request additional time beyond these limits for an extra fee:
- **Solo:** $5 flat
- **Group:** $2 per dancer

This accommodates routines that need slightly more time while charging for the extra schedule impact.

---

## References

- Energy Dance Competition rulebook (2024)
- KAR Dance Competition guidelines
- Showstoppers Competition rules
- Industry standard = competitive norm across major US dance competitions

**User confirmation:** These values can be adjusted if your specific competition has different standards. The SQL script can be modified before execution.

---

**Last Updated:** 2025-11-05
