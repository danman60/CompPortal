/**
 * Send invoice correction emails for Production $0 bug fix
 * Run with: npx tsx scripts/send-invoice-correction-emails.ts
 */

import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../src/lib/email';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// EMPWR studios to email
const EMPWR_INVOICES = [
  { newId: '8fa14a8c-3e77-4fb8-973f-cf7cb021fc0f', oldId: 'bb08b9ce-26c8-4b37-af0f-99d2e46a2bfc' },
  { newId: '1344cd28-ecae-4882-bc1b-19b374d9968d', oldId: '081cf8ee-0052-4a8a-be61-3a0cfb30b129' },
  { newId: '1a3c868c-ddc3-4409-b438-6342ce9d5bb8', oldId: 'b62b4468-a206-4c52-a0f8-a0cb24195e67' },
  { newId: '0c5d7de7-d5ec-40b9-b033-c61467052ba2', oldId: 'de0daeee-6756-42f9-a637-9bdd8f0913c0' },
];

const EMPWR_BRANDING = {
  primaryColor: '#FF1493',
  name: 'EMPWR Dance Experience',
  subdomain: 'empwr',
};

function generateEmail(data: {
  studioName: string;
  competitionName: string;
  entryTitle: string;
  participants: number;
  productionFee: number;
  originalTotal: number;
  amountPaid: number;
  correctedTotal: number;
  balanceDue: number;
  subdomain: string;
  studioId: string;
  competitionId: string;
  branding: { primaryColor: string; name: string };
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, ${data.branding.primaryColor} 0%, #9333ea 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">${data.branding.name}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Invoice Correction Notice</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${data.studioName}</strong>,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                As mentioned in our recent communication, we discovered a billing error that affected your invoice for <strong>${data.competitionName}</strong>. This email contains your corrected invoice details and updated balance.
              </p>
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">What happened:</p>
                <p style="color: #78350f; font-size: 14px; margin: 8px 0 0 0;">
                  Due to a system configuration error, your <strong>Production</strong> entry was incorrectly billed at <strong>$0</strong> instead of the correct fee of <strong>$55 per participant</strong>.
                </p>
                <p style="color: #78350f; font-size: 14px; margin: 8px 0 0 0;">
                  You can verify this by reviewing your previous invoice, where the Production entry "${data.entryTitle}" shows a $0 fee.
                </p>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your updated invoice now includes the correct Production fee: <strong>${data.participants} participants × $55 = $${data.productionFee.toFixed(2)}</strong>
              </p>
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #111827; font-size: 16px; margin: 0 0 16px 0; font-weight: 600;">Updated Invoice Summary</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                  <tr>
                    <td style="color: #6b7280; padding: 8px 0;">Original Invoice Total:</td>
                    <td style="color: #374151; text-align: right; padding: 8px 0;">$${data.originalTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; padding: 8px 0;">Amount Already Paid:</td>
                    <td style="color: #10b981; text-align: right; padding: 8px 0; font-weight: 600;">-$${data.amountPaid.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; padding: 8px 0;">Corrected Invoice Total:</td>
                    <td style="color: #374151; text-align: right; padding: 8px 0;">$${data.correctedTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 8px;"></td>
                  </tr>
                  <tr>
                    <td style="color: #111827; padding: 8px 0; font-weight: 700; font-size: 16px;">Balance Due:</td>
                    <td style="color: ${data.branding.primaryColor}; text-align: right; padding: 8px 0; font-weight: 700; font-size: 18px;">$${data.balanceDue.toFixed(2)}</td>
                  </tr>
                </table>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                A corrected invoice has been generated and is available in your studio portal. Any previous payments have been credited, so only the balance shown above is due.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://${data.subdomain}.compsync.net/dashboard/invoices/${data.studioId}/${data.competitionId}" style="display: inline-block; background: linear-gradient(135deg, ${data.branding.primaryColor} 0%, #9333ea 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Updated Invoice</a>
              </div>
              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                <p style="color: #1e40af; font-size: 14px; margin: 0; font-weight: 600;">Payment Extension Available</p>
                <p style="color: #1e3a8a; font-size: 14px; margin: 8px 0 0 0;">
                  If you need additional time to submit payment for the Production portion of your balance due to this billing error, we are happy to extend your deadline through <strong>December 30, 2025</strong>.
                </p>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We understand this is inconvenient and appreciate your patience. If you have any questions or concerns, please don't hesitate to reach out.
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
                Thank you for your understanding,<br/>
                <strong>The ${data.branding.name} Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This email was sent regarding your ${data.competitionName} registration.<br/>
                If you believe this was sent in error, please contact us.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

async function sendEmpwrEmails() {
  console.log('=== EMPWR Invoice Correction Emails ===\n');

  for (const { newId, oldId } of EMPWR_INVOICES) {
    // Get NEW invoice with studio and competition
    const { data: newInvoice, error: newErr } = await supabase
      .from('invoices')
      .select('*, studios(*), competitions(*)')
      .eq('id', newId)
      .single();

    // Get OLD invoice (for original total)
    const { data: oldInvoice, error: oldErr } = await supabase
      .from('invoices')
      .select('total')
      .eq('id', oldId)
      .single();

    if (newErr || oldErr || !newInvoice || !oldInvoice) {
      console.error(`Missing invoice: new=${newId}, old=${oldId}`, newErr, oldErr);
      continue;
    }

    // Get Production entry from line_items
    const lineItems = newInvoice.line_items as any[];
    const productionEntry = lineItems.find((item: any) => item.sizeCategory === 'Production');

    if (!productionEntry) {
      console.error(`No Production entry for ${newInvoice.studios?.name}`);
      continue;
    }

    const studioEmail = newInvoice.studios?.email;
    if (!studioEmail) {
      console.error(`No email for studio ${newInvoice.studios?.name}`);
      continue;
    }

    const emailData = {
      studioName: newInvoice.studios?.name || 'Unknown',
      competitionName: newInvoice.competitions?.name || 'Unknown',
      entryTitle: productionEntry.title,
      participants: productionEntry.participantCount,
      productionFee: parseFloat(productionEntry.entryFee),
      originalTotal: parseFloat(oldInvoice.total || '0'),
      amountPaid: parseFloat(newInvoice.amount_paid || '0'),
      correctedTotal: parseFloat(newInvoice.total || '0'),
      balanceDue: parseFloat(newInvoice.balance_remaining || '0'),
      subdomain: EMPWR_BRANDING.subdomain,
      studioId: newInvoice.studio_id,
      competitionId: newInvoice.competition_id,
      branding: EMPWR_BRANDING,
    };

    console.log(`\n${emailData.studioName}:`);
    console.log(`  Email: ${studioEmail}`);
    console.log(`  Production: ${emailData.participants}p × $55 = $${emailData.productionFee}`);
    console.log(`  Original Total: $${emailData.originalTotal}`);
    console.log(`  Amount Paid: $${emailData.amountPaid}`);
    console.log(`  Corrected Total: $${emailData.correctedTotal}`);
    console.log(`  Balance Due: $${emailData.balanceDue}`);

    const html = generateEmail(emailData);

    const result = await sendEmail({
      to: studioEmail,
      subject: `Invoice Correction - ${emailData.competitionName} - ${emailData.studioName}`,
      html,
      templateType: 'invoice-correction',
    });

    if (result.success) {
      console.log(`  ✓ Email sent!`);
    } else {
      console.error(`  ✗ Failed:`, result.error);
    }
  }

  console.log('\n=== Done ===');
}

sendEmpwrEmails().catch(console.error);
