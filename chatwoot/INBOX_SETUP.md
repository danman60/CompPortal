# Chatwoot Inbox Setup Guide

## Current Issue

Getting error: `{"error":"web widget does not exist"}`

**Cause**: The website tokens in Vercel don't match actual inboxes in Chatwoot. You need to create the inboxes first.

---

## Step 1: Login to Chatwoot Dashboard

1. Navigate to: **https://chat.compsync.net**
2. Login with your admin credentials
3. If this is a fresh install, you may need to create an admin account first

---

## Step 2: Create Three Website Inboxes

You need to create **3 separate website inboxes** for the different communication paths:

### Inbox 1: Studio Director → Tech Support

1. **Go to**: Settings → Inboxes → **Add Inbox**
2. **Select**: Website
3. **Inbox Details**:
   - **Inbox Name**: `SD Tech Support`
   - **Website Name**: CompPortal
   - **Website Domain**: `www.compsync.net`
4. Click **Create Inbox**
5. **Copy the Website Token** (looks like: `AqBFyfVtETJEV6Ve5qe86C7S`)
6. **Widget Settings**:
   - Enable widget: ✅
   - Widget color: Purple (`#9333ea`)
   - Welcome heading: "Tech Support"
   - Welcome tagline: "Get help with portal issues"
7. **Allowed Domains**: Add both:
   - `www.compsync.net`
   - `compsync.net`
8. **Save**

### Inbox 2: Studio Director → Competition Director

1. **Go to**: Settings → Inboxes → **Add Inbox**
2. **Select**: Website
3. **Inbox Details**:
   - **Inbox Name**: `SD to CD Questions`
   - **Website Name**: CompPortal
   - **Website Domain**: `www.compsync.net`
4. Click **Create Inbox**
5. **Copy the Website Token**
6. **Widget Settings**:
   - Enable widget: ✅
   - Widget color: Blue (`#3b82f6`)
   - Welcome heading: "Competition Director"
   - Welcome tagline: "Questions about entries and rules"
7. **Allowed Domains**: Add both:
   - `www.compsync.net`
   - `compsync.net`
8. **Save**

### Inbox 3: Competition Director → Tech Support

1. **Go to**: Settings → Inboxes → **Add Inbox**
2. **Select**: Website
3. **Inbox Details**:
   - **Inbox Name**: `CD Tech Support`
   - **Website Name**: CompPortal
   - **Website Domain**: `www.compsync.net`
4. Click **Create Inbox**
5. **Copy the Website Token**
6. **Widget Settings**:
   - Enable widget: ✅
   - Widget color: Purple (`#9333ea`)
   - Welcome heading: "Tech Support"
   - Welcome tagline: "Get help with portal issues"
7. **Allowed Domains**: Add both:
   - `www.compsync.net`
   - `compsync.net`
8. **Save**

---

## Step 3: Assign Teams/Agents to Inboxes

For each inbox:

1. **Go to**: Settings → Inboxes → [Select Inbox] → **Collaborators**
2. **Add agents** who should receive messages:
   - For SD→Tech and CD→Tech: Add super admin/tech support agents
   - For SD→CD: Add competition director users
3. **Save**

---

## Step 4: Update Vercel Environment Variables

1. **Login to Vercel**: https://vercel.com
2. **Navigate to**: CompPortal project → Settings → Environment Variables
3. **Update these 3 variables with the REAL tokens from Chatwoot**:

```env
NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN=<Token from Inbox 1>
NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN=<Token from Inbox 2>
NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN=<Token from Inbox 3>
```

4. **Important**: Update for ALL environments (Production, Preview, Development)
5. **Save**

---

## Step 5: Redeploy Application

After updating Vercel env vars:

1. **Go to**: Deployments tab
2. **Find latest deployment** (commit: "fix: React hydration error #418")
3. **Click three dots** → **Redeploy**
4. **Select**: Use existing build cache
5. **Redeploy**

**OR** trigger new deployment:
```bash
git commit --allow-empty -m "chore: Trigger redeploy with updated Chatwoot tokens"
git push
```

---

## Step 6: Test Widget

1. **Wait for deployment** to complete (check Vercel dashboard)
2. **Hard refresh**: Ctrl+Shift+R
3. **Login** as Studio Director
4. **Click Support button** (bottom-right)
5. **Select chat option**
6. **Verify**:
   - ✅ No console errors
   - ✅ Widget iframe loads
   - ✅ Chat interface appears
   - ✅ Can type and send messages

---

## Troubleshooting

### Still Getting "web widget does not exist"

**Check if tokens match**:

1. Open browser console (F12) → Network tab
2. Look for request to `/widget?website_token=...`
3. Copy the token from the URL
4. Compare with token in Chatwoot dashboard:
   - Settings → Inboxes → [Inbox] → Settings → Widget → Website Token
5. If they don't match, update Vercel env var and redeploy

### Widget Shows Wrong Inbox

Each role/path combination should show different inbox:

- SD clicks "Tech Support" → Uses `NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN`
- SD clicks "Competition Director" → Uses `NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN`
- CD clicks Support (auto-routed) → Uses `NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN`

If wrong inbox appears, check that tokens are assigned to correct env var names.

### Messages Not Appearing in Dashboard

1. **Check agent assignment**: Settings → Inboxes → [Inbox] → Collaborators
2. **Check inbox status**: Settings → Inboxes → Verify inbox is enabled
3. **Check notifications**: Settings → Notifications → Enable email/browser notifications

---

## Email Notifications Setup (Optional)

To receive email notifications when users send messages:

1. **Chatwoot .env** on server:
```bash
SMTP_ADDRESS=smtp.sendgrid.net
SMTP_PORT=587
SMTP_DOMAIN=compsync.net
SMTP_USER_NAME=apikey
SMTP_PASSWORD=<your-sendgrid-api-key>
SMTP_AUTHENTICATION=plain
SMTP_ENABLE_STARTTLS_AUTO=true
MAILER_SENDER_EMAIL=noreply@compsync.net
```

2. **Restart Chatwoot**:
```bash
docker-compose restart
```

3. **Enable notifications**: Settings → Notifications → Email Notifications

---

## Next Steps After Setup

Once widget is working:

1. **Create canned responses**: Settings → Canned Responses
   - Common technical issues
   - Entry submission help
   - Payment questions

2. **Set up automation**: Settings → Automation
   - Auto-assign conversations
   - Send welcome messages
   - Set business hours

3. **Monitor conversations**: Navigate to Conversations tab to see incoming messages

---

**You MUST create the inboxes in Chatwoot dashboard and get the real tokens before the widget will work!**
