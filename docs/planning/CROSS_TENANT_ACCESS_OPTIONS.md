# Cross-Tenant Access Options

**Use Case:** Glow CD needs to build EMPWR schedule without financial/invoice access

## Option 1: New "Scheduler" Role (Cleanest)
Create a `scheduler` role that only sees scheduling features.

**Changes needed:**
- Add role check in dashboard: `if (role === 'scheduler')` → show only schedule link
- Hide invoice/financial routes for scheduler role
- ~30 min of work

## Option 2: Permission Flags (More Flexible)
Add `permissions` column to profile: `{ scheduling: true, invoices: false }`

**Changes needed:**
- Add `permissions` JSONB column to profiles
- Check permissions in UI components
- ~1-2 hours of work

## Option 3: Quick Hack - Just Hide in UI (Recommended)
Add her as CD but with a `scheduling_only` boolean flag.

**Changes needed:**
- Add `scheduling_only` boolean to profiles table
- If true, hide financial dashboard sections
- ~20 min of work

---

**Status:** Saved for later implementation
**Date:** 2025-12-19
