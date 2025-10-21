# Verified Chatwoot Tokens

**Date**: October 21, 2025
**Source**: Chatwoot Dashboard Widget Scripts

---

## ✅ Correct Tokens (Use These in Vercel)

| Chat Path | Inbox Name | Vercel Environment Variable | Correct Token |
|-----------|-----------|---------------------------|---------------|
| CD → SA | CD Tech Support | `NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN` | `irbih1LmxkGRoPAxqy1iZhrY` |
| SD → CD | SD to CD Questions | `NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN` | `Q5oZfrxnEEMSQx54MhP7rnZa` |
| SD → SA | SD Tech Support | `NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN` | `AqBfYtvETJEV6VSe5qe8GC7S` |

---

## ❌ Old Tokens (Currently in Vercel - WRONG)

From `vercel-env-import.txt`:

| Chat Path | Old Token (WRONG) | Correct Token |
|-----------|-------------------|---------------|
| CD → SA | `irbhliLmxlGRoPAxqyIiZhrY` | `irbih1LmxkGRoPAxqy1iZhrY` |
| SD → CD | `Q5OzfrxnEMEQxS4MHp7rnZa` | `Q5oZfrxnEEMSQx54MhP7rnZa` |
| SD → SA | `AqBFyfVtETJEV6Ve5qe86C7S` | `AqBfYtvETJEV6VSe5qe8GC7S` |

---

## 🔧 Fix Instructions

### Step 1: Update Vercel Environment Variables

Go to: https://vercel.com/danman60s-projects/comp-portal/settings/environment-variables

For each variable:

#### 1. NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN
- Click **Edit**
- **Delete old value**: `irbhliLmxlGRoPAxqyIiZhrY`
- **Paste new value**: `irbih1LmxkGRoPAxqy1iZhrY`
- Select: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

#### 2. NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN
- Click **Edit**
- **Delete old value**: `Q5OzfrxnEMEQxS4MHp7rnZa`
- **Paste new value**: `Q5oZfrxnEEMSQx54MhP7rnZa`
- Select: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

#### 3. NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN
- Click **Edit**
- **Delete old value**: `AqBFyfVtETJEV6Ve5qe86C7S`
- **Paste new value**: `AqBfYtvETJEV6VSe5qe8GC7S`
- Select: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

### Step 2: Verify Base URL

Also verify this variable is set correctly:

**NEXT_PUBLIC_CHATWOOT_BASE_URL**
- Value should be: `https://chat.compsync.net`
- **NOT** `http://159.89.115.95:3000`
- Must be HTTPS, not HTTP

### Step 3: Wait for Automatic Redeploy

After saving all 3 tokens:
- Vercel will automatically trigger a redeploy
- Wait ~2-3 minutes for deployment to complete
- Check: https://vercel.com/danman60s-projects/comp-portal

### Step 4: Test Widget

Once deployed:

1. **Visit production site**: https://comp-portal-one.vercel.app
2. **Login as Competition Director**
3. **Click Support button** (bottom right)
4. **Widget should load immediately**
5. **Send test message**: "Testing widget"
6. **Check Chatwoot dashboard**: Message should appear in CD Tech inbox

7. **Login as Studio Director**
8. **Click Support button**
9. **Choose "Technical Support"** (purple)
10. **Widget should load**
11. **Send test message**
12. **Check Chatwoot dashboard**: Message should appear in SD Tech inbox

13. **Click Support button again**
14. **Choose "Competition Director"** (blue)
15. **Widget should load**
16. **Send test message**
17. **Check Chatwoot dashboard**: Message should appear in SD to CD inbox

---

## 🔍 Verification Tests

After updating tokens, test each endpoint:

```bash
# Test CD Tech token
curl "https://chat.compsync.net/widget?website_token=irbih1LmxkGRoPAxqy1iZhrY"
# Should return JSON config, NOT "Retry later"

# Test SD→CD token
curl "https://chat.compsync.net/widget?website_token=Q5oZfrxnEEMSQx54MhP7rnZa"
# Should return JSON config, NOT "Retry later"

# Test SD Tech token
curl "https://chat.compsync.net/widget?website_token=AqBfYtvETJEV6VSe5qe8GC7S"
# Should return JSON config, NOT "Retry later"
```

Expected response format:
```json
{
  "website_token": "...",
  "website_name": "CompPortal - ...",
  "widget_color": "#...",
  "locale": "en",
  ...
}
```

---

## ✅ Success Checklist

After completing all steps:

- [ ] All 3 tokens updated in Vercel
- [ ] All tokens set for Production, Preview, Development
- [ ] Base URL is HTTPS (not HTTP)
- [ ] Automatic redeploy completed
- [ ] Widget loads for Competition Director
- [ ] Widget loads for Studio Director → Tech Support
- [ ] Widget loads for Studio Director → Competition Director
- [ ] Test messages appear in correct Chatwoot inboxes
- [ ] No console errors in browser
- [ ] No 404 errors
- [ ] No "Retry later" errors

---

## 📝 Notes

- **Token Format**: All tokens are 24 characters, mix of uppercase, lowercase, and numbers
- **Case Sensitive**: Tokens are case-sensitive - must match exactly
- **Source of Truth**: Always get tokens from Chatwoot Dashboard → Settings → Inboxes → [Inbox] → Settings → Widget Code
- **No Regeneration**: Don't regenerate tokens unless you update Vercel at the same time
- **Test All Paths**: Test both CD and SD user roles, all chat paths

---

**Estimated Time**: 5 minutes to update + 2 minutes deploy = 7 minutes total
