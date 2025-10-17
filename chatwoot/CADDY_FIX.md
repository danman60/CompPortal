# Chatwoot Caddy Configuration Fix

## Issue: X-Frame-Options Blocking Embed

Chatwoot is sending `X-Frame-Options: sameorigin` which blocks embedding from `www.compsync.net`.

## SSH to Your Droplet

```bash
ssh root@159.89.115.95
```

## Step 1: Update Chatwoot Environment

```bash
# Navigate to Chatwoot directory
cd /path/to/chatwoot  # Replace with your actual path

# Edit .env file
nano .env
```

**Find and update these lines:**

```bash
# Change from localhost or old URL to:
FRONTEND_URL=https://chat.compsync.net

# Add this line if it doesn't exist:
ALLOWED_IFRAME_HOSTS=www.compsync.net,compsync.net,chat.compsync.net
```

**Save:** Ctrl+X, then Y, then Enter

## Step 2: Update Caddy Configuration

```bash
# Edit your Caddyfile
nano /etc/caddy/Caddyfile  # or wherever your Caddyfile is located
```

**Add header overrides for Chatwoot:**

```caddy
chat.compsync.net {
    reverse_proxy localhost:3000

    # Remove X-Frame-Options to allow embedding
    header {
        -X-Frame-Options
        # Or use this to allow specific origins:
        # X-Frame-Options "ALLOW-FROM https://www.compsync.net"
    }
}
```

**Save:** Ctrl+X, then Y, then Enter

```bash
# Reload Caddy
sudo systemctl reload caddy
```

## Step 3: Restart Chatwoot

```bash
# Navigate to Chatwoot directory
cd /path/to/chatwoot

# Restart all services
docker-compose down
docker-compose up -d

# Verify services are running
docker-compose ps
```

## Step 4: Verify Widget Script Access

```bash
# Test that the widget script loads
curl -I https://chat.compsync.net/packs/js/sdk.js

# Should return 200 OK, not 404
```

## Step 5: Check Chatwoot Admin Settings

1. **Login to Chatwoot:** https://chat.compsync.net
2. **Go to Settings** → **Inboxes**
3. **For each inbox** (SD Tech, SD→CD, CD Tech):
   - Click **Settings**
   - Under **Widget**
   - Verify **Website Token** matches your env vars
   - Check **Allowed Domains** includes: `www.compsync.net`, `compsync.net`

## Alternative: Use Content-Security-Policy

If removing X-Frame-Options doesn't work, try CSP in Caddyfile:

```caddy
chat.compsync.net {
    reverse_proxy localhost:3000

    header {
        -X-Frame-Options
        Content-Security-Policy "frame-ancestors 'self' https://www.compsync.net https://compsync.net"
    }
}
```

## Verification

After completing all steps:

1. **Hard refresh browser:** Ctrl+Shift+R
2. **Open console (F12)**
3. **Click Support button** → Select chat option
4. **Check for errors:**
   - ✅ No "Refused to display" error
   - ✅ No 404 on /widget endpoint
   - ✅ Widget iframe loads

## Troubleshooting

### Still Getting X-Frame-Options Error

```bash
# Check what headers Chatwoot is sending
curl -I https://chat.compsync.net/packs/js/sdk.js

# Look for X-Frame-Options in response
```

If still present, the issue is in Chatwoot's application code, not Caddy.

**In Chatwoot .env, add:**
```bash
X_FRAME_OPTIONS=ALLOWALL
```

Then restart: `docker-compose restart`

### 404 on /widget Endpoint

This means Chatwoot isn't fully initialized:

```bash
# Check Chatwoot logs
docker-compose logs -f chatwoot

# Look for errors about database migrations or missing config
```

**Run migrations if needed:**
```bash
docker-compose run --rm chatwoot bundle exec rails db:migrate
docker-compose restart
```

### Widget Token Invalid

If logs show "Invalid token":

1. Login to Chatwoot dashboard
2. Settings → Inboxes → [Your Inbox]
3. Widget → Configuration
4. Copy the **Website Token**
5. Update Vercel env var with the correct token

---

**Once fixed, the widget should load without X-Frame-Options errors!**
