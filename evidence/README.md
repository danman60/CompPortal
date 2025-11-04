# Evidence Archive

**Purpose:** Store verification artifacts for completed features and bug fixes

---

## 📁 Folder Structure

```
evidence/
├── screenshots/     # Production UI screenshots showing feature working
├── queries/         # SQL query results demonstrating data correctness
└── reports/         # Test reports, performance metrics, verification logs
```

---

## 📋 Guidelines

### File Naming Convention
- **Screenshots:** `[feature]-[tenant]-[YYYYMMDD].png`
  - Example: `csv-import-empwr-20251104.png`
  - Example: `batch-creation-glow-20251108.png`

- **Query Results:** `[query-type]-[YYYYMMDD].sql` or `.txt`
  - Example: `entry-counts-20251108.txt`
  - Example: `tenant-isolation-check-20251104.sql`

- **Reports:** `[report-type]-[YYYYMMDD].md`
  - Example: `launch-verification-20251108.md`
  - Example: `performance-test-20251110.md`

### What to Store Here
- ✅ Production screenshots proving features work
- ✅ SQL query results for data verification
- ✅ Browser console logs (clean, no errors)
- ✅ Performance test results
- ✅ Multi-tenant verification proof

### What NOT to Store Here
- ❌ Local development screenshots (production only)
- ❌ Sensitive data (passwords, API keys, tokens)
- ❌ Large files >5MB (link to external storage instead)
- ❌ Temporary debug screenshots (use docs/temp instead)

---

## 📝 Usage in Commits

**Reference evidence in commit messages:**

```bash
git commit -m "feat: CSV import validation

- Add birthdate format validation (RoutineCSVImport.tsx:234-267)
- Add real-time error highlighting (RoutineCSVImport.tsx:312-334)

✅ Build pass. Verified: EMPWR ✓ Glow ✓
Evidence: evidence/screenshots/csv-import-empwr-20251104.png

🤖 Claude Code"
```

---

## 🗄️ Archive Policy

**Monthly Cleanup:**
- Keep evidence for current month + 1 previous month
- Archive older evidence to `docs/archive/evidence-[YYYY-MM]/`
- Compress screenshots before archiving (PNG → optimized PNG)

**Example:**
```bash
# On Dec 1, 2025:
mkdir docs/archive/evidence-2025-10/
mv evidence/screenshots/*-202510*.png docs/archive/evidence-2025-10/
mv evidence/queries/*-202510*.txt docs/archive/evidence-2025-10/
```

---

## 🎯 Verification Checklist

**Before marking feature complete:**
1. [ ] Screenshot captured on EMPWR tenant
2. [ ] Screenshot captured on Glow tenant
3. [ ] Browser console checked (no errors)
4. [ ] SQL verification query run (if data changes)
5. [ ] Evidence files saved with proper naming
6. [ ] Evidence referenced in commit message

---

**Created:** November 4, 2025
**Maintained By:** Development team following CLAUDE.md protocols
