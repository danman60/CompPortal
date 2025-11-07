# Glow Dance Competition - Tenant Settings Configuration

**Prepared For:** Glow Dance Competition Onboarding  
**Source:** Website crawl of https://www.glowdancecomp.com/  
**Date:** October 26, 2025  
**Status:** ⚠️ PARTIAL - Some settings require confirmation from client

---

## Organization Information

```json
{
  "organization": {
    "name": "Glow Dance Competition",
    "legal_name": "Luv 2 Dance",
    "subdomain": "glow",
    "tagline": "An Exciting NEW Unique Competition Experience in 🇨🇦",
    "country": "Canada",
    "primary_region": "Ontario"
  }
}
```

---

## Branding Configuration

```json
{
  "branding": {
    "primaryColor": "#FF1493",
    "secondaryColor": "#FFD700",
    "logo": "https://static.wixstatic.com/media/6d8693_d9a1d69f9ec14e92b21bfa7f4f8318fc~mv2.jpg",
    "tagline": "An Exciting NEW Unique Competition Experience",
    "theme": "vibrant-glow"
  }
}
```

**Notes:**
- Primary color appears to be hot pink/magenta based on branding
- Secondary color appears to be gold/yellow (glow theme)
- Logo URL extracted from website
- Request confirmation on exact hex codes from client

---

## Age Divisions Configuration

Based on the Title Division page, Glow uses these age divisions:

```json
{
  "age_divisions": [
    {
      "id": "tiny",
      "name": "Tiny",
      "min_age": 0,
      "max_age": 6,
      "description": "6 & Under"
    },
    {
      "id": "mini",
      "name": "Mini",
      "min_age": 7,
      "max_age": 8,
      "description": "7-8 Years"
    },
    {
      "id": "pre-junior",
      "name": "Pre-Junior",
      "min_age": 9,
      "max_age": 10,
      "description": "9-10 Years"
    },
    {
      "id": "junior",
      "name": "Junior",
      "min_age": 11,
      "max_age": 12,
      "description": "11-12 Years"
    },
    {
      "id": "teen",
      "name": "Teen",
      "min_age": 13,
      "max_age": 14,
      "description": "13-14 Years"
    },
    {
      "id": "senior",
      "name": "Senior",
      "min_age": 15,
      "max_age": 99,
      "description": "15+ Years"
    }
  ]
}
```

**Note:** These age divisions differ from EMPWR's standard divisions (notably Pre-Junior instead of Petite, and Teen is 13-14 only vs EMPWR's 15-17).

---

## Levels Configuration

⚠️ **NOT FOUND ON WEBSITE** - Need to confirm with client

Based on Title Division page: "ALL LEVELS ARE COMBINED FOR THE REGIONAL TITLE DIVISION"

This suggests they have multiple levels, but the specific level names and criteria were not found on the public website.

**Recommended to ask client:**
- Do you use Recreational/Competitive/Elite levels?
- Or Novice/Intermediate/Advanced?
- Or a different level structure?
- What are the training hour requirements per level?

**Placeholder Configuration (to be confirmed):**

```json
{
  "levels": [
    {
      "id": "recreational",
      "name": "Recreational",
      "description": "⚠️ CONFIRM WITH CLIENT"
    },
    {
      "id": "competitive",
      "name": "Competitive",
      "description": "⚠️ CONFIRM WITH CLIENT"
    },
    {
      "id": "elite",
      "name": "Elite",
      "description": "⚠️ CONFIRM WITH CLIENT"
    }
  ]
}
```

---

## Categories Configuration

⚠️ **NOT FOUND ON WEBSITE** - Need to confirm with client

Title Division page mentions: "for title we do not combine categories" but doesn't list what the categories are.

**Recommended to ask client:**
- Do you use Performance/Championship categories?
- Or a different category structure?
- Are categories optional or required for all entries?

**Placeholder Configuration (to be confirmed):**

```json
{
  "categories": [
    {
      "id": "performance",
      "name": "Performance",
      "description": "⚠️ CONFIRM WITH CLIENT"
    },
    {
      "id": "championship",
      "name": "Championship",
      "description": "⚠️ CONFIRM WITH CLIENT"
    }
  ]
}
```

