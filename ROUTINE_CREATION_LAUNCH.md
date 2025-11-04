# Routine Creation Launch Plan

**Launch Date:** November 8, 2025
**Feature:** Studio Directors can create competition entries (routines)
**Impact:** All 58 studios across both tenants gain access to entry creation

---

## 🎯 Launch Overview

### What's Launching
**Routine Creation System** - Full suite of entry management tools:
- Manual entry creation (form-based)
- Batch entry creation (multiple routines at once)
- CSV import with validation and inline editing
- Entry editing and management
- Age group and entry size auto-detection
- Classification and dance category selection

### Who's Affected
- **58 studios** (27 EMPWR, 31 Glow)
- **4,348 entry spaces** already reserved
- **$29,000+ in deposits** collected

### Expected Behavior
- Studios will begin creating routines immediately on launch day
- CSV imports likely to be popular (studios have existing spreadsheets)
- Batch creation for studios with many routines
- Manual creation for smaller studios or single entries

---

## ✅ Pre-Launch Checklist (Days Before Launch)

### Nov 4-7: Monitoring & Verification

**Daily Checks:**
- [ ] Check production logs for any soft launch issues
- [ ] Verify no authentication problems reported
- [ ] Monitor dancer registration activity
- [ ] Check email delivery success rate
- [ ] Verify database performance metrics

**Nov 7 (Day Before Launch):**
- [ ] Run comprehensive entry creation test on both tenants
- [ ] Verify CSV import with sample files
- [ ] Test batch creation with 10+ entries
- [ ] Verify age group auto-detection working
- [ ] Verify entry size auto-detection working
- [ ] Test classification dropdown on both tenants
- [ ] Test dance category dropdown on both tenants
- [ ] Verify mobile forms working correctly
- [ ] Run Supabase security advisors
- [ ] Run Supabase performance advisors
- [ ] Check database backup status
- [ ] Verify rollback plan is ready

**System Verification:**
- [ ] Build passing (76/76 pages)
- [ ] No TypeScript errors
- [ ] All tRPC routes working
- [ ] Tenant isolation verified
- [ ] Email notifications functional

---

## 🚀 Launch Day Checklist (Nov 8, 2025)

### Morning (Before Studio Activity Peaks)
- [ ] Check overnight logs for any issues
- [ ] Verify all systems operational
- [ ] Test entry creation on both tenants (quick smoke test)
- [ ] Confirm monitoring dashboard accessible
- [ ] Have rollback plan ready (just in case)

### Active Monitoring (Throughout Day)
- [ ] Watch for entry creation errors in logs
- [ ] Monitor CSV import success/failure rates
- [ ] Track batch creation usage
- [ ] Check for validation error patterns
- [ ] Monitor database performance
- [ ] Watch email notification delivery
- [ ] Track tRPC mutation success rates

### Evening (End of Day)
- [ ] Review error logs for patterns
- [ ] Count successful entry creations
- [ ] Check CSV import usage statistics
- [ ] Verify no data corruption
- [ ] Document any issues for follow-up
- [ ] Plan fixes for any P1/P2 issues found

---

## 📊 Success Metrics

### Quantitative Metrics:
- **Entry Creation Success Rate:** Target >95%
- **CSV Import Success Rate:** Target >90%
- **Validation Error Rate:** Target <10%
- **System Uptime:** Target 100%
- **Response Time:** Target <2s for entry creation

### Qualitative Metrics:
- User feedback positive
- No critical bugs reported
- Studios able to complete workflows
- Mobile experience satisfactory
- CSV import intuitive enough

---

## 🐛 Common Issues & Troubleshooting

### Issue 1: CSV Import Fails
**Symptoms:** Users report CSV upload errors
**Likely Causes:**
- Incorrect file format (not .csv/.xls/.xlsx)
- Missing required columns
- Invalid date formats in birthdate column
- Corrupted Excel file

**Troubleshooting:**
1. Check error message in logs (includes file name)
2. Verify file format is supported
3. Check for required columns: First Name, Last Name, Date of Birth
4. Verify date format (MM/DD/YYYY, YYYY-MM-DD, DD.MM.YYYY supported)
5. Suggest user export from Excel as CSV and re-import

**Fix:** Guide user through export template, verify columns match

---

### Issue 2: Age Group/Entry Size Wrong
**Symptoms:** Auto-detection selects incorrect category
**Likely Causes:**
- Dancer birthdates missing or incorrect
- Competition date not set correctly
- Age calculation logic edge case

**Troubleshooting:**
1. Verify all dancers have valid birthdates
2. Check competition date in settings
3. Manually override age group selection (allowed)
4. Check logs for calculation details

**Fix:** User can manually select correct category

---

### Issue 3: Classification Dropdown Empty
**Symptoms:** Classification dropdown shows no options
**Likely Causes:**
- Tenant settings not configured
- Database query filtering issue
- Competition settings missing

**Troubleshooting:**
1. Check tenant_id in request
2. Verify competition has classifications configured
3. Check database: `SELECT * FROM classifications WHERE tenant_id = 'X'`
4. Verify tRPC context has correct tenant

**Fix:** Configuration issue, verify tenant settings

---

### Issue 4: Batch Creation Timeout
**Symptoms:** Batch creation with 50+ entries times out
**Likely Causes:**
- Too many entries at once
- Slow database transaction
- Network timeout

**Troubleshooting:**
1. Check transaction time in logs
2. Verify batch size (should be <100)
3. Check database performance metrics
4. Look for slow queries

**Fix:** Suggest breaking into smaller batches (25-30 entries)

---

### Issue 5: Validation Errors Not Clear
**Symptoms:** Users don't understand validation error messages
**Likely Causes:**
- Technical error messages shown to users
- Missing field not highlighted
- Unclear requirements

