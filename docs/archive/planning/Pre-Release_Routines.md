# Pre-Release Routines

**Date Created:** November 6, 2025
**Total Routines:** 38 (22 ALIVE, 16 CDA)
**Purpose:** Routines created before EntryFormV2 proper validation was implemented

---

## ALIVE DANCE COMPANY (22 Routines)

| Routine ID | Title |
|------------|-------|
| 70154a50-05db-4270-ba93-4c79330deaa4 | CAN'T TOUCH THIS |
| 74850da6-ef1d-4e35-abae-b2ce7a0b9a5b | DANGEROUS |
| c67df82b-b0dd-4de7-b177-ec6410a89caf | EXPRESS YOURSELF |
| 266c7def-620b-4027-9ef2-1958c54a0672 | GET UP! |
| b6a2385e-7293-4f1b-8f31-9e138bd44428 | GLAM |
| ea284786-c06f-4f1f-97a2-c1ef7d32ea08 | GOOD MORNING BALTIMORE |
| 8e1bea21-eaaa-4a06-93da-54f9abc840dc | HIT ME WITH A HOT NOTE |
| abfca6e8-62a2-4db6-8c48-a0d8d1fee9a7 | I LIKE TO MOVE IT |
| 8766d805-6b5e-4eb5-983f-a3235548612b | I SPEAK SIX LANGUAGES |
| 4328538a-e838-4467-92d5-60027aefc188 | I WANT TO BE A ROCKETTE |
| 236d1c6d-085d-4ce6-823e-b6317862b298 | I WILL WAIT |
| 4585de00-de7c-4976-aee4-260896614c48 | LES POISSONS |
| fa81f5e7-6ecb-415e-aa27-1dccfbe57eed | LET ME THINK ABOUT IT |
| 8fe79797-3e86-4f1a-affb-940c6a7dbb4a | MAKE YOU FEEL MY LOVE |
| d6a888f3-be51-453c-a31d-1963173b4363 | MAYBE THIS TIME |
| f5a2b667-39c3-4c7a-ba11-6b556ad29890 | PAPER MOON |
| 58c8dc2e-56be-4ba3-bb74-a6211bd1de2f | SHE'S IN LOVE  |
| 9659d72a-9d50-4cd3-9dd8-dc6c6bd067da | SORROW |
| c68e2caf-21b6-4d89-b783-025d8122f902 | THE GIRL IN 14G |
| 94213b5a-32ed-4722-8996-d167a536de4a | THE LADY IS A VAMP  |
| cbc4d2a4-6de9-49bb-a9ce-71a90202004f | Thing 1 and Thing 2 |
| bd7b8e6e-150c-4644-ae78-3cff826c6298 | WHAT IS THIS FEELING? |

---

## CDA (16 Routines)

| Routine ID | Title |
|------------|-------|
| 3376665e-8a4c-4e9e-8b93-91cd69910c2c | Dream |
| bd453b94-86bc-4a8d-8adb-f41325b59409 | Fire Burnin' |
| 9be835d5-0e37-4648-92cb-be5239fcb72c | Fix you |
| e03e100f-8a39-4fd9-aa59-a5ad6c6798fd | Friend Like Me |
| dba9dbb8-b2d0-4073-a338-3d334855d935 | Full Of Spice |
| 8b2a459b-90c7-496d-84da-0b75d2bfd443 | I Don't Speak French |
| 467adfbc-aee8-40c9-8548-bb8ed6fd43c7 | I Don't Wanna Be |
| 932301ab-9c0d-4b93-847b-23d0618ad8f1 | I Want It All |
| a3e54c7d-c545-47a0-86cc-6aee9bd8207d | Reaching For Cold Hands |
| a6e865e2-f16e-41db-9c6d-cf3543d2851f | Rise up |
| cdf68957-4438-426b-9ae8-aff497f6bfbd | Rockin Robin |
| d79ae636-7f41-498a-b2d4-d45aa0b2f152 | Rumor Has It |
| ce28b09c-2b04-4d51-a246-765c7baa0eb7 | Sea Cruise |
| 671ec9c7-bbbc-404f-8ff7-55e182062e37 | Take down |
| cc3413fb-539f-4521-8511-fd6081887aaf | Welcome to the Circus |
| 5381bb83-ff8c-4218-bdd7-3e73910b879b | Wild Horses |

---

## Classification Distribution

### ALIVE DANCE COMPANY
- **Competitive (skill_level 3):** 19 routines
- **Part-Time (skill_level 2):** 3 routines

### CDA
- **Sapphire (skill_level 2):** 11 routines
- **Crystal (skill_level 3):** 4 routines
- **Emerald (skill_level 1):** 2 routines (one routine misclassified - should be skill_level 2)

---

## Analysis Notes

All 38 routines analyzed in `ROUTINE_DATA_ANALYSIS.md` and verified against EntryFormV2 validation logic.

**Result:** ✅ All routines meet validation requirements (safe to keep)

**Issues Found:**
1. CDA routines missing `routine_age` field (cosmetic only)
2. Classification logic: EntryFormV2 auto-calculates from dancers, but these routines were manually assigned

**No deletions required.**