---

## Dance Styles Configuration

⚠️ **NOT FOUND ON WEBSITE** - Need to confirm with client

Website doesn't list specific dance styles/genres they accept.

**Recommended to ask client:**
What dance styles do you accept? Common styles include:
- Jazz
- Contemporary
- Lyrical
- Ballet
- Tap
- Hip Hop
- Musical Theatre
- Acro
- Open

**Placeholder Configuration (industry standard, to be confirmed):**

```json
{
  "styles": [
    {
      "id": "jazz",
      "name": "Jazz"
    },
    {
      "id": "contemporary",
      "name": "Contemporary"
    },
    {
      "id": "lyrical",
      "name": "Lyrical"
    },
    {
      "id": "ballet",
      "name": "Ballet"
    },
    {
      "id": "tap",
      "name": "Tap"
    },
    {
      "id": "hip-hop",
      "name": "Hip Hop"
    },
    {
      "id": "musical-theatre",
      "name": "Musical Theatre"
    },
    {
      "id": "acro",
      "name": "Acro"
    },
    {
      "id": "open",
      "name": "Open"
    }
  ]
}
```

---

## Group Size Rules Configuration

Based on Awards page listing: Soloists, Duets/Trios, Groups, Lines/Productions

```json
{
  "group_size_rules": {
    "solo": 1,
    "duo": 2,
    "trio": 3,
    "small_group_min": 4,
    "small_group_max": 9,
    "large_group_min": 10,
    "large_group_max": 19,
    "line_min": 20,
    "line_max": 29,
    "production_min": 30
  }
}
```

**Note:** Exact breakdowns not specified on website. These are estimated based on industry standards. Need client confirmation on:
- Where does "Duets/Trios" end and "Groups" begin?
- What's the cutoff between Groups, Lines, and Productions?

---

## Pricing Configuration

⚠️ **NOT FOUND ON WEBSITE** - Need to confirm with client

Website rules mention:
- "There is a fee to upgrade a Solo to Title"
- Entry fees/deposits required
- Late fee: 10% after deadline

But specific pricing not listed publicly.

**Required from client:**
- Entry fee per routine: $______
- Title upgrade fee: $______
- Any other fees (duet/trio, group size surcharges, etc.)

**Placeholder (use EMPWR defaults until confirmed):**

```json
{
  "pricing": {
    "global_entry_fee": 50.00,
    "title_upgrade_fee": 30.00,
    "tax_rate": 0.13,
    "late_fee_percentage": 0.10
  }
}
```

---

## Special Features & Rules

### Title Competition

Glow offers a special Title Competition with these characteristics:

```json
{
  "title_competition": {
    "enabled": true,
    "age_divisions": [
      "Tiny (6 & Under)",
      "Mini (7-8)",
      "Pre-Junior (9-10)",
      "Junior (11-12)",
      "Teen (13-14)",
      "Senior (15+)"
    ],
    "levels_combined": true,
    "scoring_criteria": {
      "technique": 20,
      "stage_presence": 20,
      "execution_of_choreography": 20,
      "costume": 20,
      "overall_entertainment_value": 20
    },
    "max_score_per_judge": 100,
    "number_of_judges": 3,
    "awards": {
      "winner": {
        "custom_award": true,
        "light_up_angel_wings": true,
        "glow_dance_experience_scholarship": true
      }
    }
  }
}
```

### Key Business Rules from Website

