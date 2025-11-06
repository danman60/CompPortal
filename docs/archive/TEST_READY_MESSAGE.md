# Test Environment Ready - Invoice Workflow Complete Test

## ✅ Starting Conditions Met

A new approved reservation has been created for the test:

**Reservation Details:**
- **Reservation ID:** `a5942efb-6f8b-42db-8415-79486e658597`
- **Studio:** Test Studio - Daniel
- **Competition:** EMPWR Dance - London
- **Status:** approved ✅
- **Spaces Confirmed:** 50 ✅
- **Entry Count:** 0 (fresh start) ✅
- **Tenant:** EMPWR (00000000-0000-0000-0000-000000000001)

## 📋 Test Protocol

**File to execute:** `D:\ClaudeCode\CompPortal\INVOICE_WORKFLOW_COMPLETE_TEST.md`

**Test phases (6 total):**
1. ✅ Phase 0: Verify Starting Conditions - **READY**
2. Phase 1: Studio Creates Routines (5 manual + 10 CSV import)
3. Phase 2: SD Submits Summary
4. Phase 3: CD Reviews Summaries
5. Phase 4: CD Creates Invoice
6. Phase 5: SD Views Invoice
7. Phase 6: CD Marks Invoice as Paid

## 🎯 Test Data

**CSV File:** `D:\ClaudeCode\CompPortal\test_routines_15.csv`
- Contains 15 routines (Solo, Duo, Trio, Small Group, Large Group)
- Mix of Junior, Teen, Senior age divisions
- Realistic dancer names and DOBs

**Test Approach:**
- Create 5 routines manually via UI
- Import 10 routines via CSV import
- Total: 15 routines using 15 of 50 spaces
- Unused capacity: 35 spaces (will be refunded on summary)

## 🔑 Login Credentials

**Studio Director (SD):**
- Email: `danieljohnabrahamson@gmail.com`
- Password: `123456`
- Use for: Creating dancers, creating routines, submitting summary

**Competition Director (CD):**
- Email: `empwrdance@gmail.com`
- Password: `1CompSyncLogin!`
- Use for: Reviewing summaries, creating invoice, marking as paid

## 🌐 Environment

**URL:** https://empwr.compsync.net
**Tenant:** EMPWR (00000000-0000-0000-0000-000000000001)

## ⚠️ Important Notes

1. **Use ONLY the UI** - No SQL workarounds allowed
2. **Test on production** - Use Playwright MCP on empwr.compsync.net
3. **Document blockers** - If any phase fails, stop and document
4. **Verify each phase** - Screenshot evidence for each completed phase
5. **Expected total:** $3,600 (15 routines × $240 per routine)

## 🚀 Ready to Start

All prerequisites are met. You may begin Phase 0 verification and proceed through the complete workflow test.

---

**Created by:** Claude (Session 35)
**Date:** November 5, 2025
**Reservation created via:** SQL (approved status, fresh start)
