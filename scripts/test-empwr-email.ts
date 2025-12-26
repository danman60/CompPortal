/**
 * Test EMPWR email to danieljohnabrahamson@gmail.com
 * Run with: npx tsx scripts/test-empwr-email.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.production.local' });

import { sendEmail } from '../src/lib/email';

const EMPWR_BRANDING = {
  primaryColor: '#FF1493',
  name: 'EMPWR Dance Experience',
};

const studio = {
  name: 'Academy of Dance Arts',
  competition: 'EMPWR Dance - St. Catharines #1',
  entryTitle: 'Little Mermaid',
  participants: 24,
  productionFee: 1320.00,
  correctedTotal: 12098.91,
  amountPaid: 10256.47,
  balanceDue: 1342.44,
  subdomain: 'empwr',
  studioId: '9f96460e-904c-4d12-8f50-aaeae27367df',
  competitionId: '05c0eae4-cb2f-44cc-9c5e-6b2eed700904',
};

const html = `
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
            <td style="background: linear-gradient(135deg, ${EMPWR_BRANDING.primaryColor} 0%, #9333ea 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">${EMPWR_BRANDING.name}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Invoice Correction Notice</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${studio.name}</strong>,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                As mentioned in our recent communication, we discovered a billing error that affected your invoice for <strong>${studio.competition}</strong>. This email contains your corrected invoice details and updated balance.
              </p>
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
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://${studio.subdomain}.compsync.net/dashboard/invoices/${studio.studioId}/${studio.competitionId}" style="display: inline-block; background: linear-gradient(135deg, ${EMPWR_BRANDING.primaryColor} 0%, #9333ea 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Updated Invoice</a>
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
                <strong>The ${EMPWR_BRANDING.name} Team</strong>
              </p>
            </td>
          </tr>
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
</html>`;

async function test() {
  console.log('Sending TEST email to danieljohnabrahamson@gmail.com...');
  console.log('Studio: Academy of Dance Arts');
  console.log('Balance Due: $1,342.44');

  const result = await sendEmail({
    to: 'danieljohnabrahamson@gmail.com',
    subject: '[TEST] Invoice Correction - EMPWR Dance - St. Catharines #1 - Academy of Dance Arts',
    html,
    templateType: 'invoice-correction',
  });

  if (result.success) {
    console.log('✓ Test email sent!');
  } else {
    console.error('✗ Failed:', result.error);
  }
}

test().catch(console.error);
