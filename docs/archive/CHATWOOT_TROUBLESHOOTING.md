# Chatwoot Widget Troubleshooting

**Issue**: Widget shows "Retry later" error
**Status**: Server-side issue on Chatwoot (not a CompPortal bug)

---

## 🔍 Diagnostic Results

### ✅ What's Working
- **Chatwoot Server**: https://chat.compsync.net (accessible, 200 OK)
- **API Endpoint**: `/api` returns version 4.7.0
- **SDK Script**: `/packs/js/sdk.js` loads successfully (28KB)
- **Inboxes**: Already created and configured
- **Tokens**: Valid tokens in Vercel environment variables

### ❌ What's NOT Working
- **Widget Endpoint**: `/widget?website_token=...` returns "Retry later"
- **All 3 Tokens**: Same error for all inboxes
- **Pattern**: Consistent server-side issue

---

## 🚨 Root Cause: Chatwoot Server Issue

The "Retry later" response indicates a **Chatwoot backend service problem**, likely:

1. **Redis not running** (Chatwoot uses Redis for caching/sessions)
2. **Sidekiq not running** (background job processor)
3. **Database connection issues**
4. **Server resource exhaustion** (CPU/Memory/Disk)
5. **Service restart needed**

**This is NOT a CompPortal code issue** - the widget configuration is correct.

---

## 🛠️ Quick Fixes to Try

### Option 1: Restart Chatwoot Services (SSH Access Required)

SSH into your Chatwoot server:
```bash
ssh root@159.89.115.95
```

Then restart services:
```bash
# Check if running
systemctl status chatwoot.target
systemctl status redis-server
systemctl status postgresql

# Restart all Chatwoot services
systemctl restart chatwoot.target

# Or restart individual services
systemctl restart chatwoot-web
systemctl restart chatwoot-worker
systemctl restart redis-server
```

Check logs:
```bash
# Web server logs
journalctl -u chatwoot-web -f

# Worker logs
journalctl -u chatwoot-worker -f

# Redis logs
journalctl -u redis-server -f
```

### Option 2: Check Server Resources

```bash
# Check CPU/Memory usage
htop

# Check disk space
df -h

# Check if Redis is responding
redis-cli ping
# Should return: PONG

# Check if PostgreSQL is running
sudo -u postgres psql -c "SELECT version();"
```

### Option 3: Verify Chatwoot Configuration

Check Chatwoot environment file:
```bash
cat /home/chatwoot/chatwoot/.env | grep -E "REDIS_URL|DATABASE_URL|FRONTEND_URL"
```

Should show:
```
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://...
FRONTEND_URL=https://chat.compsync.net
```

### Option 4: Check Nginx/Proxy

```bash
# Check Nginx status
systemctl status nginx

# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Test Nginx config
nginx -t

# Restart Nginx if needed
systemctl restart nginx
```

---

## 🔧 Sanity Checks

### Check 1: Verify Environment Variables in Vercel

Go to: https://vercel.com/danman60s-projects/comp-portal/settings/environment-variables

**Verify these exist and are correct**:
```
NEXT_PUBLIC_CHATWOOT_BASE_URL=https://chat.compsync.net
NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN=AqBFyfVtETJEV6Ve5qe86C7S
NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN=Q5OzfrxnEMEQxS4MHp7rnZa
NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN=irbhliLmxlGRoPAxqyIiZhrY
```

**Common mistakes**:
- ❌ Using `http://` instead of `https://`
- ❌ Trailing slash on base URL
- ❌ Wrong token (copy-paste error)
- ❌ Not set for all environments (Production, Preview, Development)

### Check 2: Test Widget Manually

In browser console on production site:
```javascript
// Load SDK manually
const script = document.createElement('script');
script.src = 'https://chat.compsync.net/packs/js/sdk.js';
script.onload = () => {
  window.chatwootSDK.run({
    websiteToken: 'AqBFyfVtETJEV6Ve5qe86C7S',
    baseUrl: 'https://chat.compsync.net'
  });
};
document.head.appendChild(script);
```

Watch console for errors.

### Check 3: Verify CORS Headers

The Chatwoot server must allow requests from `comp-portal-one.vercel.app`:

```bash
curl -I -H "Origin: https://comp-portal-one.vercel.app" \
  "https://chat.compsync.net/packs/js/sdk.js"
```

