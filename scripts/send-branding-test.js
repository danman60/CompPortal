/**
 * Send branded test emails using the compiled email function
 * Run with: node scripts/send-branding-test.js
 */

require('dotenv').config({ path: '.env.local' });
const Mailgun = require('mailgun.js');
const formData = require('form-data');

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
});

const RECIPIENT = 'danieljohnabrahamson@gmail.com';
const DOMAIN = 'compsync.net';

// Pre-rendered HTML templates with tenant branding
const empwrHtml = `
<!DOCTYPE html>
<html>
<head></head>
<body style="background-color: #0f172a; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif; padding: 20px 0;">
  <div style="background-color: #1e293b; margin: 0 auto; padding: 20px 0 48px; max-width: 600px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
    <h1 style="color: #f1f5f9; font-size: 32px; font-weight: bold; margin: 40px 0; padding: 0 40px; text-align: center;">Action Required: Summary Reopened</h1>

    <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0 40px; margin: 12px 0;">
      Hello <strong>Test Studio</strong>,
    </p>

    <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0 40px; margin: 12px 0;">
      Your entry summary for <strong>EMPWR 2026</strong> has been reopened by the Competition Director.
    </p>

    <div style="background-color: rgba(251, 191, 36, 0.1); border-radius: 12px; padding: 24px 30px; margin: 24px 40px; border-left: 4px solid #fbbf24;">
      <p style="color: #c4b5fd; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">REASON</p>
      <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0; margin: 0;">This is a test email to verify EMPWR tenant branding (pink gradient).</p>
    </div>

    <div style="background-color: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 24px 30px; margin: 24px 40px; border-left: 4px solid #FF1493;">
      <p style="color: #c4b5fd; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;">WHAT THIS MEANS</p>
      <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0; margin: 0 0 8px 0;">• Your previous submission has been reset</p>
      <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0; margin: 0 0 8px 0;">• You can now make changes to your entries</p>
      <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0; margin: 0;">• Please review and resubmit when ready</p>
    </div>

    <div style="text-align: center; padding: 30px 40px;">
      <a href="https://empwr.compsync.net/dashboard/entries" style="background: linear-gradient(90deg, #FF1493, #FF69B4); border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 14px 48px; border: none;">
        Go to Dashboard
      </a>
    </div>

    <hr style="border-color: rgba(255, 255, 255, 0.1); margin: 32px 40px;">

    <p style="color: #94a3b8; font-size: 14px; line-height: 24px; padding: 0 40px; text-align: center;">
      If you have any questions about what changes need to be made, please contact the Competition Director.
    </p>
  </div>
</body>
</html>
`;

const glowHtml = `
<!DOCTYPE html>
<html>
<head></head>
<body style="background-color: #0f172a; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif; padding: 20px 0;">
  <div style="background-color: #1e293b; margin: 0 auto; padding: 20px 0 48px; max-width: 600px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
    <h1 style="color: #f1f5f9; font-size: 32px; font-weight: bold; margin: 40px 0; padding: 0 40px; text-align: center;">Action Required: Summary Reopened</h1>

    <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0 40px; margin: 12px 0;">
      Hello <strong>Test Studio</strong>,
    </p>

    <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0 40px; margin: 12px 0;">
      Your entry summary for <strong>Glow 2026</strong> has been reopened by the Competition Director.
    </p>

    <div style="background-color: rgba(251, 191, 36, 0.1); border-radius: 12px; padding: 24px 30px; margin: 24px 40px; border-left: 4px solid #fbbf24;">
      <p style="color: #c4b5fd; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">REASON</p>
      <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0; margin: 0;">This is a test email to verify GLOW tenant branding (pink to gold gradient).</p>
    </div>

    <div style="background-color: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 24px 30px; margin: 24px 40px; border-left: 4px solid #FF1493;">
      <p style="color: #c4b5fd; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;">WHAT THIS MEANS</p>
      <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0; margin: 0 0 8px 0;">• Your previous submission has been reset</p>
      <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0; margin: 0 0 8px 0;">• You can now make changes to your entries</p>
      <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0; margin: 0;">• Please review and resubmit when ready</p>
    </div>

    <div style="text-align: center; padding: 30px 40px;">
      <a href="https://glow.compsync.net/dashboard/entries" style="background: linear-gradient(90deg, #FF1493, #FFD700); border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 14px 48px; border: none;">
        Go to Dashboard
      </a>
    </div>

    <hr style="border-color: rgba(255, 255, 255, 0.1); margin: 32px 40px;">

    <p style="color: #94a3b8; font-size: 14px; line-height: 24px; padding: 0 40px; text-align: center;">
      If you have any questions about what changes need to be made, please contact the Competition Director.
    </p>
  </div>
</body>
</html>
`;

async function sendTestEmails() {
  console.log('Sending branded test emails...\n');

  // EMPWR
  console.log('Sending EMPWR branded email...');
  try {
    await mg.messages.create(DOMAIN, {
      from: 'CompSync <noreply@compsync.net>',
      to: RECIPIENT,
      subject: '[BRANDING TEST] EMPWR - Summary Reopened (Pink Gradient)',
      html: empwrHtml,
    });
    console.log('  ✓ EMPWR email sent\n');
  } catch (err) {
    console.error('  ✗ EMPWR failed:', err.message);
  }

  // Glow
  console.log('Sending Glow branded email...');
  try {
    await mg.messages.create(DOMAIN, {
      from: 'CompSync <noreply@compsync.net>',
      to: RECIPIENT,
      subject: '[BRANDING TEST] Glow - Summary Reopened (Pink to Gold Gradient)',
      html: glowHtml,
    });
    console.log('  ✓ Glow email sent\n');
  } catch (err) {
    console.error('  ✗ Glow failed:', err.message);
  }

  console.log('Done! Check danieljohnabrahamson@gmail.com for 2 emails.');
}

sendTestEmails().catch(console.error);
