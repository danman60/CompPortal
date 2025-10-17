# Chatwoot Deployment Guide - DigitalOcean Droplet

This guide walks through deploying Chatwoot on a DigitalOcean droplet using Docker Compose.

---

## Prerequisites

- DigitalOcean droplet (Ubuntu 20.04+, 2GB RAM minimum, 4GB recommended)
- Domain name with DNS configured (optional but recommended)
- Email account with SMTP/IMAP access (Gmail, SendGrid, etc.)

---

## Step 1: SSH into Your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

---

## Step 2: Install Docker & Docker Compose

```bash
# Update package index
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

---

## Step 3: Create Chatwoot Directory

```bash
# Create directory for Chatwoot
mkdir -p /opt/chatwoot
cd /opt/chatwoot
```

---

## Step 4: Upload Configuration Files

**Option A: Use git (if CompPortal repo is accessible)**
```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/CompPortal.git
cd CompPortal/chatwoot

# Copy env example to .env
cp .env.example .env
```

**Option B: Create files manually**
```bash
# Create docker-compose.yml
nano docker-compose.yml
# Paste the contents from CompPortal/chatwoot/docker-compose.yml
# Save with Ctrl+X, Y, Enter

# Create .env file
nano .env
# Paste contents from .env.example and fill in your values
# Save with Ctrl+X, Y, Enter
```

---

## Step 5: Configure Environment Variables

```bash
nano .env
```

**Generate secure passwords and secrets:**
```bash
# Generate POSTGRES_PASSWORD
openssl rand -hex 32

# Generate REDIS_PASSWORD
openssl rand -hex 32

# Generate SECRET_KEY_BASE
openssl rand -hex 64
```

**Fill in these critical values:**
```bash
POSTGRES_PASSWORD=<paste generated password>
REDIS_PASSWORD=<paste generated password>
SECRET_KEY_BASE=<paste generated secret>
FRONTEND_URL=http://YOUR_DROPLET_IP:3000

# Email settings (example with Gmail)
MAILER_SENDER_EMAIL=support@glowdance.com
SMTP_ADDRESS=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=support@glowdance.com
SMTP_PASSWORD=<your app-specific password>

IMAP_ADDRESS=imap.gmail.com
IMAP_PORT=993
IMAP_EMAIL=support@glowdance.com
IMAP_PASSWORD=<your app-specific password>
```

**For Gmail:**
1. Go to Google Account > Security
2. Enable 2-Factor Authentication
3. Create App Password: https://myaccount.google.com/apppasswords
4. Use the generated 16-character password for both SMTP_PASSWORD and IMAP_PASSWORD

Save with `Ctrl+X`, `Y`, `Enter`

---

## Step 6: Start Chatwoot

```bash
# Pull images (takes 2-5 minutes)
docker-compose pull

# Start services
docker-compose up -d

# Check logs to ensure everything started correctly
docker-compose logs -f
```

**You should see:**
```
chatwoot_1  | => Booting Puma
chatwoot_1  | => Rails 6.x.x application starting in production
chatwoot_1  | * Listening on tcp://0.0.0.0:3000
sidekiq_1   | Booted Rails 6.x.x application in production environment
```

Press `Ctrl+C` to stop following logs (containers keep running)

---

## Step 7: Run Database Migrations

```bash
# Run migrations (first-time setup only)
docker-compose run --rm chatwoot bundle exec rails db:chatwoot_prepare

