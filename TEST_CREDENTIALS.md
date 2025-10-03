# CompPortal Test Credentials

## 🔐 Test Account for Human Testing

### Production URL
**https://comp-portal-one.vercel.app**

### Test User Login
```
Email: golden.tester@gmail.com
Password: SecurePass123!
```

**Account Status:** ✅ Email confirmed, fully activated

---

## 📊 Test Data Available

### Studios (3 total)
1. **Starlight Dance Academy** - APPROVED
   - 5 registered entries
   - 20 spaces confirmed

2. **Elite Performance Studio** - APPROVED
   - 3 confirmed entries + 1 draft
   - 15 spaces confirmed

3. **Rhythm & Motion Dance** - PENDING
   - No entries yet
   - Awaiting reservation approval

### Competitions (9 total)
- **GLOW Dance - Orlando (2026)** ← Most test data here
- GLOW Dance - Blue Mountain (June)
- GLOW Dance - St. Catharines (May)
- EMPWR Dance - London
- And 5 more...

### Competition Entries (9 total)
- 5 REGISTERED entries (Starlight)
- 3 CONFIRMED entries (Elite)
- 1 DRAFT entry (Rhythm Squad)

### Dancers (15 total)
- Test dancers available for entry creation
- Range: Petite to Teen age groups

---

## 🧪 Testing Workflows

### 1. Authentication Flow
1. Go to https://comp-portal-one.vercel.app
2. Click "Sign In"
3. Use credentials above
4. Should redirect to dashboard

### 2. Studio Owner Workflow
1. Login → Dashboard → Reservations
2. View pending reservation (Rhythm & Motion Dance)
3. Approve with 10 spaces (requires manual prompt input)
4. Verify token deduction

### 3. Entry Management
1. Login → Dashboard → Entries
2. View list of 9 entries
3. Click entry to view details (NEW - being built)
4. Edit entry information (NEW - being built)
5. Upload music via 🎵 Music button

### 4. Judge & Scoring (from previous testing)
1. Login → Dashboard → Judges
2. Create judge and assign to competition
3. Login → Dashboard → Scoring
4. Select judge and competition
5. Score entries (Technical, Artistic, Performance)

### 5. Analytics & Scoreboard
1. Login → Dashboard → Scoreboard
2. Select competition to view rankings
3. View detailed score breakdowns
4. Login → Dashboard → Analytics
5. Review system metrics and insights

---

## ⚠️ Known Limitations

### Email Domains
- ✅ Works: @gmail.com, @outlook.com, other major providers
- ❌ Rejected: @test.com, @example.com, disposable domains
- **Reason:** Supabase email validation

### Playwright Testing Issues
- Button clicks may not work in automated tests
- Use JavaScript `element.click()` as workaround
- Dialog prompts (approve/reject) require manual testing

### Missing Pages (Being Fixed Now)
- ❌ Entry View (`/dashboard/entries/{id}`) - 404
- ❌ Entry Edit (`/dashboard/entries/{id}/edit`) - 404
- ✅ Entry Music Upload - Working

---

## 🔄 Creating New Test Users

To create additional test accounts:

1. Go to https://comp-portal-one.vercel.app/signup
2. Use `{username}@gmail.com` format
3. Password: Minimum 6 characters
4. Email confirmation required (check inbox)

**OR** manually confirm via Supabase:
```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'your-test-email@gmail.com';
```

---

## 📝 Test Scenarios

### Scenario 1: Studio Director Registration
1. Create account with @gmail.com email
2. Navigate to Studios
3. Register new studio
4. Create reservation for competition
5. Wait for admin approval

### Scenario 2: Competition Entry Creation
1. Login as studio owner
2. Navigate to Entries → Create Entry
3. Fill in details (title, category, dancers)
4. Upload music file (MP3, WAV, M4A, AAC)
5. Submit entry

### Scenario 3: Competition Director Approval
1. Login as competition director
2. Navigate to Reservations
3. Review pending studio requests
4. Approve/reject with reason
5. Verify token allocation

---

## 🐛 Bug Reporting

If you encounter issues during testing:

1. **Note the URL** where error occurred
2. **Open browser console** (F12 → Console tab)
3. **Screenshot the error** including console output
4. **Document steps to reproduce**

Common issues to watch for:
- 404 errors on navigation
- Form submissions not working
- Data not loading
- Authentication loops

---

**Last Updated:** 2025-10-03
**Environment:** Production (Vercel)
**Database:** Supabase PostgreSQL
**Authentication:** Supabase Auth
