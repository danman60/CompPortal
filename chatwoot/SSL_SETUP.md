# Chatwoot SSL/HTTPS Setup Guide

## Problem: Mixed Content Error

Your production site (`www.compsync.net`) is served over **HTTPS**, but Chatwoot is running on **HTTP** (`http://159.89.115.95:3000`). Browsers block HTTP resources from loading on HTTPS pages for security.

**Error in Console:**
```
Mixed Content: The page at 'https://www.compsync.net/' was loaded over HTTPS,
but requested an insecure script 'http://159.89.115.95:3000/packs/js/sdk.js'
```

## Solution Options

### Option A: Quick Test with ngrok (5 minutes)

**Pros:** Instant HTTPS access for testing
**Cons:** Temporary URL, not for production, free tier has limits

```bash
# 1. Install ngrok
# Download from https://ngrok.com/download or:
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# 2. Sign up at ngrok.com and get auth token

# 3. Add auth token
ngrok config add-authtoken YOUR_AUTH_TOKEN

# 4. Create HTTPS tunnel to Chatwoot
ngrok http 3000

# Output will show:
# Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**Update Vercel Environment Variable:**
```
NEXT_PUBLIC_CHATWOOT_BASE_URL=https://abc123.ngrok.io
```

Then redeploy. Widget should work immediately.

**Limitations:**
- URL changes every time you restart ngrok
- Free tier has bandwidth/connection limits
- Not suitable for production

---

### Option B: Production Setup with Nginx + Let's Encrypt (30 minutes)

**Pros:** Free SSL, permanent solution, production-ready
**Cons:** Requires domain name, more setup steps

#### Prerequisites

1. **Domain or Subdomain** pointing to your DigitalOcean droplet
   - Example: `chat.compsync.net`
   - Add A record in your DNS: `chat.compsync.net` → `159.89.115.95`

2. **SSH Access** to your DigitalOcean droplet

#### Step 1: Install Nginx

```bash
# SSH to your droplet
ssh root@159.89.115.95

# Update system
sudo apt update

# Install Nginx
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Step 2: Configure Nginx Reverse Proxy

```bash
# Create Nginx config for Chatwoot
sudo nano /etc/nginx/sites-available/chatwoot
```

**Paste this configuration:**
```nginx
server {
    listen 80;
    server_name chat.compsync.net;  # Change to your domain

    # Redirect HTTP to HTTPS (will be enabled after SSL setup)
    # return 301 https://$server_name$request_uri;

    # Temporary: Proxy to Chatwoot before SSL
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/chatwoot /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Step 3: Install Certbot (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y
```

#### Step 4: Obtain SSL Certificate

```bash
# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d chat.compsync.net

# Follow the prompts:
# - Enter email address
# - Agree to Terms of Service
# - Choose whether to redirect HTTP to HTTPS (select Yes)
```

Certbot will:
- Obtain a free SSL certificate
- Automatically configure Nginx
- Set up auto-renewal (certificates renew every 90 days)

#### Step 5: Update Chatwoot Environment

```bash
# Edit Chatwoot .env file
cd /path/to/chatwoot  # Navigate to your Chatwoot directory
nano .env
```

**Update FRONTEND_URL:**
```bash
FRONTEND_URL=https://chat.compsync.net
```

**Save and restart Chatwoot:**
```bash
docker-compose down
docker-compose up -d
```

#### Step 6: Update Vercel Environment Variables

Go to: https://vercel.com/danman60s-projects/comp-portal/settings/environment-variables

**Update:**
```
NEXT_PUBLIC_CHATWOOT_BASE_URL=https://chat.compsync.net
```

**Redeploy** your Vercel deployment.

#### Step 7: Verify

1. Visit https://chat.compsync.net (should show Chatwoot login)
2. Check SSL: Should show lock icon in browser
3. Test widget on production site
4. Check browser console (no mixed content errors)

---

## Option C: Temporary Browser Workaround (NOT RECOMMENDED)

**For testing only. DO NOT use in production.**

### Chrome/Edge
1. Click the shield icon in address bar
2. Click "Load unsafe scripts"
3. Page will reload with HTTP scripts allowed

### Firefox
1. Click the lock icon
2. Click "Connection not secure"
3. Click "Disable protection for now"

**Why not recommended:**
- Exposes users to security risks
- Only works for your browser (not for other users)
- Not a real solution

---

## Recommended Approach

**For Production:**
- Use Option B (Nginx + Let's Encrypt)
- Set up `chat.compsync.net` subdomain
- Free, secure, permanent solution

**For Quick Testing:**
- Use Option A (ngrok)
- Test widget functionality immediately
- Decide on permanent solution afterward

---

## After Setup Checklist

- [ ] Chatwoot accessible via HTTPS
- [ ] SSL certificate valid (green lock in browser)
- [ ] Vercel env var updated to HTTPS URL
- [ ] Redeployed Vercel app
- [ ] Widget loads without mixed content errors
- [ ] Can send/receive messages
- [ ] Email notifications working

---

## Troubleshooting

### Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

### Nginx Issues
```bash
# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Chatwoot Connection Issues
```bash
# Check Chatwoot is running
docker-compose ps

# View Chatwoot logs
docker-compose logs -f chatwoot

# Restart Chatwoot
docker-compose restart
```

---

**Created**: 2025-10-17
**Wave 4.1**: Chatwoot Integration - SSL Setup