# This command:
# - Creates database tables
# - Runs migrations
# - Seeds initial data
```

---

## Step 8: Access Chatwoot

Open browser and go to:
```
http://YOUR_DROPLET_IP:3000
```

**First-time setup:**
1. You'll see "Create your account" screen
2. Fill in:
   - **Full Name**: Your name
   - **Work Email**: your@email.com
   - **Password**: Strong password
   - **Company Name**: GlowDance
3. Click "Create Account"

---

## Step 9: Create Inboxes (3 Chat Paths)

### Inbox 1: SD → Tech Support (SA)

1. Click **Settings** (gear icon) → **Inboxes** → **Add Inbox**
2. Select **Website**
3. Fill in:
   - **Channel Name**: SD Tech Support
   - **Website Name**: GlowDance Portal
   - **Website Domain**: compportal.vercel.app
4. Click **Create**
5. **Copy the widget token** (looks like: `abc123xyz...`)
6. Save as: `CHATWOOT_SD_TECH_TOKEN`

### Inbox 2: SD → Competition Director

1. Settings → Inboxes → Add Inbox → Website
2. Fill in:
   - **Channel Name**: SD Questions for CD
   - **Website Name**: GlowDance Portal
   - **Website Domain**: compportal.vercel.app
3. **Copy the widget token**
4. Save as: `CHATWOOT_SD_CD_TOKEN`

### Inbox 3: CD → Tech Support (SA)

1. Settings → Inboxes → Add Inbox → Website
2. Fill in:
   - **Channel Name**: CD Tech Support
   - **Website Name**: GlowDance Portal
   - **Website Domain**: compportal.vercel.app
3. **Copy the widget token**
4. Save as: `CHATWOOT_CD_TECH_TOKEN`

---

## Step 10: Configure Email Forwarding

For each inbox, set up email forwarding so you can reply via email:

1. Go to **Settings** → **Inboxes** → Click inbox name
2. Scroll to **Email Collect**
3. You'll see an email like: `inbox+abc123@chat.glowdance.com`
4. Configure your email client to forward to this address
5. Enable "Allow messages after conversation is resolved"

---

## Step 11: Add Environment Variables to CompPortal

Add these to your `.env.local` in CompPortal:

```bash
# Chatwoot Configuration
NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN_SD_TECH=<paste CHATWOOT_SD_TECH_TOKEN>
NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN_SD_CD=<paste CHATWOOT_SD_CD_TOKEN>
NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN_CD_TECH=<paste CHATWOOT_CD_TECH_TOKEN>
NEXT_PUBLIC_CHATWOOT_BASE_URL=http://YOUR_DROPLET_IP:3000
```

---

## Optional: Set Up Domain & SSL (Recommended for Production)

### Configure DNS

Point subdomain to droplet:
```
chat.glowdance.com → A record → YOUR_DROPLET_IP
```

### Install Nginx & Certbot

```bash
# Install Nginx
apt install nginx -y

# Configure Nginx
nano /etc/nginx/sites-available/chatwoot
```

Paste:
```nginx
server {
    listen 80;
    server_name chat.glowdance.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/chatwoot /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Install SSL

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d chat.glowdance.com

# Auto-renewal is configured automatically
```

Update `.env`:
```bash
FRONTEND_URL=https://chat.glowdance.com
```

Restart Chatwoot:
```bash
cd /opt/chatwoot
docker-compose restart
```

---

## Useful Commands

```bash
# View logs
docker-compose logs -f

# Restart all services
docker-compose restart

# Stop all services
docker-compose down

# Update Chatwoot to latest version
docker-compose pull
docker-compose up -d
docker-compose run --rm chatwoot bundle exec rails db:migrate

# Backup database
docker exec chatwoot_postgres_1 pg_dump -U postgres chatwoot > backup.sql
```

---

## Troubleshooting

### Can't access Chatwoot

```bash
# Check if containers are running
docker-compose ps

# Check firewall
ufw allow 3000/tcp
ufw reload

# Check logs for errors
docker-compose logs chatwoot
docker-compose logs sidekiq
```

### Email not sending

```bash
# Test SMTP connection
docker-compose run --rm chatwoot bundle exec rails runner "ActionMailer::Base.mail(from: ENV['MAILER_SENDER_EMAIL'], to: 'your@email.com', subject: 'Test', body: 'Test').deliver_now"

# Check Sidekiq logs
docker-compose logs sidekiq
```

### Database issues

```bash
# Reset database (WARNING: Deletes all data!)
docker-compose down -v
docker-compose up -d
docker-compose run --rm chatwoot bundle exec rails db:chatwoot_prepare
```

---

## Next Steps

1. Create team members in Chatwoot (Settings → Team → Agents)
2. Customize widget appearance (Settings → Inboxes → [Inbox] → Widget)
3. Set up canned responses (Settings → Canned Responses)
4. Configure business hours (Settings → Inboxes → [Inbox] → Settings)
5. Integrate widget into CompPortal (see Widget Implementation Guide)

---

## Security Recommendations

- [ ] Change default admin password
- [ ] Set up SSL/TLS (see Optional section above)
- [ ] Enable firewall: `ufw allow 22,80,443/tcp && ufw enable`
- [ ] Regular backups of Postgres database
- [ ] Keep Docker images updated: `docker-compose pull && docker-compose up -d`
- [ ] Use strong passwords for all services
- [ ] Consider restricting Chatwoot admin access by IP

---

## Support

- Chatwoot Docs: https://www.chatwoot.com/docs
- Chatwoot GitHub: https://github.com/chatwoot/chatwoot
- Community: https://github.com/chatwoot/chatwoot/discussions
