# Task: Integrate Welcome Email Template

**Priority**: HIGH (Post-Demo Round)
**Estimate**: 30 minutes
**Status**: Ready for Codex

---

## Context

Welcome email template is complete (`src/emails/WelcomeEmail.tsx`, 206 lines) but not integrated. When a studio is approved by a Competition Director, the studio owner should receive a welcome email.

**Integration Point**: `studio.approve` mutation in `src/server/routers/studio.ts`

---

## Implementation Steps

### Step 1: Import Email Template and Sender

**At top of `src/server/routers/studio.ts`:**
```typescript
import { WelcomeEmail } from '@/emails/WelcomeEmail';
import { sendEmail } from '@/lib/email'; // Or whatever email sender exists
```

**If sendEmail doesn't exist**, check for:
- `@/lib/email-sender.ts`
- `@/lib/mailer.ts`
- `@/lib/sendEmail.ts`
- Search codebase for "sendEmail" or "transporter.sendMail"

### Step 2: Find Studio Approve Mutation

Search for:
```typescript
approve: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
```

### Step 3: Get Studio Owner Information

**After approval but before return**, fetch owner details:
```typescript
// After: await prisma.studios.update({ where: { id: input.id }, data: { status: 'approved' } })

// Fetch owner profile for email
const owner = await prisma.user_profiles.findUnique({
  where: { id: studio.owner_id },
  select: {
    first_name: true,
    last_name: true,
    email: true // Or get from auth.users if stored there
  }
});

if (!owner) {
  console.error('Owner not found for studio approval email');
  return studio; // Still return success
}
```

**Note**: Check if email is in `user_profiles` or `auth.users` table:
```typescript
// If email is in auth.users:
const { data: authUser } = await ctx.supabase.auth.admin.getUserById(studio.owner_id);
const email = authUser?.user?.email;
```

### Step 4: Send Welcome Email

**After fetching owner info:**
```typescript
try {
  await sendEmail({
    to: owner.email || authUser?.user?.email,
    subject: 'Welcome to CompPortal - Studio Approved!',
    react: WelcomeEmail({
      studioName: studio.name,
      firstName: owner.first_name,
      // Add any other props WelcomeEmail expects
    })
  });

  console.log(`Welcome email sent to ${owner.email} for studio ${studio.name}`);
} catch (error) {
  console.error('Failed to send welcome email:', error);
  // Don't throw - approval should succeed even if email fails
}
```

---

## Email Sender Pattern

**Check existing email sends in codebase** for the correct pattern:
```bash
# Search for email sending examples
grep -r "sendEmail\|transporter.sendMail" src/
```

**Common patterns:**

**Pattern A - Resend:**
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'CompPortal <noreply@compsync.net>',
  to: owner.email,
  subject: 'Welcome to CompPortal',
  react: WelcomeEmail({ studioName: studio.name, firstName: owner.first_name })
});
```

**Pattern B - Nodemailer:**
```typescript
import { transporter } from '@/lib/mailer';
import { render } from '@react-email/render';

const emailHtml = render(WelcomeEmail({ studioName: studio.name, firstName: owner.first_name }));

await transporter.sendMail({
  from: 'CompPortal <noreply@compsync.net>',
  to: owner.email,
  subject: 'Welcome to CompPortal',
  html: emailHtml
});
```

**Pattern C - Custom sendEmail helper:**
```typescript
import { sendEmail } from '@/lib/email';

await sendEmail({
  to: owner.email,
  subject: 'Welcome to CompPortal',
  template: 'welcome',
  data: { studioName: studio.name, firstName: owner.first_name }
});
```

---

## WelcomeEmail Component Props

**Check `src/emails/WelcomeEmail.tsx`** for exact prop requirements:
```typescript
interface WelcomeEmailProps {
  studioName: string;
  firstName: string;
  // ... any other required props
}
```

---

## Quality Gates (MANDATORY)

1. ✅ **Email sends after approval**: Test in development
2. ✅ **Email template renders**: No React errors
3. ✅ **Approval succeeds even if email fails**: Wrapped in try/catch
4. ✅ **Correct email address**: Verify user email source (user_profiles vs auth.users)
5. ✅ **TypeScript compiles**: `npm run build` succeeds
6. ✅ **No blocking errors**: Email failure logs error but doesn't throw

---

## Testing Checklist

After integration:
1. Approve a pending studio
2. Check console logs for "Welcome email sent..."
3. Check email inbox (if test email configured)
4. Verify studio status changes to 'approved' even if email fails
5. Check for any error logs

---

## Deliverables

Output file: `codex-tasks/outputs/integrate_welcome_email_result.md`

Include:
1. File modified: `src/server/routers/studio.ts`
2. Line numbers changed
3. Email sender pattern used (Resend/Nodemailer/Custom)
4. Email address source (user_profiles.email vs auth.users)
5. Test results (if possible to test)
6. Build output (success/fail)

---

## Reference Files

**Read these first:**
- `src/emails/WelcomeEmail.tsx` - Email template (check props)
- `src/server/routers/studio.ts` - Studio router (find approve mutation)
- Search for existing email sends in codebase:
  - `src/server/routers/` - Look for other email sends
  - `src/lib/` - Look for email helper functions

**If email sender doesn't exist**, check:
- `package.json` - Is Resend installed? Nodemailer?
- `.env.local` - Email API keys configured?
- May need to use existing email infrastructure from other mutations

---

**Start Time**: [Record when you start]
**Expected Duration**: 30 minutes
