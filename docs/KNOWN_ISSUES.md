# Known Issues & Limitations

**Last Updated**: October 16, 2025
**Status**: Pre-Testing Sprint
**Next Review**: After major testing week

---

## 🚨 Known Bugs (Being Fixed)

### None Currently
All critical bugs from last sprint have been resolved.

---

## ⚠️ Limitations (Expected Behavior - NOT Bugs)

### 1. **Reservation Capacity Enforcement**
**What testers might report**: "I can't create more routines even though I have space"

**Expected Behavior**:
- Studios can only create routines up to their `spaces_confirmed` limit
- If at limit, "Create Routine" button is disabled with tooltip
- This is intentional to prevent over-booking

**Workaround for Testing**:
- Competition Director can increase capacity via "Reduce Capacity" modal (works both ways)
- Or create a new reservation

---

### 2. **Invoice Visibility by Role**
**What testers might report**: "Studio Director can't see invoice after Competition Director creates it"

**Expected Behavior**:
- DRAFT invoices: Only Competition Directors can see (not sent yet)
- SENT invoices: Studio Directors can now see it
- PAID invoices: Everyone can see it

**Status Flow**: DRAFT → SENT (SD can see) → PAID (locked)

---

### 3. **Email Sending Delays**
**What testers might report**: "Email didn't arrive immediately"

**Expected Behavior**:
- Emails are sent asynchronously (non-blocking)
- May take 1-2 minutes to arrive
- Check spam folder
- Email failures are logged but don't block operations

**Verify**: Check browser console for "Email sent" logs

---

### 4. **Entry Numbers Assignment**
**What testers might report**: "Entry numbers are missing / not sequential"

**Expected Behavior**:
- Entry numbers assigned when reservation is approved (not at creation)
- Numbers may have gaps if entries are cancelled
- Late entries get suffix (e.g., #45A, #45B)

---

### 5. **Tax Calculation**
**What testers might report**: "Invoice has no tax"

**Expected Behavior**:
- Tax is ONLY applied if Competition Director sets `tax_rate` in Competition Settings
- Default is 0% (no tax)
- To test: Set tax_rate to 0.07 (7%) in competition settings

**Location**: Dashboard → Competitions → [Competition] → Settings → Tax Rate

---

### 6. **Incomplete Reservation Submission**
**What testers might report**: "System let me submit with fewer routines than reserved"

**Expected Behavior**:
- User gets WARNING modal showing unused spaces
- Can proceed if they understand spaces will be forfeited
- This is intentional flexibility (studios change plans)

---

### 7. **Music Upload Pending State**
**What testers might report**: "Music shows as pending forever"

**Expected Behavior**:
- Music uploads to Supabase Storage (may take 30-60 seconds for large files)
- If stuck, refresh page
- Check file size < 50MB
- Supported formats: MP3, WAV, M4A

---

## 🔧 Test Data Recommendations

### For Clean Testing
Run the database wipe script BEFORE testing:
```bash
# See: scripts/README_WIPE_DATABASE.md
# This creates fresh demo data:
# - 3 demo accounts (CD, SD1, SD2)
# - 1 competition (EMPWR Dance Challenge 2025)
# - 1 approved reservation
# - 5 sample dancers
```

### For Realistic Testing
- Create at least 2 studios
- Create at least 2 competitions (different dates)
- Test with 20-30 dancers per studio
- Test with 50-100 routines per competition
- Test late entries (entry_number already assigned)

---

## 🐛 How to Report Bugs

### Good Bug Report Template
```
**Summary**: [One sentence]

**Role**: Competition Director / Studio Director

**Steps to Reproduce**:
1. Go to [page]
2. Click [button]
3. Enter [data]

**Expected**: [What should happen]
**Actual**: [What actually happened]

**Screenshots**: [If applicable]
**Browser**: Chrome/Firefox/Safari [version]
**Console Errors**: [Open DevTools → Console tab, screenshot any red errors]
```

### Where to Report
- **Critical (app broken)**: Text/call immediately
- **High (workflow blocked)**: GitHub Issues with "bug" + "high-priority" labels
- **Medium/Low**: GitHub Issues with "bug" label
- **Questions**: Slack #compportal-testing channel

---

## 🧪 Testing Scenarios (Suggested Flow)

### Scenario 1: New Studio Registration
1. Sign up as new Studio Director
2. Complete onboarding (studio details)
3. Create 5 dancers
4. Request reservation (10 routines)
5. *Switch to Competition Director*
6. Approve reservation (allocate 8 routines)
7. *Switch back to Studio Director*
8. Create 8 routines with various categories/ages
9. Upload music for 5 routines
10. Submit summary

**Expected Outcome**: Studio Director sees pending invoice

### Scenario 2: Invoice Workflow
1. *Competition Director*: Create invoice from reservation
2. Verify invoice shows correct totals
3. Edit pricing if needed
4. Send invoice to Studio Director
5. *Studio Director*: View invoice, request changes
6. *Competition Director*: Edit prices, mark as paid
7. Verify invoice locked after PAID status

**Expected Outcome**: Complete invoice lifecycle without errors

### Scenario 3: Bulk Operations
1. Import 30 dancers via CSV
2. Create 50 routines using bulk assignment
3. Test bulk delete (with entries that have assignments)
4. Test filtering and searching
5. Test table sorting

**Expected Outcome**: All bulk operations complete successfully

---

## 📊 Performance Benchmarks

### Page Load Times (Expected)
- Dashboard: < 2 seconds
- Entries List (100 entries): < 3 seconds
- Reservation Pipeline: < 2 seconds
- Invoice Detail: < 1 second

**If slower**: Check network tab for slow queries, report with screenshots

### Database Query Limits
- Max entries per query: 100 (pagination)
- Max dancers per studio: No limit (tested to 1000+)
- Max reservations per competition: No limit

---

## 🚀 Browser Support

**Fully Supported**:
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

**Mobile**:
- iOS Safari 17+
- Android Chrome 120+

**Known Issues**:
- Internet Explorer: NOT SUPPORTED (use Edge instead)

---

## 📝 Environment Info

**Production URL**: https://comp-portal-one.vercel.app/
**Database**: Supabase (PostgreSQL 15)
**Framework**: Next.js 15.5.4
**Auth**: Supabase Auth

**Demo Accounts** (after running wipe script):
- Competition Director: cd@demo.com / password123
- Studio Director 1: sd1@demo.com / password123
- Studio Director 2: sd2@demo.com / password123

---

## 🔄 Reset Testing Environment

If testing environment gets messy:
1. Run database wipe: `scripts/wipe-database-keep-demos.sql`
2. Clear browser cache and cookies
3. Log out and log back in
4. Start fresh with clean demo data

---

## 💡 Tips for Effective Testing

### Do's ✅
- Test as both Competition Director AND Studio Director
- Try to "break" the system (invalid inputs, edge cases)
- Test on mobile devices (responsive design)
- Report UI/UX issues even if not "bugs"
- Take screenshots of any weirdness

### Don'ts ❌
- Don't test with production-like email addresses (use test@example.com)
- Don't create real studio/competition data during testing
- Don't skip steps in workflows (test complete flows)
- Don't assume "it's my fault" - report confusing UX

---

## 🆘 Emergency Contacts

**System Down (Production)**:
- [Your phone number]
- [Backup contact]

**Questions During Testing**:
- Slack: #compportal-testing
- Email: [your email]

**After Hours**:
- Non-urgent issues: GitHub Issues
- Urgent (blocking testing): Text [number]

---

**Happy Testing! 🎉**

*Remember: The goal is to find issues NOW, not in production. Break things!*
