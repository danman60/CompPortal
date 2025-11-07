# Dancer Invoice UI Fixes - Completed

**Date:** November 6, 2025
**Status:** ✅ UI Complete - Backend Integration Pending

---

## What Was Fixed

### 1. ✅ Modal Background Added
- `SubInvoiceList` now renders as a full-page modal overlay
- Matches wizard style: dark backdrop (`bg-black/70 backdrop-blur-sm`)
- Centered modal with purple-indigo gradient background
- Sticky header with close button (X icon)

### 2. ✅ Design Fixed (No More White-on-White)
- All text colors explicitly set to white/gray on dark background
- Table headers: `text-white` on `bg-white/10`
- Table rows: `text-white` and `text-gray-200/300` on hover `bg-white/10`
- Validation banner: Proper contrast with green/red backgrounds
- All buttons: `text-gray-300 hover:text-white` with `hover:bg-white/10`

### 3. ✅ Download All PDFs Button Wired
- Triggers `handleDownloadAllPDFs()` function
- Loops through all sub-invoices
- Calls `handleDownloadPDF(subInvoice)` for each dancer
- Adds 500ms delay between downloads to avoid browser blocking
- **Status:** Button functional, but PDF generation needs backend endpoint

### 4. ✅ Send All Emails Button Wired
- Opens `EmailAllModal` component
- Full modal with table showing all dancers
- Email input fields for each dancer
- Checkboxes to select which dancers to email
- Editable email subject and body
- Validates email addresses (basic @ check)
- Shows count of selected dancers
- Disables send button if no valid emails
- **Status:** Modal complete, but email sending needs backend endpoint

### 5. ✅ Individual PDF Download Buttons Wired
- Each row has download button (Download icon)
- Calls `handleDownloadPDF(subInvoice)` for that specific dancer
- Button styled with proper hover states
- **Status:** Button functional, but PDF generation needs backend endpoint

### 6. ✅ Individual Email Send Buttons Wired
- Each row has email button (Mail icon)
- Currently shows alert for single-dancer email
- **Status:** Button functional, but single-dancer email modal needs implementation

---

## What Still Needs Backend Support

### 1. ⚠️ PDF Generation Endpoint

**Problem:** `handleDownloadPDF` calls alert because we don't have full invoice data

**What's Needed:**
```typescript
// New tRPC endpoint
trpc.invoice.getSubInvoiceDetails.useQuery({ subInvoiceId: string })
```

**Should Return:**
```typescript
{
  subInvoice: {
    id: string;
    dancer_name: string;
    dancer_id: string;
    line_items: Array<{
      entry_number: number;
      title: string;
      amount: number;
      late_fee?: number;
    }>;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
  };
  competition: {
    name: string;
    year: number;
    startDate: string;
    endDate?: string;
    location?: string;
  };
  studio: {
    name: string;
    code?: string;
    email?: string;
    phone?: string;
    address1?: string;
    city?: string;
    province?: string;
    postal_code?: string;
  };
  invoiceNumber: string; // Format: INV-2026-LONDON-{uuid}
  invoiceDate: Date;
  tenant?: {
    branding?: {
      primaryColor?: string;
      tagline?: string;
    };
  };
}
```

**Then Update Client Code:**
```typescript
const handleDownloadPDF = async (subInvoice: any) => {
  const { data } = await trpc.invoice.getSubInvoiceDetails.useQuery({
    subInvoiceId: subInvoice.id
  });

  if (!data) return;

  // Use existing generateInvoicePDF function
  const pdfBlob = generateInvoicePDF({
    invoiceNumber: data.invoiceNumber,
    invoiceDate: data.invoiceDate,
    competition: data.competition,
    studio: data.studio,
    lineItems: data.subInvoice.line_items,
    summary: {
      entryCount: data.subInvoice.line_items.length,
      subtotal: data.subInvoice.subtotal,
      taxRate: data.subInvoice.tax_rate / 100,
      taxAmount: data.subInvoice.tax_amount,
      totalAmount: data.subInvoice.total,
    },
    tenant: data.tenant,
  });

  // Trigger download
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice-${data.subInvoice.dancer_name}-${data.invoiceNumber}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};
```

