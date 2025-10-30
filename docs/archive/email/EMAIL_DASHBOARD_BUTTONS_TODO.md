# Email Dashboard Buttons - Remaining Work

## Progress: 2/12 Complete

### ✅ Completed:
1. PaymentConfirmed.tsx - Dashboard button added
2. InvoiceDelivery.tsx - Dashboard button added

### 🚧 Remaining (10 templates):

#### Templates with `portalUrl` (just need button):
1. **ReservationApproved.tsx**
   - Has: portalUrl, Button, gradientButton
   - Need: Add dashboardUrl variable + button section

2. **ReservationRejected.tsx**
   - Has: portalUrl, Button, gradientButton
   - Need: Add dashboardUrl variable + button section

3. **EntrySubmitted.tsx**
   - Has: portalUrl (implicit via email-templates type), Button, gradientButton
   - Need: Check if portalUrl in props, add dashboardUrl + button

4. **MissingMusicReminder.tsx**
   - Has: portalUrl, Button, gradientButton
   - Need: Add dashboardUrl variable + button section

5. **ReservationSubmitted.tsx** (CD email)
   - Has: portalUrl, Button, gradientButton
   - Need: Add dashboardUrl variable + button section

6. **RoutineSummarySubmitted.tsx** (CD email)
   - Has: portalUrl, Button, gradientButton
   - Need: Add dashboardUrl variable + button section

7. **StudioProfileSubmitted.tsx** (CD email)
   - Has: portalUrl, Button, gradientButton
   - Need: Add dashboardUrl variable + button section

8. **RegistrationConfirmation.tsx**
   - Has: portalUrl (need to verify)
   - Need: Import Button + gradientButton, add dashboardUrl + button

#### Templates needing `portalUrl` added:
9. **StudioApproved.tsx**
   - Has: Button (need to verify), gradientButton (need to verify)
   - Need: Add portalUrl to props/types, dashboardUrl variable, button section

10. **WelcomeEmail.tsx**
    - Has: dashboardUrl (already has it!)
    - Need: Import Button if missing, add button section

### ❌ Skip (no dashboard access):
- SignupConfirmation.tsx (user must confirm email first)
- StudioRejected.tsx (access denied, no dashboard)

---

## Standard Pattern

### 1. Props Interface
```tsx
interface TemplateProps {
  // ... existing props
  portalUrl?: string;
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}
```

### 2. Function Parameters
```tsx
export default function Template({
  // ... existing params
  portalUrl,
  tenantBranding,
}: TemplateProps) {
  const primaryColor = tenantBranding?.primaryColor || defaultBranding.primaryColor;
  const secondaryColor = tenantBranding?.secondaryColor || defaultBranding.secondaryColor;
  const dashboardUrl = portalUrl || 'https://www.compsync.net/dashboard';
```

### 3. Imports (if missing)
```tsx
import {
  // ... existing imports
  Button,
} from '@react-email/components';
import { emailTheme, gradientButton, defaultBranding } from './theme';
```

### 4. Button Section (before Hr)
```tsx
<Section style={{textAlign: 'center', padding: '20px 40px'}}>
  <Button href={dashboardUrl} style={{...gradientButton(primaryColor, secondaryColor), fontSize: '14px', padding: '12px 32px'}}>
    Go to Dashboard
  </Button>
</Section>

<Hr style={emailTheme.hr} />
```

---

## Type Updates Needed in `email-templates.tsx`

Add `portalUrl?: string;` to these interface definitions:
- ✅ PaymentConfirmedData (done)
- ✅ InvoiceDeliveryData (done)
- ⏳ RegistrationConfirmationData (if not present)
- ⏳ EntrySubmittedData (verify)
- ⏳ StudioApprovedData (verify)
- ⏳ WelcomeEmailData (verify)

---

## Build Status
- Last build: ✅ 64/64 pages passing
- Commit: 1fac9a7 (partial implementation)

## Estimated Time
- ~15 minutes for remaining 10 templates
- Pattern is established, just repetitive application