**Troubleshooting:**
1. Check which validation is failing
2. Verify error message is user-friendly
3. Check if field is highlighted in UI
4. Review validation logic

**Fix:** May need to improve error messaging (P2 enhancement)

---

## 🔥 Emergency Procedures

### Critical Bug Found (P0)
**Examples:**
- Data corruption
- Cross-tenant data leak
- Authentication failure
- Payment processing error

**Response:**
1. **STOP** - Don't deploy any fixes immediately
2. **Document** - Create BLOCKER_[issue].md with details
3. **Assess** - Is rollback needed?
4. **Communicate** - Notify user immediately
5. **Fix** - Implement minimal fix with testing
6. **Deploy** - Only after verification on both tenants

**Rollback Procedure:**
If critical issue requires disabling routine creation:
1. Deploy feature flag to disable entry creation UI
2. Show maintenance message to Studio Directors
3. Keep existing entries intact (read-only)
4. Fix issue in staging
5. Re-enable after verification

---

### High-Priority Bug (P1)
**Examples:**
- CSV import failing for all users
- Batch creation not saving entries
- Mobile forms unusable
- Validation blocking valid entries

**Response:**
1. **Document** - Log issue with reproduction steps
2. **Workaround** - Find temporary solution for users
3. **Fix** - Implement proper fix within 4 hours
4. **Test** - Verify on both tenants
5. **Deploy** - Push fix and monitor

---

### Medium-Priority Bug (P2)
**Examples:**
- Confusing error messages
- Minor UI issues
- Edge case validation problems
- Performance slow but functional

**Response:**
1. **Log** - Add to issue tracker
2. **Workaround** - Document for support team
3. **Schedule** - Fix in next maintenance window
4. **No rush** - Don't interrupt other work

---

## 📈 Post-Launch Activities

### First 24 Hours:
- Monitor all entry creation activity closely
- Respond to issues within 1 hour
- Document all bugs found
- Track success metrics
- Gather initial user feedback

### First Week:
- Review error patterns
- Identify common user pain points
- Plan UX improvements
- Optimize slow queries if found
- Prepare P2 enhancement list

### First Month:
- Analyze CSV import usage patterns
- Review batch creation statistics
- Plan Phase 2 features based on usage
- Consider performance optimizations
- Gather comprehensive user feedback

---

## 🎯 Success Criteria

**Launch Successful If:**
- ✅ Entry creation working for >95% of attempts
- ✅ No P0 bugs found
- ✅ CSV import functional for common formats
- ✅ Both tenants stable
- ✅ No data corruption
- ✅ Positive user feedback
- ✅ Studios able to complete workflows

**Launch Needs Attention If:**
- ⚠️ Success rate <90%
- ⚠️ Multiple P1 bugs reported
- ⚠️ CSV import failing frequently
- ⚠️ User feedback negative
- ⚠️ Performance issues reported

**Rollback Needed If:**
- 🔴 Data corruption detected
- 🔴 Cross-tenant leak found
- 🔴 Authentication completely broken
- 🔴 Critical security issue
- 🔴 System unusable for majority

---

## 📞 Support Response Templates

### CSV Import Error:
```
Thank you for reporting this. Can you please:
1. Verify your file is in .csv, .xls, or .xlsx format
2. Ensure you have columns: First Name, Last Name, Date of Birth
3. Check that dates are in MM/DD/YYYY format
4. Try exporting from Excel as CSV and re-importing

If the issue persists, please email your file to [support email]
and we'll help you troubleshoot.
```

### Age Group Incorrect:
```
The age group is auto-detected based on your dancers' birthdates
and the competition date. You can manually override this selection
in the entry form if the auto-detection isn't correct for your needs.
```

### Batch Creation Too Many:
```
For optimal performance, we recommend creating entries in batches
of 25-30 at a time. If you're importing 100+ routines, consider
using CSV import instead - it's optimized for large batches.
```

---

## 🔧 Monitoring Commands

### Check Entry Creation Rate:
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as entries_created,
  COUNT(DISTINCT studio_id) as studios_active
FROM competition_entries
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Check CSV Import Success Rate:
```sql
-- Check activity logs for CSV import events
SELECT
  action,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM activity_logs
WHERE action LIKE '%csv%import%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY action;
```

### Check Validation Errors:
```sql
-- Check logs for validation failures
SELECT
  error_type,
  COUNT(*) as occurrences
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND error_type LIKE '%validation%'
GROUP BY error_type
ORDER BY occurrences DESC;
```

### Check System Health:
```sql
-- Supabase advisors
SELECT * FROM security_advisors WHERE severity = 'high';
SELECT * FROM performance_advisors WHERE severity = 'high';

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

---

## 📝 Launch Day Log Template

### Morning Check (8 AM):
- [ ] Logs reviewed: [OK/Issues found]
- [ ] Systems operational: [Yes/No]
- [ ] Smoke test: [Pass/Fail]
- [ ] Notes: _____________

### Midday Check (12 PM):
- [ ] Entries created so far: _______
- [ ] CSV imports attempted: _______
- [ ] Errors logged: _______
- [ ] Issues requiring attention: _______

### Afternoon Check (3 PM):
- [ ] Active studios: _______
- [ ] Success rate: _______%
- [ ] Any patterns in errors: _______
- [ ] Action items: _______

### End of Day (6 PM):
- [ ] Total entries created: _______
- [ ] Success rate: _______%
- [ ] P0/P1 bugs found: _______
- [ ] P2 enhancements noted: _______
- [ ] Tomorrow's priorities: _______

---

**Prepared:** November 4, 2025
**Launch Date:** November 8, 2025
**Status:** ✅ Ready for launch monitoring