### 2. ⚠️ Email Sending Endpoint

**Problem:** `onSend` in EmailAllModal just shows alert

**What's Needed:**
```typescript
// New tRPC mutation
trpc.invoice.sendDancerInvoiceEmails.useMutation()
```

**Input:**
```typescript
{
  parentInvoiceId: string;
  emails: Array<{
    subInvoiceId: string;
    dancerName: string;
    emailAddress: string;
  }>;
  emailSubject: string;
  emailBody: string; // Can contain [Dancer Name] placeholder
}
```

**Backend Should:**
1. Fetch each sub-invoice details
2. Generate PDF for each dancer
3. Replace [Dancer Name] placeholder in email body
4. Send email with PDF attachment using existing email service
5. Return success/failure for each email

**Response:**
```typescript
{
  success: boolean;
  sent: number;
  failed: number;
  errors?: Array<{
    dancerName: string;
    error: string;
  }>;
}
```

**Then Update Client Code:**
```typescript
const handleSendEmails = async () => {
  const selectedDancers = emailData.filter(d => d.sendEmail && d.email.trim());

  const result = await sendEmailsMutation.mutateAsync({
    parentInvoiceId,
    emails: selectedDancers.map(d => ({
      subInvoiceId: d.id,
      dancerName: d.dancer_name,
      emailAddress: d.email,
    })),
    emailSubject,
    emailBody,
  });

  if (result.success) {
    alert(`✅ Sent ${result.sent} emails successfully!`);
    setShowEmailModal(false);
  } else {
    alert(`⚠️ Sent ${result.sent}, failed ${result.failed}. Check console for details.`);
  }
};
```

### 3. 📋 Optional: Single-Dancer Email Modal

**Current:** Individual email button shows alert

**Enhancement:** Create a simplified version of EmailAllModal for single dancer
- Pre-filled with one dancer
- Same subject/body editor
- Simpler UI (no table, just one email input)

---

## Files Modified

1. **`src/components/SubInvoiceList.tsx`** (Complete rewrite)
   - Added modal background wrapper
   - Fixed all text colors for dark theme
   - Wired up PDF download functions
   - Created EmailAllModal component
   - Added email state management
   - Styled table with proper contrast

---

## Testing Checklist

### ✅ UI Testing (Can Test Now)
- [x] Modal background displays correctly
- [x] No white-on-white text anywhere
- [x] Download All PDFs button clickable (shows alert)
- [x] Send All Emails button opens modal
- [x] Email modal table displays all dancers
- [x] Email input fields work
- [x] Checkboxes toggle properly
- [x] Email subject/body editable
- [x] Validation shows for invalid emails
- [x] Send button disables when no valid emails
- [x] Individual PDF buttons clickable (show alert)
- [x] Individual email buttons clickable (show alert)
- [x] Close (X) button works on both modals

### ⏳ Integration Testing (Needs Backend)
- [ ] PDF downloads trigger for all dancers
- [ ] PDF contains correct dancer-specific data
- [ ] PDF format matches main invoice style
- [ ] Email modal sends emails successfully
- [ ] Emails contain PDF attachments
- [ ] [Dancer Name] placeholder replaced correctly
- [ ] Email errors handled gracefully

---

## Summary

**What's Done:**
- ✅ All UI components built and styled
- ✅ Modal backgrounds added (matches wizard)
- ✅ No white-on-white text issues
- ✅ Buttons wired to functions
- ✅ Email modal fully functional (UI only)
- ✅ Form validation working
- ✅ User can enter emails, edit message, select dancers

**What's Blocked:**
- ⚠️ PDF generation (needs `getSubInvoiceDetails` endpoint)
- ⚠️ Email sending (needs `sendDancerInvoiceEmails` mutation)

**Estimated Backend Work:** 2-3 hours
- 1 hour: Create `getSubInvoiceDetails` query
- 1 hour: Create `sendDancerInvoiceEmails` mutation
- 30 min: Testing both endpoints

---

**Ready for user testing of UI/UX flow!**
