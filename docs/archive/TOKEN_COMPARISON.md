# Chatwoot Token Comparison

## 🚨 FOUND THE ISSUE: Token Mismatch!

### Current Tokens in Vercel (WRONG)
From `vercel-env-import.txt`:
```
CD Tech (CD → SA): irbhliLmxlGRoPAxqyIiZhrY
SD to CD (SD → CD): Q5OzfrxnEMEQxS4MHp7rnZa
SD Tech (SD → SA): AqBFyfVtETJEV6Ve5qe86C7S
```

### Actual Tokens from Chatwoot (CORRECT)
From your widget scripts:
```
CD Tech (CD → SA): irbih1LmxkGRoPAxqy1iZhrY  ← DIFFERENT!
SD to CD (SD → CD): Q5oZfrxnEEMSQx54MhP7rnZa  ← DIFFERENT!
SD Tech (SD → SA): [Need this one from Chatwoot]
```

## 🔍 Differences Found

### Token 1: CD → SA (Competition Director Tech)
**Vercel (OLD)**: `irbhliLmxlGRoPAxqyIiZhrY`
**Chatwoot (NEW)**: `irbih1LmxkGRoPAxqy1iZhrY`

**Differences**:
- Position 6: `l` → `1` (lowercase L to number 1)
- Position 11: `l` → `k`
- Position 24: `Ii` → `1i` (capital I + lowercase i to number 1 + lowercase i)

### Token 2: SD → CD (Studio Director to Competition Director)
**Vercel (OLD)**: `Q5OzfrxnEMEQxS4MHp7rnZa`
**Chatwoot (NEW)**: `Q5oZfrxnEEMSQx54MhP7rnZa`

**Differences**:
- Position 3: `O` → `o` (capital O to lowercase o)
- Position 10: `E` → `E` (same)
- Position 11: `M` → `E`
- Position 12: `E` → `M`
- Position 13: `Q` → `S`
- Position 15: `S` → `x`
- Position 16: `4` → `5`
- Position 18: `M` → `4`
- Position 19: `H` → `M`
- Position 20: `p` → `h`
- Position 21: `7` → `P`

### Token 3: SD → SA (Studio Director Tech)
**Vercel (OLD)**: `AqBFyfVtETJEV6Ve5qe86C7S`
**Chatwoot (NEW)**: [Script was cut off - need to get this]

---

## ✅ FIX: Update Vercel Environment Variables

Go to: https://vercel.com/danman60s-projects/comp-portal/settings/environment-variables

**Update these 3 variables with EXACT tokens from Chatwoot**:

### 1. NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN
**OLD (DELETE)**: `irbhliLmxlGRoPAxqyIiZhrY`
**NEW (USE THIS)**: `irbih1LmxkGRoPAxqy1iZhrY`

### 2. NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN
**OLD (DELETE)**: `Q5OzfrxnEMEQxS4MHp7rnZa`
**NEW (USE THIS)**: `Q5oZfrxnEEMSQx54MhP7rnZa`

### 3. NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN
**OLD (DELETE)**: `AqBFyfVtETJEV6Ve5qe86C7S`
**NEW (GET FROM CHATWOOT)**: [Check SD → SA inbox widget script]

---

## 📋 Steps to Fix

1. **Get the SD → SA Token**:
   - Login to Chatwoot: https://chat.compsync.net
   - Settings → Inboxes → Click "SD → SA" (or "SD Tech Support")
   - Click "Settings" tab
   - Scroll to "Widget Code"
   - Copy the `websiteToken` value from the script

2. **Update Vercel Environment Variables**:
   - Go to: https://vercel.com/danman60s-projects/comp-portal/settings/environment-variables
   - Click **Edit** on `NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN`
   - Paste: `irbih1LmxkGRoPAxqy1iZhrY`
   - Select: Production, Preview, Development (all 3)
   - Save

   - Click **Edit** on `NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN`
   - Paste: `Q5oZfrxnEEMSQx54MhP7rnZa`
   - Select: Production, Preview, Development (all 3)
   - Save

   - Click **Edit** on `NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN`
   - Paste: [Token from SD → SA inbox]
   - Select: Production, Preview, Development (all 3)
   - Save

3. **Redeploy** (happens automatically after saving env vars)

4. **Test**:
   ```bash
   # Test CD token
   curl "https://chat.compsync.net/widget?website_token=irbih1LmxkGRoPAxqy1iZhrY"

   # Test SD to CD token
   curl "https://chat.compsync.net/widget?website_token=Q5oZfrxnEEMSQx54MhP7rnZa"

   # Test SD tech token (after you get it)
   curl "https://chat.compsync.net/widget?website_token=YOUR_SD_SA_TOKEN"
   ```

   Should all return JSON config, not "Retry later" or "web widget does not exist"

---

## 🎯 Why This Happened

The tokens in `vercel-env-import.txt` were likely:
- Copy-paste errors (typos)
- From a different Chatwoot instance
- From deleted/recreated inboxes
- Old tokens that were regenerated

**Solution**: Always copy tokens directly from Chatwoot → Settings → Inboxes → [Inbox] → Settings → Widget Code

---

## ✅ Verification After Fix

Once all 3 tokens are updated in Vercel:

1. Wait for deployment to complete (~2 minutes)
2. Visit: https://comp-portal-one.vercel.app
3. Login as Competition Director
4. Click Support button
5. Widget should load successfully!
6. Send a test message
7. Check Chatwoot dashboard - message should appear

---

## 📊 Token Mapping Reference

| Inbox Name | Chat Path | Vercel Env Var | Correct Token |
|-----------|-----------|----------------|---------------|
| CD Tech Support | CD → SA | `NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN` | `irbih1LmxkGRoPAxqy1iZhrY` |
| SD to CD Questions | SD → CD | `NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN` | `Q5oZfrxnEEMSQx54MhP7rnZa` |
| SD Tech Support | SD → SA | `NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN` | [Get from Chatwoot] |
