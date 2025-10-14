# Smart Fuzzy Import Wizard (Routines + Dancers)

Seamless spreadsheet import for routines and dancers with fuzzy column mapping, data normalization, preview (dry‑run), and safe commit — designed to eliminate exact‑header requirements and reduce user friction.

## Summary

The Smart Fuzzy Import Wizard lets users import `.xls/.xlsx/.csv` files without exact schema headers. It auto‑maps columns using fuzzy logic and type inference, prompts users only for low‑confidence mappings, handles multi‑value cells (e.g., multiple dancers in a single cell), and performs a dry‑run preview before commit. Successful mappings can be saved as templates per tenant/studio for one‑click re‑use.

## Goals

- Fuzzy header mapping with confidence scoring and synonyms
- Multi‑value cell support (split by delimiter + name parsing)
- Robust validation and deduplication suggestions (e.g., dancers by name+DOB)
- Non‑blocking dry‑run with clear errors and quick fixes
- Template/save mappings for recurring file formats per tenant/studio

## Non‑Goals (Initial)

- Automatic schema migrations
- Full in‑browser XLS parsing at large scale (parsing is server‑side)

## User Flow

1. Upload: user drops a file; server parses and returns detected headers and a sample
2. Auto‑Map: system proposes mappings with confidence; user adjusts only low‑confidence ones
3. Split/Transform: user optionally splits multi‑value columns (e.g., participants) with live preview
4. Preview (Dry‑Run): first N rows normalized; show errors, unmatched lookups, and dedup candidates
5. Commit: background import with progress and result log; offer to save mapping as a template

## UI Outline (Components)

- `ImportWizard.tsx`: Wizard shell (steps, progress, commit)
- `ColumnMapper.tsx`: Mapping table with confidence badges, target field selects, and transformers
- `SplitPreview.tsx`: Configure split delimiters/patterns; live preview
- `PreviewGrid.tsx`: Dry‑run preview with error badges and fix shortcuts

## Backend API (tRPC)

- `import.preview({ fileId, entity, mappingConfig })` → normalized rows, errors, lookup misses, dedup candidates
- `import.commit({ fileId, entity, mappingConfig, strategy })` → writes rows in batches; returns stats + log
- `import.templates.*` → list/save/apply mapping templates per tenant/studio

## Fuzzy Mapping Logic

- Signals per source column → target field:
  - Header similarity: normalize + Jaro‑Winkler/Levenshtein + token overlap
  - Type inference: date/email/phone/currency/enums; sample values boost likely targets
  - Context: file name hints (e.g., ‘dancers’, ‘entries’/‘routines’)
- Confidence thresholds: High (auto), Medium (pre‑select + badge), Low (unmapped)
- Synonyms dictionary: curated aliases for common fields (see `fieldSynonyms.ts`)

## Data Model Targets

- Dancers (subset): `first_name`, `last_name`, `date_of_birth`, `email`, `phone`, `gender`, `studio_code`
- Routines: `title`, `dance_category`, `classification`, `age_group`, `entry_size_category`, `choreographer`, `props/special_requirements`

## Validation & Dedup

- Validators: date formats, email, phone, enums (category/classification names)
- Dedup: dancers by (first_normalized, last_normalized, dob) with fuzzy distance; present merge/skip

## Performance & Robustness

- Server‑side parse (SheetJS/xlsx); stream large files
- Preview only first N rows (configurable); import in batches with transactional safety where possible
- Logging, partial failure reporting, resumable on network hiccups

## Security

- Validate MIME/size; virus‑scan via provider if available
- Per‑tenant isolation; enforce RLS/authorization in commit phase

## Milestones

1. Core mapping library + preview API (1–2 days)
2. Wizard UI + column mapper + split preview (2–3 days)
3. Validation/dedup + commit API (2–3 days)
4. Templates + polish + docs (1–2 days)

## Review Notes

This PR adds design docs and scaffolding (server router + UI skeleton + mapping utilities). The router is not registered in app yet (to avoid runtime changes) — ready to wire post‑review.

