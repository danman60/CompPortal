# Fix Chatwoot Rate Limiting (429 Error)

## Current Issue

Chatwoot is returning `429 Too Many Requests` when widget tries to load.

**Cause**: Too many widget requests (from testing + hydration error loops) triggered rate limiting.

---

## Option 1: Wait for Rate Limit to Reset

The rate limit will automatically reset after a few minutes.

1. **Wait 5-10 minutes**
2. **Hard refresh browser** (Ctrl+Shift+R)
3. **Try widget again**

---

## Option 2: Increase Rate Limits in Chatwoot

SSH into your server:

```bash
ssh root@159.89.115.95
cd /path/to/chatwoot  # Navigate to your Chatwoot installation
```

### Edit Chatwoot Configuration

```bash
nano .env
```

**Add or update these lines**:

```bash
# Increase API rate limits
RAILS_MAX_THREADS=5
RAILS_ENV=production

# Increase widget endpoint limits (requests per minute)
# Default is usually 20/minute per IP
WIDGET_RATE_LIMIT=100

# Or disable rate limiting entirely (NOT recommended for production)
DISABLE_RATE_LIMITING=true
```

**Save**: Ctrl+X, then Y, then Enter

### Restart Chatwoot

```bash
docker-compose restart
```

### Verify Services Running

```bash
docker-compose ps
```

---

## Option 3: Clear Redis Rate Limit Cache

Chatwoot uses Redis for rate limiting. You can clear the rate limit keys:

```bash
# Access Redis container
docker exec -it chatwoot-redis redis-cli

# Inside Redis CLI:
KEYS *rate_limit*

# Delete rate limit keys
DEL rate_limit:widget:YOUR_IP_ADDRESS

# Or flush all rate limit keys (nuclear option)
KEYS *rate_limit* | xargs DEL

# Exit Redis
exit
```

---

## Option 4: Check Rack Attack Configuration

Chatwoot uses Rack::Attack for rate limiting. You can customize it:

```bash
cd /path/to/chatwoot
nano config/initializers/rack_attack.rb
```

**Look for widget-related throttles and increase limits**:

```ruby
# Find lines like this and increase the limit:
throttle('widget/ip', limit: 100, period: 1.minute) do |req|
  if req.path.start_with?('/widget') || req.path.start_with?('/public/api')
    req.ip
  end
end
```

**Save and restart**:

```bash
docker-compose restart
```

---

## Option 5: Whitelist Your Production Domain

Add your domain to the allowlist so it bypasses rate limits:

```bash
nano config/initializers/rack_attack.rb
```

**Add this at the top**:

```ruby
# Whitelist production domain
Rack::Attack.safelist('allow production domain') do |req|
  req.ip == 'YOUR_PRODUCTION_SERVER_IP' ||
  req.env['HTTP_ORIGIN'] == 'https://www.compsync.net' ||
  req.env['HTTP_ORIGIN'] == 'https://compsync.net'
end
```

**Restart**:

```bash
docker-compose restart
```

---

## Verify Fix

### Test Widget Endpoint

```bash
# From your local machine:
curl -I https://chat.compsync.net/widget?website_token=AqBFyfVtETJEV6Ve5qe86C7S

# Should return: HTTP/1.1 200 OK
# NOT: HTTP/1.1 429 Too Many Requests
```

### Check Chatwoot Logs

```bash
docker-compose logs -f chatwoot

# Look for rate limit messages like:
# "Throttled request from IP x.x.x.x"
```

---

## Test Widget in Browser

Once rate limit is cleared:

1. **Hard refresh**: Ctrl+Shift+R
2. **Clear browser cache**: Settings → Privacy → Clear browsing data
3. **Login** as Studio Director
4. **Click Support button**
5. **Select chat option**
6. **Check console** (F12):
   - ✅ No 429 errors
   - ✅ No "web widget does not exist"
   - ✅ Widget loads successfully

---

## Recommended Production Settings

For production use with real users:

```bash
# In .env
WIDGET_RATE_LIMIT=100          # 100 requests per minute per IP
DISABLE_RATE_LIMITING=false    # Keep rate limiting enabled
REDIS_URL=redis://redis:6379   # Ensure Redis is configured

# Optional: Different limits for different endpoints
API_RATE_LIMIT=60              # API endpoints: 60/min
PUBLIC_API_RATE_LIMIT=120      # Public API: 120/min
WIDGET_RATE_LIMIT=100          # Widget: 100/min
```

---

## Quick Fix (Fastest)

**Just wait 5-10 minutes** for the rate limit to reset, then test again. The hydration error is now fixed, so you won't trigger infinite loops anymore.

**Verify in browser console**:
1. No React error #418 ✅ (we fixed this)
2. No infinite widget requests ✅ (hydration fix prevents this)
3. Just need rate limit to reset ⏱️

---

**TL;DR**: Your Chatwoot server is temporarily blocking requests due to too many failed attempts. Either wait 5-10 minutes for it to reset, or increase the rate limits on the server.
