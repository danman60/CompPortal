# Competition Settings & Multi-Tenant Architecture Analysis

**Date:** October 30, 2025
**Analyst:** Claude Code
**Status:** Complete Deep Dive

---

## Executive Summary

CompPortal uses a **hybrid architecture** for competition settings with:
- ✅ **Tenant-scoped lookup tables** as the primary source of truth
- ⚠️ **Competition-specific JSONB overrides** for event customization
- ❌ **Global competition_settings table** (21 rows, NOT tenant-scoped, appears orphaned)

**Multi-tenant isolation:** ✅ **Working correctly** via lookup tables with `tenant_id`
**Data integrity:** ⚠️ **Some duplicates found** in EMPWR age_groups
**Settings UI:** ⚠️ **Disconnected** from runtime data

---

## Architecture Overview

### 1. Tenant-Scoped Lookup Tables (PRIMARY SOURCE OF TRUTH)

These tables store tenant-specific competition configuration:

```sql
-- Core lookup tables (ALL have tenant_id column)
age_groups              -- 20 rows (EMPWR: 12, Glow: 8)
dance_categories        -- 27 rows (EMPWR: 9, Glow: 18)
classifications         -- 9 rows (EMPWR: 5, Glow: 4)
entry_size_categories   -- 17 rows (EMPWR: 6, Glow: 11)
scoring_tiers           -- 11 rows (tenant-scoped scoring rubrics)
award_types             -- 44 rows (tenant-scoped awards)