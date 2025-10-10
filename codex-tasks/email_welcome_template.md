## Task: Custom Signup Confirmation Email Template

**Context:**
- File: src/emails/WelcomeEmail.tsx
- Pattern: Follow existing email templates (src/emails/StudioApproved.tsx as reference)
- Email service: Resend (already configured)

**Requirements:**
1. Professional dark-themed email matching existing templates
2. Welcome message with personalized name
3. Getting Started section with 3-4 key steps:
   - Complete your profile
   - Create your first routine
   - Explore dashboard features
   - Contact support if needed
4. CTA button linking to dashboard
5. CompPortal branding (logo, colors)
6. Footer with social links placeholder

**Deliverables:**
- Complete WelcomeEmail.tsx component
- Export WelcomeEmail function
- Include EmailProps interface (name, email)

**Design System:**
- Background: Dark gradient (from-gray-900 to-gray-800)
- Primary color: Purple-500
- Text: White/gray-300
- Border: white/20 opacity
- Button: bg-purple-500 hover:bg-purple-600

**Reference:**
```tsx
// Follow this structure from StudioApproved.tsx
export default function WelcomeEmail({ name, email }: EmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        {/* Header with logo */}
        {/* Welcome section */}
        {/* Getting started steps */}
        {/* CTA button */}
        {/* Footer */}
      </Body>
    </Html>
  );
}
```

**Codex will**: Generate complete email template
**Claude will**: Review, integrate with auth trigger, test
