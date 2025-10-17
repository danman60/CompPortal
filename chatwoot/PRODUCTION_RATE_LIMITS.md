# Chatwoot Production Rate Limit Configuration

## Understanding Chatwoot Rate Limiting

Chatwoot uses **per-IP rate limiting** via Rack::Attack:
- Each unique IP address gets its own rate limit counter
- Limits reset after the time window (usually 1 minute)
- Widget requests, API calls, and page loads are tracked separately

---

## Widget Request Pattern (Normal User)

When a user loads the CompPortal dashboard, the widget makes:

1. **Initial load**: 1-2 requests to `/widget?website_token=...`
2. **SDK initialization**: 1 request to `/packs/js/sdk.js`
3. **WebSocket connection**: Switches to WebSocket (no more HTTP requests)
4. **Total**: ~3-5 HTTP requests, then WebSocket only

**Normal user behavior**: 3-5 requests per page load, then idle on WebSocket.

---

## Problem Scenarios

### Scenario 1: Many Users from Same IP

**Example**: Dance studio with 10 staff members all using CompPortal from same office WiFi

- All 10 users share same public IP
- Each opens dashboard → 5 requests × 10 users = 50 requests in ~10 seconds
- **Default limit**: 20/minute → BLOCKED ❌

### Scenario 2: User Refreshes Page Multiple Times

**Example**: User has connection issues, keeps refreshing

- Refresh 1: 5 requests
- Refresh 2: 5 requests
- Refresh 3: 5 requests
- **Total**: 15 requests in 10 seconds
- **Default limit**: 20/minute → OK ✅ (but close to limit)

### Scenario 3: Peak Traffic (Competition Registration Opens)

**Example**: 50 studios trying to register at same time

- 50 different IPs
- Each makes 5 requests
- **Per-IP**: 5 requests each
- **Default limit**: 20/minute → ALL OK ✅

---

## Recommended Settings for CompPortal Production

SSH to your Chatwoot server:

```bash
ssh root@159.89.115.95
cd /path/to/chatwoot
```

### Option 1: Increase Widget Rate Limits (Recommended)

Edit Chatwoot configuration:

```bash
nano config/initializers/rack_attack.rb
```

**Add/modify these throttles**:

```ruby
# Allow more widget requests per IP
# Recommended: 100 requests per minute for widget endpoints
Rack::Attack.throttle('widget/ip', limit: 100, period: 1.minute) do |req|
  if req.path.start_with?('/widget') ||
     req.path.start_with?('/public/api/v1/widget') ||
     req.path.start_with?('/packs/js/sdk.js')
    req.ip
  end
end

# Separate limit for general API endpoints
Rack::Attack.throttle('api/ip', limit: 60, period: 1.minute) do |req|
  if req.path.start_with?('/api/') &&
     !req.path.start_with?('/api/v1/widget')
    req.ip
  end
end

# WebSocket connections (less restrictive)
Rack::Attack.throttle('websocket/ip', limit: 20, period: 1.minute) do |req|
  if req.path == '/cable'
    req.ip
  end
end
```

**Restart Chatwoot**:

```bash
docker-compose restart
```

---

### Option 2: Use Environment Variables (Easier)

If your Chatwoot version supports env-based configuration:

```bash
nano .env
```

**Add these lines**:

```bash
# Widget endpoint rate limits
WIDGET_RATE_LIMIT_RPM=100        # Requests per minute per IP
WIDGET_RATE_LIMIT_BURST=20       # Allow burst of 20 requests

# API rate limits
API_RATE_LIMIT_RPM=60
PUBLIC_API_RATE_LIMIT_RPM=120

# WebSocket limits
WEBSOCKET_RATE_LIMIT_RPM=20
```

**Restart**:

```bash
docker-compose restart
```

---

### Option 3: Whitelist Trusted IPs (Advanced)

For known office IPs or your production server:

```bash
nano config/initializers/rack_attack.rb
```

**Add safelist**:

```ruby
# Whitelist Vercel deployment IPs (CompPortal production)
Rack::Attack.safelist('allow vercel') do |req|
  # Get Vercel IP ranges from: https://vercel.com/docs/deployments/firewall
  vercel_ips = [
    '76.76.21.0/24',
    '76.76.22.0/23',
    # Add more Vercel IP ranges
  ]

  vercel_ips.any? { |range| IPAddr.new(range).include?(req.ip) }
end

# Whitelist specific office IPs
Rack::Attack.safelist('allow office') do |req|
  ['203.0.113.1', '203.0.113.2'].include?(req.ip)  # Replace with real IPs
end
```

