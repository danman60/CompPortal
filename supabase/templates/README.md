# Supabase Email Templates

## Overview

Custom branded email templates for CompSync authentication emails.

## Templates

- **confirmation.html** - Email confirmation for new signups

## Local Development

The templates are automatically used in local development via `supabase/config.toml`.

To test emails locally:
1. Start Supabase: `npx supabase start`
2. Open Inbucket (email testing): `http://localhost:54324`
3. Sign up a new user in the app
4. Check Inbucket to see the branded confirmation email

## Production Setup

To use these templates in production Supabase:

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Authentication → Email Templates**
3. Select **Confirm signup** template
4. Copy the contents of `confirmation.html`
5. Paste into the template editor
6. Update any variables if needed (Supabase uses `{{ .ConfirmationURL }}` syntax)
7. Click **Save**

### Option 2: Supabase CLI

```bash
# Link to your production project
npx supabase link --project-ref your-project-ref

# Push the configuration (includes email templates)
npx supabase db push
```

## Template Variables

Supabase provides these variables for email templates:

- `{{ .ConfirmationURL }}` - Full confirmation link (includes token)
- `{{ .Token }}` - The confirmation token only
- `{{ .TokenHash }}` - Hashed version of the token
- `{{ .SiteURL }}` - Your site URL (from Supabase settings)
- `{{ .Email }}` - The user's email address

## Customization

To modify the branding:

1. Edit `confirmation.html`
2. Update colors in the `<style>` section
3. Change logo emoji (currently ✨)
4. Modify text content as needed
5. Test locally before deploying to production

## Mobile Responsive

The template includes media queries for mobile devices and is tested on:
- iOS Mail
- Gmail (iOS/Android)
- Outlook (Web/Desktop)
- Apple Mail (macOS)

## Security Notes

- Confirmation links expire in 24 hours (Supabase default)
- Template includes security notice for users
- Uses HTTPS for all links in production