```json
{
  "business_rules": {
    "registration": {
      "deadline": "December 23rd (for following season)",
      "late_fee": "10% - strictly enforced",
      "deposits_non_refundable": true,
      "payment_deadline_canada": "December 23rd",
      "payment_deadline_usa": "60 days prior to event"
    },
    "performance_rules": {
      "no_duplicate_solos": true,
      "description": "Same contestant cannot compete more than once in same category and age range in Solos or Duet/Trios",
      "incomplete_routines": "adjudicated only (not eligible for overall awards)",
      "stage_ready_time": "30 minutes prior to scheduled time",
      "music_cued_required": true
    },
    "safety_rules": {
      "no_liquids_gels_glitter": true,
      "no_dangerous_props": true,
      "max_height_off_ground": "6 feet (requires prior approval)",
      "no_live_animals": true,
      "no_fire_pyrotechnics": true,
      "no_sharp_objects": true
    },
    "content_rules": {
      "family_appropriate_required": true,
      "inappropriate_becomes_adjudicated_only": true,
      "age_appropriate_music_costume": true
    },
    "credits_and_scholarships": {
      "glow_dance_dollars_expire_consecutive_season": true,
      "free_routine_scholarships_expire_consecutive_season": true,
      "non_transferable": true,
      "doctor_note_required_for_injury_credit": true
    }
  }
}
```

---

## Competition Schedule & Locations

Based on 2026 tour dates:

```json
{
  "2026_season": {
    "events": [
      {
        "city": "Orlando, FL",
        "dates": "February 20th-22nd",
        "capacity": "50% FULL"
      },
      {
        "city": "St. Catharines, ON",
        "dates": "April 9th-12th",
        "capacity": "80% FULL"
      },
      {
        "city": "Blue Mountain, ON",
        "dates": "April 23rd-26th",
        "capacity": "SOLD OUT"
      },
      {
        "city": "Toronto, ON",
        "dates": "May 8th-10th",
        "venue": "Sheraton Toronto Airport Hotel & Conference Centre",
        "capacity": "SOLD OUT"
      },
      {
        "city": "St. Catharines, ON",
        "dates": "May 14th-17th",
        "capacity": "50% FULL"
      },
      {
        "city": "Blue Mountain, ON",
        "dates": "June 4th-7th",
        "capacity": "80% FULL"
      }
    ]
  }
}
```

---

## Complete Tenant Configuration (SQL Insert)

```sql
-- Create Glow Dance Competition tenant
INSERT INTO tenants (id, slug, subdomain, name, branding)
VALUES (
  gen_random_uuid(),
  'glow',
  'glow',
  'Glow Dance Competition',
  '{
    "primaryColor": "#FF1493",
    "secondaryColor": "#FFD700",
    "logo": "https://static.wixstatic.com/media/6d8693_d9a1d69f9ec14e92b21bfa7f4f8318fc~mv2.jpg",
    "tagline": "An Exciting NEW Unique Competition Experience"
  }'::jsonb
)
RETURNING id;

-- Create competition settings (using tenant ID from above)
INSERT INTO competition_settings (
  tenant_id,
  global_entry_fee,
  title_upgrade_fee,
  tax_rate,
  age_divisions,
  levels,
  categories,
  styles,
  group_size_rules
)
VALUES (
  '[TENANT_ID_FROM_ABOVE]',
  50.00,  -- ⚠️ CONFIRM WITH CLIENT
  30.00,  -- ⚠️ CONFIRM WITH CLIENT
  0.13,   -- Standard Canadian tax
  '[
    {"id": "tiny", "name": "Tiny", "min_age": 0, "max_age": 6},
    {"id": "mini", "name": "Mini", "min_age": 7, "max_age": 8},
    {"id": "pre-junior", "name": "Pre-Junior", "min_age": 9, "max_age": 10},
    {"id": "junior", "name": "Junior", "min_age": 11, "max_age": 12},
    {"id": "teen", "name": "Teen", "min_age": 13, "max_age": 14},
    {"id": "senior", "name": "Senior", "min_age": 15, "max_age": 99}
  ]'::jsonb,
  '[
    {"id": "recreational", "name": "Recreational"},
    {"id": "competitive", "name": "Competitive"},
    {"id": "elite", "name": "Elite"}
  ]'::jsonb,  -- ⚠️ CONFIRM WITH CLIENT
  '[
    {"id": "performance", "name": "Performance"},
    {"id": "championship", "name": "Championship"}
  ]'::jsonb,  -- ⚠️ CONFIRM WITH CLIENT
  '[
    {"id": "jazz", "name": "Jazz"},
    {"id": "contemporary", "name": "Contemporary"},
    {"id": "lyrical", "name": "Lyrical"},
    {"id": "ballet", "name": "Ballet"},
    {"id": "tap", "name": "Tap"},
    {"id": "hip-hop", "name": "Hip Hop"},
    {"id": "musical-theatre", "name": "Musical Theatre"},
    {"id": "acro", "name": "Acro"},
    {"id": "open", "name": "Open"}
  ]'::jsonb,  -- ⚠️ CONFIRM WITH CLIENT
  '{
    "solo": 1,
    "duo": 2,
    "trio": 3,
    "small_max": 9,
    "large_min": 10
  }'::jsonb  -- ⚠️ CONFIRM WITH CLIENT
);
```

