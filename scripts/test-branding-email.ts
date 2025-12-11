/**
 * Test script to send branded emails for each tenant
 * Run with: npx tsx scripts/test-branding-email.ts
 */

import 'react';
import { renderSummaryReopened } from '../src/lib/email-templates';
import { sendEmail } from '../src/lib/email';

const RECIPIENT = 'danieljohnabrahamson@gmail.com';

const tenants = [
  {
    name: 'EMPWR Dance Experience',
    branding: {
      primaryColor: '#FF1493',
      secondaryColor: '#FF69B4',
    },
    competitionName: 'EMPWR 2026',
    competitionYear: 2026,
  },
  {
    name: 'Glow Dance Competition',
    branding: {
      primaryColor: '#FF1493',
      secondaryColor: '#FFD700',
    },
    competitionName: 'Glow 2026',
    competitionYear: 2026,
  },
];

async function sendTestEmails() {
  console.log('Sending test branding emails...\n');

  for (const tenant of tenants) {
    console.log(`Sending ${tenant.name} branded email...`);

    const html = await renderSummaryReopened({
      studioName: 'Test Studio',
      competitionName: tenant.competitionName,
      competitionYear: tenant.competitionYear,
      reason: 'This is a test email to verify tenant branding colors are working correctly.',
      portalUrl: 'https://example.com/dashboard/entries',
      tenantBranding: tenant.branding,
    });

    await sendEmail({
      to: RECIPIENT,
      subject: `[BRANDING TEST] ${tenant.name} - Summary Reopened`,
      html,
      templateType: 'summary-reopened',
    });

    console.log(`  ✓ Sent to ${RECIPIENT}\n`);
  }

  console.log('Done! Check your inbox for 2 emails.');
}

sendTestEmails().catch(console.error);