Should include:
```
Access-Control-Allow-Origin: *
```

Or:
```
Access-Control-Allow-Origin: https://comp-portal-one.vercel.app
```

### Check 4: Test Directly in Chatwoot Dashboard

1. Login to Chatwoot: https://chat.compsync.net
2. Go to **Settings** → **Inboxes**
3. Click on **SD Tech Support** inbox
4. Click **Settings** tab
5. Find **Widget Code** section
6. Copy the test HTML snippet
7. Create a local `test.html` file with that code
8. Open in browser
9. Widget should load

If it works locally but not on production → CORS issue
If it doesn't work at all → Chatwoot server issue

---

## 🔬 Advanced Diagnostics

### Check Redis Connection

```bash
# On Chatwoot server
redis-cli

# In Redis CLI:
> PING
PONG

> INFO server
# Should show Redis version and uptime

> KEYS *chatwoot*
# Should show Chatwoot keys if Redis is being used

> EXIT
```

### Check Database Connection

```bash
# On Chatwoot server
sudo -u chatwoot psql chatwoot_production

# In psql:
SELECT COUNT(*) FROM inboxes WHERE channel_type = 'Channel::WebWidget';
# Should show 3 (your 3 inboxes)

SELECT website_token FROM channel_web_widgets;
# Should show your 3 tokens

\q
```

### Check Chatwoot Console

```bash
# On Chatwoot server
cd /home/chatwoot/chatwoot
RAILS_ENV=production bundle exec rails console

# In Rails console:
> Inbox.where(channel_type: 'Channel::WebWidget').count
# Should return 3

> Channel::WebWidget.pluck(:website_token)
# Should show your 3 tokens

> exit
```

### Check Recent Errors

```bash
# Check Chatwoot application logs
tail -100 /home/chatwoot/chatwoot/log/production.log | grep -i error

# Check for widget-specific errors
tail -100 /home/chatwoot/chatwoot/log/production.log | grep -i widget
```

---

## 🎯 Quick Fix Summary

**Most likely fix** (90% of cases):
```bash
# SSH into server
ssh root@159.89.115.95

# Restart all services
systemctl restart chatwoot.target
systemctl restart redis-server

# Check status
systemctl status chatwoot-web
systemctl status chatwoot-worker
systemctl status redis-server

# Watch logs
journalctl -u chatwoot-web -f
```

Wait 30 seconds, then test: https://chat.compsync.net/widget?website_token=AqBFyfVtETJEV6Ve5qe86C7S

Should return widget config JSON instead of "Retry later"

---

## 📊 Expected Response When Working

When the widget endpoint is working correctly, it should return JSON like:

```json
{
  "website_token": "AqBFyfVtETJEV6Ve5qe86C7S",
  "website_name": "CompPortal - Studio Director Tech",
  "website_url": "https://comp-portal-one.vercel.app",
  "widget_color": "#9333EA",
  "locale": "en",
  "reply_time": "in a few hours",
  "preChatFormEnabled": false,
  "continuityViaEmail": true
}
```

**Currently returning**: `Retry later` (plain text error)

---

## ✅ After Fix Verification

Once services are restarted and working:

1. **Test widget endpoint**:
   ```bash
   curl "https://chat.compsync.net/widget?website_token=AqBFyfVtETJEV6Ve5qe86C7S"
   ```
   Should return JSON config

2. **Test on production site**:
   - Visit: https://comp-portal-one.vercel.app
   - Login as Studio Director or Competition Director
   - Click **Support** button
   - Widget should load successfully

3. **Check browser console**:
   - Should see Chatwoot SDK loaded
   - No 404 errors
   - No CORS errors

4. **Send test message**:
   - Type a message in widget
   - Should appear in Chatwoot dashboard
   - Should receive email notification (if configured)

---

## 🔗 Related Documentation

- Chatwoot official docs: https://www.chatwoot.com/docs
- Setup guide: `chatwoot/DEPLOY.md`
- SSL setup: `chatwoot/SSL_SETUP.md`
- Inbox setup: `chatwoot/INBOX_SETUP.md`

---

**Bottom Line**: The widget code in CompPortal is correct. The issue is on the Chatwoot server - likely Redis/Sidekiq not running. Restart services to fix.
