# Chatwoot Widget Fix Guide

**Issue**: Widget returns 404 error: `{"error":"web widget does not exist"}`
**Root Cause**: The website tokens in Vercel don't match any inboxes on the Chatwoot server
**Solution**: Create web widget inboxes in Chatwoot and update Vercel environment variables

---

## 🚨 Quick Diagnosis

**Server Status**: ✅ https://chat.compsync.net is accessible (200 OK)
**SDK Script**: ✅ `/packs/js/sdk.js` loads successfully
**Widget Endpoint**: ❌ `/widget?website_token=...` returns `{"error":"web widget does not exist"}`

**Current Token**: `AqBFyfVtETJEV6Ve5qe86C7S` (doesn't exist on server)

---

## 📋 Step-by-Step Fix

### Step 1: Login to Chatwoot
1. Go to: https://chat.compsync.net
2. Login with your credentials

### Step 2: Create 3 Web Widget Inboxes

You need to create 3 separate inboxes for the 3 chat paths:

#### Inbox 1: Studio Director → Tech Support
1. Click **Settings** → **Inboxes** → **Add Inbox**
2. Select **Website** channel type
3. **Configuration**:
   - **Channel Name**: `SD Tech Support`
   - **Website Name**: `CompPortal - Studio Director Tech`
   - **Website Domain**: `comp-portal-one.vercel.app`
   - **Widget Color**: `#9333EA` (purple)
4. Click **Create Website Channel**
5. **COPY THE WEBSITE TOKEN** - you'll need this!
   - It will look like: `AaBbCc123XyZ456...`
6. Complete the setup

#### Inbox 2: Studio Director → Competition Director
1. Click **Settings** → **Inboxes** → **Add Inbox**
2. Select **Website** channel type
3. **Configuration**:
   - **Channel Name**: `SD to CD Questions`
   - **Website Name**: `CompPortal - SD to CD`
   - **Website Domain**: `comp-portal-one.vercel.app`
   - **Widget Color**: `#3B82F6` (blue)
4. Click **Create Website Channel**
5. **COPY THE WEBSITE TOKEN**
6. Complete the setup

#### Inbox 3: Competition Director → Tech Support
1. Click **Settings** → **Inboxes** → **Add Inbox**
2. Select **Website** channel type
3. **Configuration**:
   - **Channel Name**: `CD Tech Support`
   - **Website Name**: `CompPortal - Competition Director Tech`
   - **Website Domain**: `comp-portal-one.vercel.app`
   - **Widget Color**: `#10B981` (green)
4. Click **Create Website Channel**
5. **COPY THE WEBSITE TOKEN**
6. Complete the setup

### Step 3: Configure Inbox Settings (Optional but Recommended)

For each inbox:
1. Go to **Settings** → **Inboxes** → [Select Inbox]
2. **Enable Features**:
   - ✅ Enable channel greeting
   - ✅ Enable CSAT (Customer Satisfaction)
   - ✅ Allow messages after conversation resolved
3. **Set Greeting Message** (example):
   ```
   Hi! 👋 How can we help you today?

   We typically respond within a few hours during business hours.
   ```
4. **Save Settings**

### Step 4: Update Vercel Environment Variables

1. Go to: https://vercel.com/danman60s-projects/comp-portal/settings/environment-variables

2. **Find and UPDATE these 3 variables**:
   - `NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN`
   - `NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN`
   - `NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN`

3. **For each variable**:
   - Click **Edit**
   - Paste the **NEW website token** from Chatwoot
   - Select **Production, Preview, Development** (all environments)
   - Click **Save**

**Example**:
```
NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN=AaBbCc123XyZ456...
NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN=DdEeFf789AbC012...
NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN=GgHhIi345DeF678...
```

4. **IMPORTANT**: Make sure all 3 tokens are different (one for each inbox)

### Step 5: Verify Environment Variable

Also verify this variable is set correctly:
```
NEXT_PUBLIC_CHATWOOT_BASE_URL=https://chat.compsync.net
```

**Should be HTTPS, not HTTP!**

### Step 6: Redeploy

After updating environment variables:
1. Go to: https://vercel.com/danman60s-projects/comp-portal
2. Click **Deployments** tab
3. Click **...** (3 dots) on latest deployment
4. Click **Redeploy**
5. Wait for deployment to complete (~2 minutes)

### Step 7: Test the Widget

1. Visit: https://comp-portal-one.vercel.app
2. Login as a **Studio Director** or **Competition Director**
3. Click the **Support** button (bottom right)
4. If Studio Director: Choose "Technical Support" or "Competition Director"
5. Widget should load successfully!

**Check browser console**:
- ✅ Should see: No errors
- ❌ If you see 404: Token is still wrong, double-check Vercel env vars

---

## 🔍 Troubleshooting

### Error: "web widget does not exist"
- **Cause**: Website token doesn't match any inbox
- **Fix**: Verify you copied the correct token from Chatwoot
- **Verify**: Test the token directly:
  ```bash
  curl "https://chat.compsync.net/widget?website_token=YOUR_TOKEN_HERE"
  ```
  Should return widget configuration, not an error

### Error: "Failed to load Chatwoot SDK"
- **Cause**: CORS or network issue
- **Fix**: Verify Chatwoot server allows `comp-portal-one.vercel.app` domain

### Widget loads but doesn't work
- **Cause**: Inbox configuration issue
- **Fix**: Check inbox settings in Chatwoot dashboard

### Multiple widgets appearing
- **Cause**: Multiple tokens loaded simultaneously
- **Fix**: Only one chat path should be active at a time (code handles this)

---

## 📊 Expected Behavior After Fix

### Studio Director Experience
1. Clicks **Support** button
2. Sees modal with 2 options:
   - "Technical Support" (purple)
   - "Competition Director" (blue)
3. Selects option
4. Widget opens with correct inbox

### Competition Director Experience
1. Clicks **Support** button
2. Widget opens immediately (auto-routed to tech support)
3. Can start chatting

### Backend (Your View in Chatwoot)
- Messages from SD Tech → Inbox 1
- Messages from SD to CD → Inbox 2
- Messages from CD Tech → Inbox 3
- Each inbox has different team/agent assignment

---

## 🎯 Quick Reference: What Each Token Does

| Environment Variable | Used By | Purpose |
|---------------------|---------|---------|
| `NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN` | Studio Directors | Tech support for portal issues |
| `NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN` | Studio Directors | Questions for Competition Director |
| `NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN` | Competition Directors | Tech support for portal issues |

---

## 💡 Pro Tips

1. **Test with different roles**: Login as SD and CD to verify both paths work
2. **Assign teams**: In Chatwoot, assign different teams to each inbox
3. **Set up email forwarding**: Configure email notifications for each inbox
4. **Enable CSAT**: Get feedback on support quality
5. **Add canned responses**: Create templates for common questions

---

## ✅ Verification Checklist

After completing all steps:
- [ ] 3 inboxes created in Chatwoot
- [ ] All 3 website tokens copied
- [ ] Vercel env vars updated with real tokens
- [ ] All env vars set for Production, Preview, Development
- [ ] Redeployed application
- [ ] Tested as Studio Director (both chat paths)
- [ ] Tested as Competition Director
- [ ] No console errors
- [ ] Messages appear in Chatwoot dashboard

---

**Need Help?**
- Chatwoot Documentation: https://www.chatwoot.com/docs/user-guide/add-inbox-settings
- Detailed setup guide: `chatwoot/INBOX_SETUP.md`
- SSL setup guide: `chatwoot/SSL_SETUP.md`

**Estimated Time**: 20-30 minutes
**Difficulty**: Easy (just copy-paste tokens)