---

## Questions for Client (Follow-Up Email)

**Subject:** Glow Dance Competition - Additional Information Needed for Setup

Hi [Contact Name],

I've reviewed the Glow Dance Competition website and prepared your tenant configuration based on the information available. However, I need confirmation on a few details that weren't listed publicly on your website:

### 1. **Skill Levels**
Your Title Division page mentions "all levels are combined," but doesn't specify what your levels are. Can you confirm:
- [ ] Do you use Recreational / Competitive / Elite?
- [ ] Or Novice / Intermediate / Advanced?
- [ ] Or a different level structure?
- What are the training hour requirements for each level?

### 2. **Dance Categories**
Do you use:
- [ ] Performance / Championship categories?
- [ ] A different category structure?
- [ ] No categories (all entries compete together)?

### 3. **Dance Styles/Genres**
What dance styles do you accept? Please check all that apply:
- [ ] Jazz
- [ ] Contemporary
- [ ] Lyrical
- [ ] Ballet
- [ ] Tap
- [ ] Hip Hop
- [ ] Musical Theatre
- [ ] Acro
- [ ] Open
- [ ] Other: _____________

### 4. **Group Size Breakdowns**
Can you confirm where these breakdowns occur:
- Solo: 1 dancer
- Duet/Trio: 2-3 dancers
- Small Group: _____ to _____ dancers
- Large Group: _____ to _____ dancers
- Line: _____ to _____ dancers
- Production: _____ + dancers

### 5. **Pricing**
- Entry fee per routine: $_______
- Title upgrade fee: $_______
- Any other fees (group size surcharges, etc.): _______

### 6. **Brand Colors**
Can you provide exact hex codes for:
- Primary brand color: #_____________
- Secondary brand color: #_____________

### 7. **Logo**
Do you have a high-resolution logo file (PNG with transparent background preferred)?
- [ ] Yes, attached
- [ ] Yes, here's the link: _____________
- [ ] Use the logo from our website
- [ ] We don't have a high-res version

### 8. **Contact Information**
- Primary CD Name: _____________
- Primary CD Email: _____________
- Phone: _____________

Once I receive this information, I can complete your tenant setup within 24-48 hours!

Best regards,  
Daniel

---

## Summary of Data Quality

| Category | Status | Confidence | Action Required |
|----------|--------|------------|-----------------|
| Organization Name | ✅ Complete | High | None |
| Branding Colors | ⚠️ Estimated | Medium | Confirm hex codes |
| Logo | ✅ Complete | High | Request high-res version |
| Age Divisions | ✅ Complete | High | None - extracted from Title page |
| Levels | ❌ Missing | N/A | Request from client |
| Categories | ❌ Missing | N/A | Request from client |
| Styles | ❌ Missing | N/A | Request from client |
| Group Sizes | ⚠️ Partial | Medium | Confirm exact breakdowns |
| Pricing | ❌ Missing | N/A | Request from client |

**Overall Completeness: 40%**

**Critical Missing Information:**
1. Skill levels structure
2. Category structure  
3. Dance styles accepted
4. Exact group size breakdowns
5. Pricing structure

**Recommendation:** Send follow-up email (template above) to collect missing information before finalizing tenant setup.

---

**Document Status:** DRAFT - Requires Client Confirmation  
**Prepared By:** Daniel  
**Date:** October 26, 2025  
**Next Steps:** 
1. Send follow-up email to client
2. Receive missing information
3. Finalize tenant configuration
4. Create tenant in database
5. Set up CD user account
