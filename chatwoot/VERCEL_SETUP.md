# Chatwoot - Vercel Environment Variables Setup

## Issue: Widget Not Showing in Production

The Chatwoot support chat widget requires environment variables to be configured in **Vercel's project settings**. The `.env.local` file is only used for local development and does NOT get deployed.

## Required Environment Variables

Add these to your Vercel project settings:

### 1. Login to Vercel Dashboard
https://vercel.com/danman60s-projects/comp-portal/settings/environment-variables

### 2. Add the Following Variables

**All environments (Production, Preview, Development):**

| Variable Name | Value |
|---------------|-------|
| `NEXT_PUBLIC_CHATWOOT_BASE_URL` | `http://159.89.115.95:3000` |
| `NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN` | `AqBFyfVtETJEV6Ve5qe86C7S` |
| `NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN` | `Q5OzfrxnEMEQxS4MHp7rnZa` |
| `NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN` | `irbhliLmxlGRoPAxqyIiZhrY` |

## Step-by-Step Instructions

### Via Vercel Dashboard (Recommended)

1. **Open Project Settings**
   - Go to https://vercel.com
   - Navigate to your `comp-portal` project
   - Click **Settings** → **Environment Variables**

2. **Add Each Variable**
   - Click **Add New**
   - **Key**: Enter variable name (e.g., `NEXT_PUBLIC_CHATWOOT_BASE_URL`)
   - **Value**: Enter the corresponding value
   - **Environments**: Select **Production**, **Preview**, and **Development**
   - Click **Save**
   - Repeat for all 4 variables

3. **Redeploy**
   - After adding all variables, trigger a new deployment:
     - Go to **Deployments** tab
     - Click **Redeploy** on the latest deployment
     - OR push a new commit to trigger automatic deployment

### Via Vercel CLI (Alternative)

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login
vercel login

# Link to project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_CHATWOOT_BASE_URL production
# Enter value: http://159.89.115.95:3000

vercel env add NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN production
# Enter value: AqBFyfVtETJEV6Ve5qe86C7S

vercel env add NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN production
# Enter value: Q5OzfrxnEMEQxS4MHp7rnZa

vercel env add NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN production
# Enter value: irbhliLmxlGRoPAxqyIiZhrY

# Repeat for preview and development environments
vercel env add NEXT_PUBLIC_CHATWOOT_BASE_URL preview
# ... etc

# Trigger new deployment
vercel --prod
```

## Verification

After adding the environment variables and redeploying:

1. **Open Browser Console** (F12 → Console tab)

2. **Login as Studio Director**

3. **Look for Debug Messages**:
   - ✅ **Success**: `SupportChatWrapper: Rendering chat button for studio_director`
   - ❌ **Missing Config**: `SupportChatButton: Missing Chatwoot configuration`
     - Shows which tokens are missing (true/false for each)
   - ❌ **User Load Error**: `SupportChatWrapper: Error loading user`
   - ⚠️ **Wrong Role**: `SupportChatWrapper: User role not SD/CD`

4. **Check for Chat Button**
   - Should appear in bottom-right corner
   - Purple-blue gradient button with "Support" text
   - Clicking should show modal with 2 options

## Troubleshooting

### Widget Still Not Showing

1. **Hard Refresh**: Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

2. **Check Console**:
   ```javascript
   // Open browser console and run:
   console.log({
     baseUrl: process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL,
     sdTech: !!process.env.NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN,
     sdCd: !!process.env.NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN,
     cdTech: !!process.env.NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN,
   });
   ```
   All values should be truthy/defined

3. **Verify Deployment**:
   - Check that the deployment after adding env vars is **READY**
   - Ensure you're testing the latest deployment URL

4. **Check User Role**:
   - Ensure you're logged in as **Studio Director** or **Competition Director**
   - Super Admin users won't see the button

### Environment Variables Not Taking Effect

- Environment variables only take effect on **new deployments**
- If you added them recently, trigger a new deployment:
  - Push a new commit, OR
  - Go to Vercel dashboard → Deployments → Redeploy

### Chatwoot Server Not Responding

- Verify Chatwoot is running: http://159.89.115.95:3000
- If server is down, SSH to DigitalOcean droplet:
  ```bash
  cd /path/to/chatwoot
  docker-compose up -d
  ```

## Security Notes

- These are **public client tokens** (scoped to specific inboxes)
- Safe to expose in client-side code
- Each token only grants access to its specific inbox
- Messages are stored on self-hosted Chatwoot server

## Next Steps

After setup:
1. Test as Studio Director (should see modal with 2 options)
2. Test as Competition Director (should see chat open directly)
3. Verify messages appear in Chatwoot dashboard (http://159.89.115.95:3000)
4. Test email reply functionality

---

**Created**: 2025-10-17
**Wave 4.1**: Chatwoot Integration
