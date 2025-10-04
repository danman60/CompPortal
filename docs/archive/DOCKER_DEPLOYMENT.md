# Docker Deployment Guide for DigitalOcean

## Prerequisites

- DigitalOcean droplet with Docker and Docker Compose installed
- SSH access to the droplet
- Port 3000 open in firewall

## Quick Deployment

### 1. SSH into your droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### 2. Clone the repository

```bash
cd /opt
git clone https://github.com/danman60/CompPortal.git
cd CompPortal
```

### 3. Create production environment file

```bash
cp .env.production.example .env.production
```

### 4. Edit environment variables

```bash
nano .env.production
```

Replace the placeholder values:

```env
DATABASE_URL="postgresql://postgres:!EH4TtrJ2-V!5b_@db.cafugvuaatsgihrsmvvl.supabase.co:5432/postgres?schema=public&sslmode=require&connect_timeout=15"
DIRECT_URL="postgresql://postgres:!EH4TtrJ2-V!5b_@db.cafugvuaatsgihrsmvvl.supabase.co:5432/postgres?schema=public&sslmode=require"
NEXT_PUBLIC_SUPABASE_URL=https://cafugvuaatsgihrsmvvl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhZnVndnVhYXRzZ2locnNtdnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTk5MzksImV4cCI6MjA3NDgzNTkzOX0.WqX70GzRkDRhcurYeEnqG8YFniTYFqpjv6u3mPlbdoc
SUPABASE_SERVICE_ROLE_KEY=sb_secret_4awE8z8fbv-bk2KSYjSp_Q_T_zpXh25
NEXT_PUBLIC_APP_URL=http://$(curl -s ifconfig.me):3000
NODE_ENV=production
```

Save and exit (Ctrl+X, Y, Enter in nano)

### 5. Build and start the container

```bash
docker-compose up -d --build
```

This will:
- Build the Docker image (~2-3 minutes)
- Install all dependencies
- Generate Prisma Client
- Build Next.js for production
- Start the container in the background

### 6. Monitor the deployment

```bash
# Watch logs in real-time
docker-compose logs -f

# Check if container is running
docker ps

# Check container status
docker-compose ps
```

### 7. Test the deployment

```bash
# Test from inside the droplet
curl http://localhost:3000/api/trpc/test.getServerStatus

# Expected response:
# {"result":{"data":{"json":{"status":"online","message":"GlowDance API Server is running",...}}}}

# Test database connection
curl http://localhost:3000/api/trpc/studio.getStats

# Expected response:
# {"result":{"data":{"json":{"totalStudios":3,"pendingStudios":0,...}}}}
```

### 8. Test external access

From your local machine:

```bash
curl http://YOUR_DROPLET_IP:3000/api/trpc/test.getServerStatus
```

## Management Commands

### View logs

```bash
docker-compose logs -f
```

### Restart the container

```bash
docker-compose restart
```

### Stop the container

```bash
docker-compose down
```

### Rebuild after code changes

```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

### View container status

```bash
docker ps
docker-compose ps
```

### Access container shell

```bash
docker-compose exec compportal sh
```

## Troubleshooting

### Container won't start

```bash
# Check logs for errors
docker-compose logs

# Remove old containers and rebuild
docker-compose down
docker system prune -a
docker-compose up -d --build
```

### Database connection fails

```bash
# Check environment variables are loaded
docker-compose exec compportal env | grep DATABASE_URL

# Test connection from inside container
docker-compose exec compportal wget -O- http://localhost:3000/api/trpc/test.checkEnv
```

### Port 3000 already in use

Edit `docker-compose.yml` and change the port mapping:

```yaml
ports:
  - "8080:3000"  # Change 3000 to 8080 or any available port
```

### Can't reach from external IP

Check firewall settings:

```bash
# UFW (Ubuntu)
sudo ufw allow 3000/tcp
sudo ufw status

# iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

### Out of disk space

```bash
# Clean up Docker resources
docker system prune -a --volumes

# Check disk usage
df -h
docker system df
```

## Production Optimizations (Optional)

### 1. Set up Nginx reverse proxy

```bash
sudo apt install nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/compportal
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

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

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/compportal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Add SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Set up automatic updates

```bash
# Create update script
nano /opt/CompPortal/update.sh
```

```bash
#!/bin/bash
cd /opt/CompPortal
git pull origin main
docker-compose down
docker-compose up -d --build
```

```bash
chmod +x /opt/CompPortal/update.sh

# Add to crontab for weekly updates
crontab -e
# Add: 0 2 * * 0 /opt/CompPortal/update.sh >> /var/log/compportal-update.log 2>&1
```

## Health Checks

The container includes a health check that runs every 30 seconds:

```bash
# Check health status
docker inspect compportal-compportal-1 | grep Health -A 10
```

## Success Indicators

✅ Container shows as "Up" and "healthy" in `docker ps`
✅ Logs show "ready started server on 0.0.0.0:3000"
✅ Test endpoints return valid JSON (not 500 errors)
✅ Database queries return data from Supabase
✅ Can access from external IP

## Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Verify environment variables are correct
3. Ensure port 3000 is open in firewall
4. Test database connection from droplet to Supabase
5. Check Docker and Docker Compose versions

## Architecture

```
Client (Browser)
    ↓
Nginx (Optional - Port 80/443)
    ↓
Docker Container (Port 3000)
    ↓ Next.js App
    ↓ tRPC API
    ↓ Prisma ORM
    ↓
Supabase PostgreSQL (db.cafugvuaatsgihrsmvvl.supabase.co:5432)
```

---

**Need help?** Check the session logs in the repository or raise an issue on GitHub.