---

## Testing Rate Limits

### Test from Command Line

```bash
# Test widget endpoint
for i in {1..30}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    "https://chat.compsync.net/widget?website_token=AqBFyfVtETJEV6Ve5qe86C7S"
  sleep 0.1
done

# Should see:
# Request 1-100: 200
# Request 101+: 429 (if limit is 100/min)
```

### Monitor Rate Limiting in Logs

```bash
docker-compose logs -f chatwoot | grep -i "throttle"

# Look for:
# "Throttled request from IP x.x.x.x to /widget"
```

---

## Monitoring in Production

### Track Rate Limit Hits

Create alerts for when users hit rate limits:

```bash
# Check Chatwoot logs for 429 responses
docker-compose logs chatwoot | grep "status=429" | wc -l

# If count > 10 in short time → investigate
```

### Redis Monitoring

Check rate limit counters in Redis:

```bash
docker exec -it chatwoot-redis redis-cli

# Inside Redis:
KEYS rack::attack:*

# Check specific IP's counter:
GET rack::attack:widget/ip:203.0.113.1

# Shows remaining requests before limit
```

---

## Recommended Final Configuration

For CompPortal production with ~100-200 users:

```ruby
# config/initializers/rack_attack.rb

# Widget endpoints - most permissive
Rack::Attack.throttle('widget/ip', limit: 100, period: 1.minute) do |req|
  if req.path.include?('/widget') || req.path.include?('/packs/js/sdk.js')
    req.ip
  end
end

# Public API endpoints
Rack::Attack.throttle('public_api/ip', limit: 60, period: 1.minute) do |req|
  if req.path.start_with?('/public/api')
    req.ip
  end
end

# Admin API endpoints - more restrictive
Rack::Attack.throttle('api/ip', limit: 30, period: 1.minute) do |req|
  if req.path.start_with?('/api/') && !req.path.start_with?('/api/v1/widget')
    req.ip
  end
end

# Block malicious actors (more than 200 requests/minute from single IP)
Rack::Attack.blocklist('block excessive requests') do |req|
  Rack::Attack::Allow2Ban.filter(req.ip, maxretry: 200, findtime: 1.minute, bantime: 10.minutes) do
    true
  end
end
```

---

## Scaling for Growth

As your user base grows:

| Users | Widget Limit | Expected Peak Load |
|-------|--------------|-------------------|
| 0-100 | 100/min | ~500 req/min total |
| 100-500 | 150/min | ~1,500 req/min total |
| 500-1000 | 200/min | ~3,000 req/min total |
| 1000+ | 300/min + CDN | Consider load balancer |

---

## Alternative: Use Chatwoot Cloud

If managing rate limits becomes complex, consider:

**Chatwoot Cloud** (https://chatwoot.com/pricing):
- Managed infrastructure
- Auto-scaling rate limits
- Built-in DDoS protection
- No server maintenance

**Self-hosted benefits**:
- Full control over limits
- No per-agent fees
- Custom integrations
- Data sovereignty

---

## Troubleshooting Production Rate Limit Issues

### Users Report Widget Not Loading

1. **Check if 429 errors in Chatwoot logs**:
```bash
docker-compose logs chatwoot | grep "429" | tail -20
```

2. **Check which IPs are hitting limits**:
```bash
docker-compose logs chatwoot | grep "Throttled" | awk '{print $NF}' | sort | uniq -c | sort -rn
```

3. **Temporarily whitelist problematic IP**:
```bash
# In rack_attack.rb
Rack::Attack.safelist('emergency whitelist') do |req|
  req.ip == 'PROBLEMATIC_IP'
end
```

---

## Summary: Production-Ready Settings

```bash
# Quick setup - add to .env
WIDGET_RATE_LIMIT_RPM=100
API_RATE_LIMIT_RPM=60
WEBSOCKET_RATE_LIMIT_RPM=20

# Restart
docker-compose restart
```

**This handles**:
- ✅ 100+ concurrent users (different IPs)
- ✅ 10-15 users from same office IP
- ✅ Users refreshing page 3-5 times
- ✅ Peak traffic during registration periods
- ✅ Protection against abuse (still blocks 100+ req/min from single IP)

**Monitor** for first few weeks and adjust based on actual usage patterns.
