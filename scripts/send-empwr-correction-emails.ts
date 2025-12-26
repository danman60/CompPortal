/**
 * Send EMPWR invoice correction emails
 * Run with: npx tsx scripts/send-empwr-correction-emails.ts
 *
 * Uses same pattern as test-invoice-correction-email.ts (hardcoded data, sendEmail directly)
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.production.local' });

import { sendEmail } from '../src/lib/email';

const EMPWR_BRANDING = {
  primaryColor: '#FF1493',
  name: 'EMPWR Dance Experience',
};

// All data verified from database queries
const EMPWR_STUDIOS = [
  {
    name: 'Academy of Dance Arts',
    email: 'aodbrantford@gmail.com',
    competition: 'EMPWR Dance - St. Catharines #1',
    entryTitle: 'Little Mermaid',
    participants: 24,
    productionFee: 1320.00,  // 24 × $55
    correctedTotal: 12098.91,
    amountPaid: 10256.47,
    balanceDue: 1342.44,
    subdomain: 'empwr',
    studioId: '9f96460e-904c-4d12-8f50-aaeae27367df',
    competitionId: '05c0eae4-cb2f-44cc-9c5e-6b2eed700904',
  },
  {
    name: 'Cassiahs Dance Company',
    email: 'cassiahsdancecompany@gmail.com',
    competition: 'EMPWR Dance - St. Catharines #1',
    entryTitle: 'COME ON DOWN...',
    participants: 42,
    productionFee: 2310.00,  // 42 × $55
    correctedTotal: 7770.45,
    amountPaid: 4921.18,
    balanceDue: 2349.27,
    subdomain: 'empwr',
    studioId: 'f2408542-d84d-46c7-a129-2649d7b288a6',
    competitionId: '05c0eae4-cb2f-44cc-9c5e-6b2eed700904',
  },
  {
    name: 'Elite Star',
    email: 'elitestardanceacademy@gmail.com',
    competition: 'EMPWR Dance - St. Catharines #1',
    entryTitle: 'Neverland',
    participants: 30,
    productionFee: 1650.00,  // 30 × $55
    correctedTotal: 9839.48,
    amountPaid: 7661.43,
    balanceDue: 1678.05,
    subdomain: 'empwr',
    studioId: '87974d9a-729d-4a8d-8e57-bdd35a804b3e',
    competitionId: '05c0eae4-cb2f-44cc-9c5e-6b2eed700904',
  },
  {
    name: 'Fever',
    email: 'info@thedancefever.com',
    competition: 'EMPWR Dance - St. Catharines #2',
    entryTitle: 'Murder Mystery',
    participants: 74,
    productionFee: 4070.00,  // 74 × $55
    correctedTotal: 38076.48,
    amountPaid: 34652.61,
    balanceDue: 2923.87,
    subdomain: 'empwr',
    studioId: '758d101c-26fa-4b22-8d9b-894541b7bd2b',
    competitionId: 'e5a6ee60-e440-4a3e-bc60-43eb40c46b30',
  },
];

function generateEmail(studio: typeof EMPWR_STUDIOS[0]): string {
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

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${EMPWR_BRANDING.primaryColor} 0%, #9333ea 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">${EMPWR_BRANDING.name}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Invoice Correction Notice</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${studio.name}</strong>,
              </p>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                As mentioned in our recent communication, we discovered a billing error that affected your invoice for <strong>${studio.competition}</strong>. This email contains your corrected invoice details and updated balance.
              </p>

              <!-- Error Box -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">What happened:</p>
                <p style="color: #78350f; font-size: 14px; margin: 8px 0 0 0;">
                  Due to a system configuration error, your <strong>Production</strong> entry was incorrectly billed at <strong>$0</strong> instead of the correct fee of <strong>$55 per participant</strong>.
                </p>
                <p style="color: #78350f; font-size: 14px; margin: 8px 0 0 0;">
                  You can verify this by reviewing your previous invoice, where the Production entry "${studio.entryTitle}" shows a $0 fee.
                </p>
              </div>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your updated invoice now includes the correct Production fee: <strong>${studio.participants} participants × $55 = $${studio.productionFee.toFixed(2)}</strong>
              </p>

              <!-- Invoice Summary -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #111827; font-size: 16px; margin: 0 0 16px 0; font-weight: 600;">Updated Invoice Summary</h3>

                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                  <tr>
                    <td style="color: #6b7280; padding: 8px 0;">Corrected Invoice Total:</td>
                    <td style="color: #374151; text-align: right; padding: 8px 0;">$${studio.correctedTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; padding: 8px 0;">Amount Already Paid:</td>
                    <td style="color: #10b981; text-align: right; padding: 8px 0; font-weight: 600;">-$${studio.amountPaid.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 8px;"></td>
                  </tr>
                  <tr>
                    <td style="color: #111827; padding: 8px 0; font-weight: 700; font-size: 16px;">Balance Due:</td>
                    <td style="color: ${EMPWR_BRANDING.primaryColor}; text-align: right; padding: 8px 0; font-weight: 700; font-size: 18px;">$${studio.balanceDue.toFixed(2)}</td>
                  </tr>
                </table>
              </div>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                A corrected invoice has been generated and is available in your studio portal. Your previous payment has been credited, so only the balance shown above is due.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://${studio.subdomain}.compsync.net/dashboard/invoices/${studio.studioId}/${studio.competitionId}" style="display: inline-block; background: linear-gradient(135deg, ${EMPWR_BRANDING.primaryColor} 0%, #9333ea 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Updated Invoice</a>
              </div>

              <!-- Extension Notice -->
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
                <strong>The ${EMPWR_BRANDING.name} Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This email was sent regarding your ${studio.competition} registration.<br/>
                If you believe this was sent in error, please contact us.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

async function sendEmpwrEmails() {
  console.log('=== EMPWR Invoice Correction Emails ===\n');
  console.log('Studios to email:', EMPWR_STUDIOS.length);
  console.log('');

  for (const studio of EMPWR_STUDIOS) {
    console.log(`\n${studio.name}:`);
    console.log(`  Email: ${studio.email}`);
    console.log(`  Production: ${studio.participants}p × $55 = $${studio.productionFee}`);
    console.log(`  Total: $${studio.correctedTotal} | Paid: $${studio.amountPaid} | Due: $${studio.balanceDue}`);

    const html = generateEmail(studio);

    const result = await sendEmail({
      to: studio.email,
      subject: `Invoice Correction - ${studio.competition} - ${studio.name}`,
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
