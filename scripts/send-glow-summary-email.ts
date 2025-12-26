/**
 * Send Glow Invoice Summary to danieljohnabrahamson@gmail.com
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.production.local' });

import { sendEmail } from '../src/lib/email';

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
    .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0 0; }
    .content { padding: 24px; }
    h2 { color: #111827; border-bottom: 2px solid #10b981; padding-bottom: 8px; margin-top: 32px; }
    h2:first-child { margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
    th { background: #f3f4f6; padding: 10px 6px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px 6px; border-bottom: 1px solid #e5e7eb; color: #4b5563; vertical-align: top; }
    tr:hover { background: #f9fafb; }
    .money { text-align: right; font-family: monospace; white-space: nowrap; }
    .paid { color: #10b981; font-weight: 600; }
    .owed { color: #ef4444; font-weight: 600; }
    .credit { color: #8b5cf6; }
    .hold { background: #fef3c7; }
    .hold td { color: #92400e; }
    .category { background: #dbeafe; padding: 12px 16px; border-radius: 8px; margin: 16px 0; }
    .category h3 { margin: 0 0 8px 0; color: #1e40af; font-size: 14px; }
    .category p { margin: 0; color: #1e3a8a; font-size: 13px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .warning strong { color: #92400e; }
    .warning p { margin: 4px 0 0 0; color: #78350f; font-size: 13px; }
    .footer { background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
    .credits-cell { font-size: 11px; }
    .credits-cell div { margin: 2px 0; }
    .studio-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .studio-card h3 { margin: 0 0 12px 0; color: #111827; font-size: 16px; }
    .studio-card .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .studio-card .field { }
    .studio-card .label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
    .studio-card .value { font-size: 14px; color: #111827; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>GLOW Invoice Correction Summary</h1>
      <p>Production $0 Fee Incident - December 23, 2025</p>
    </div>

    <div class="content">
      <h2>Complete Invoice Details with Credits/Discounts</h2>

      <!-- CASSIAHS -->
      <div class="studio-card">
        <h3>1. Cassiahs Dance Company - GLOW Blue Mountain Spring 2026</h3>
        <div class="grid">
          <div class="field"><div class="label">Email</div><div class="value">cassiahsdancecompany@gmail.com</div></div>
          <div class="field"><div class="label">Issue</div><div class="value">Production $0 + Title $115</div></div>
          <div class="field"><div class="label">Production Entry</div><div class="value">COME ON DOWN... (41 participants × $55 = $2,255)</div></div>
          <div class="field"><div class="label">Old Invoice Total</div><div class="value">$11,298.31</div></div>
          <div class="field"><div class="label">New Invoice Total</div><div class="value">$13,622.15</div></div>
          <div class="field"><div class="label">Amount Already Paid</div><div class="value" style="color:#10b981">$5,798.31</div></div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Credits Applied (preserved from old invoice)</div>
          <div style="margin-top:4px;">
            <span style="background:#ddd6fe; color:#5b21b6; padding:2px 8px; border-radius:4px; font-size:12px; margin-right:8px;">10% Discount: -$1,345.00</span>
            <span style="background:#ddd6fe; color:#5b21b6; padding:2px 8px; border-radius:4px; font-size:12px;">GLOW DOLLARS: -$50.00</span>
          </div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Deposit</div><div class="value">$5,500.00</div>
        </div>
        <div style="margin-top:12px; background:#fef2f2; padding:12px; border-radius:6px;">
          <div style="font-size:11px; color:#991b1b;">BALANCE DUE</div>
          <div style="font-size:24px; color:#dc2626; font-weight:700;">$2,323.84</div>
        </div>
      </div>

      <!-- DANCECORE -->
      <div class="studio-card">
        <h3>2. Dancecore - GLOW St. Catharines Spring 2026</h3>
        <div class="grid">
          <div class="field"><div class="label">Email</div><div class="value">info@dancecoreinc.com</div></div>
          <div class="field"><div class="label">Issue</div><div class="value">Production $0</div></div>
          <div class="field"><div class="label">Production Entry</div><div class="value">Conga (36 participants × $55 = $1,980)</div></div>
          <div class="field"><div class="label">Old Invoice Total</div><div class="value">$13,254.90</div></div>
          <div class="field"><div class="label">New Invoice Total</div><div class="value">$15,492.30</div></div>
          <div class="field"><div class="label">Amount Already Paid</div><div class="value" style="color:#10b981">$12,754.90</div></div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Credits Applied</div>
          <div style="margin-top:4px; color:#6b7280; font-style:italic;">None</div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Deposit</div><div class="value">$500.00</div>
        </div>
        <div style="margin-top:12px; background:#fef2f2; padding:12px; border-radius:6px;">
          <div style="font-size:11px; color:#991b1b;">BALANCE DUE</div>
          <div style="font-size:24px; color:#dc2626; font-weight:700;">$2,237.40</div>
        </div>
      </div>

      <!-- FEVER -->
      <div class="studio-card">
        <h3>3. Fever - GLOW Blue Mountain Spring 2026</h3>
        <div class="grid">
          <div class="field"><div class="label">Email</div><div class="value">info@thedancefever.com</div></div>
          <div class="field"><div class="label">Issue</div><div class="value">Production $0</div></div>
          <div class="field"><div class="label">Production Entry</div><div class="value">Murder Mystery (74 participants × $55 = $4,070)</div></div>
          <div class="field"><div class="label">Old Invoice Total</div><div class="value">$33,827.12</div></div>
          <div class="field"><div class="label">New Invoice Total</div><div class="value">$37,081.52</div></div>
          <div class="field"><div class="label">Amount Already Paid</div><div class="value" style="color:#10b981">$33,327.11</div></div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Credits Applied (preserved from old invoice)</div>
          <div style="margin-top:4px;">
            <span style="background:#ddd6fe; color:#5b21b6; padding:2px 8px; border-radius:4px; font-size:12px; margin-right:8px;">10% Discount: -$3,754.50</span>
            <span style="background:#ddd6fe; color:#5b21b6; padding:2px 8px; border-radius:4px; font-size:12px;">Glow Dollars + Injury Credit: -$975.00</span>
          </div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Deposit</div><div class="value">$500.00</div>
        </div>
        <div style="margin-top:12px; background:#fef2f2; padding:12px; border-radius:6px;">
          <div style="font-size:11px; color:#991b1b;">BALANCE DUE</div>
          <div style="font-size:24px; color:#dc2626; font-weight:700;">$3,254.41</div>
        </div>
      </div>

      <!-- DANCEOLOGY BLUE MOUNTAIN -->
      <div class="studio-card">
        <h3>4. Danceology - GLOW Blue Mountain Spring 2026</h3>
        <div class="grid">
          <div class="field"><div class="label">Email</div><div class="value">dmkdanceology@gmail.com</div></div>
          <div class="field"><div class="label">Issue</div><div class="value">Production $0 (4 entries)</div></div>
          <div class="field"><div class="label">Production Entries</div><div class="value">She's in love (24p), Bey (26p), Shake your groove thing (20p), Mini 2 hip hop (20p) = 90 total × $55 = $4,950</div></div>
          <div class="field"><div class="label">Old Invoice Total</div><div class="value">$13,504.63</div></div>
          <div class="field"><div class="label">New Invoice Total</div><div class="value">$18,538.78</div></div>
          <div class="field"><div class="label">Amount Already Paid</div><div class="value" style="color:#6b7280">$0.00 (unpaid)</div></div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Credits Applied (preserved from old invoice)</div>
          <div style="margin-top:4px;">
            <span style="background:#ddd6fe; color:#5b21b6; padding:2px 8px; border-radius:4px; font-size:12px; margin-right:8px;">10% Discount: -$1,909.00</span>
            <span style="background:#ddd6fe; color:#5b21b6; padding:2px 8px; border-radius:4px; font-size:12px;">Credit adjustment: -$775.00</span>
          </div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Deposit</div><div class="value">$500.00</div>
        </div>
        <div style="margin-top:12px; background:#fef2f2; padding:12px; border-radius:6px;">
          <div style="font-size:11px; color:#991b1b;">BALANCE DUE (Full invoice - no prior payment)</div>
          <div style="font-size:24px; color:#dc2626; font-weight:700;">$18,038.78</div>
        </div>
      </div>

      <!-- DANCEOLOGY TORONTO -->
      <div class="studio-card">
        <h3>5. Danceology - GLOW Toronto 2026</h3>
        <div class="grid">
          <div class="field"><div class="label">Email</div><div class="value">dmkdanceology@gmail.com</div></div>
          <div class="field"><div class="label">Issue</div><div class="value">Production $0 (2 entries)</div></div>
          <div class="field"><div class="label">Production Entries</div><div class="value">Bey (26p), Mark's hip hop (33p) = 59 total × $55 = $3,245</div></div>
          <div class="field"><div class="label">Old Invoice Total</div><div class="value">$12,692.16</div></div>
          <div class="field"><div class="label">New Invoice Total</div><div class="value">$15,992.33</div></div>
          <div class="field"><div class="label">Amount Already Paid</div><div class="value" style="color:#6b7280">$0.00 (unpaid)</div></div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Credits Applied (preserved from old invoice)</div>
          <div style="margin-top:4px;">
            <span style="background:#ddd6fe; color:#5b21b6; padding:2px 8px; border-radius:4px; font-size:12px;">10% Discount: -$1,572.50</span>
          </div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Deposit</div><div class="value">$500.00</div>
        </div>
        <div style="margin-top:12px; background:#fef2f2; padding:12px; border-radius:6px;">
          <div style="font-size:11px; color:#991b1b;">BALANCE DUE (Full invoice - no prior payment)</div>
          <div style="font-size:24px; color:#dc2626; font-weight:700;">$15,492.33</div>
        </div>
      </div>

      <!-- KINGSTON -->
      <div class="studio-card">
        <h3>6. Kingston Dance Force - GLOW Blue Mountain Summer 2026</h3>
        <div class="grid">
          <div class="field"><div class="label">Email</div><div class="value">kdfcomp@danceforce.ca</div></div>
          <div class="field"><div class="label">Issue</div><div class="value">Title $115 → $145 (11 entries × $30 = $330)</div></div>
          <div class="field"><div class="label">Title Entries</div><div class="value">11 Title upgrades @ $145 each (was $115)</div></div>
          <div class="field"><div class="label">Old Invoice Total</div><div class="value">$12,091.00</div></div>
          <div class="field"><div class="label">New Invoice Total</div><div class="value">$12,426.61</div></div>
          <div class="field"><div class="label">Amount Already Paid</div><div class="value" style="color:#6b7280">$0.00 (unpaid)</div></div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Credits Applied (preserved from old invoice)</div>
          <div style="margin-top:4px;">
            <span style="background:#ddd6fe; color:#5b21b6; padding:2px 8px; border-radius:4px; font-size:12px; margin-right:8px;">10% Discount: -$1,233.00</span>
            <span style="background:#ddd6fe; color:#5b21b6; padding:2px 8px; border-radius:4px; font-size:12px;">Glow$: -$100.00</span>
          </div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Deposit</div><div class="value">$8,500.00</div>
        </div>
        <div style="margin-top:12px; background:#fef2f2; padding:12px; border-radius:6px;">
          <div style="font-size:11px; color:#991b1b;">BALANCE DUE (Full invoice - no prior payment)</div>
          <div style="font-size:24px; color:#dc2626; font-weight:700;">$3,926.61</div>
        </div>
      </div>

      <!-- TAYLOR'S -->
      <div class="studio-card">
        <h3>7. Taylor's Dance Academy - GLOW St. Catharines Spring 2026</h3>
        <div class="grid">
          <div class="field"><div class="label">Email</div><div class="value">tdataylorsdanceacademy@gmail.com</div></div>
          <div class="field"><div class="label">Issue</div><div class="value">Production $0</div></div>
          <div class="field"><div class="label">Production Entry</div><div class="value">Welcome to Bikini Bottom (20 participants × $55 = $1,100)</div></div>
          <div class="field"><div class="label">Old Invoice Total</div><div class="value">$8,430.93</div></div>
          <div class="field"><div class="label">New Invoice Total</div><div class="value">$9,549.63</div></div>
          <div class="field"><div class="label">Amount Already Paid</div><div class="value" style="color:#6b7280">$0.00 (unpaid)</div></div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Credits Applied (preserved from old invoice)</div>
          <div style="margin-top:4px;">
            <span style="background:#ddd6fe; color:#5b21b6; padding:2px 8px; border-radius:4px; font-size:12px;">10% Discount: -$939.00</span>
          </div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;">
          <div class="label">Deposit</div><div class="value">$8,290.00</div>
        </div>
        <div style="margin-top:12px; background:#fef2f2; padding:12px; border-radius:6px;">
          <div style="font-size:11px; color:#991b1b;">BALANCE DUE (Full invoice - no prior payment)</div>
          <div style="font-size:24px; color:#dc2626; font-weight:700;">$1,259.63</div>
        </div>
      </div>

      <!-- DANCEPIRATIONS HOLD -->
      <div class="studio-card" style="background:#fef3c7; border-color:#f59e0b;">
        <h3 style="color:#92400e;">⚠️ HOLD: Dancepirations - GLOW Blue Mountain Spring 2026</h3>
        <div class="grid">
          <div class="field"><div class="label">Email</div><div class="value">dancepirationsacademy@gmail.com</div></div>
          <div class="field"><div class="label">Issue</div><div class="value">Suspicious deposit - needs CD clarification</div></div>
          <div class="field"><div class="label">New Invoice Total</div><div class="value">$21,060.73</div></div>
          <div class="field"><div class="label">Amount Paid</div><div class="value">$9,000.00</div></div>
          <div class="field"><div class="label">Suspicious Deposit</div><div class="value" style="color:#dc2626; font-weight:700;">$16,250.32</div></div>
          <div class="field"><div class="label">Balance</div><div class="value" style="color:#10b981; font-weight:700;">-$4,189.59 (CREDIT/OVERPAID)</div></div>
        </div>
        <div style="margin-top:12px; padding:12px; background:#fde68a; border-radius:6px;">
          <strong>DO NOT EMAIL</strong> - Deposit amount seems incorrect. Clarify with CD before proceeding.
        </div>
      </div>

      <h2>Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Studio</th>
            <th>Competition</th>
            <th class="money">% Discount</th>
            <th class="money">Other Credits</th>
            <th class="money">Deposit</th>
            <th class="money">Prior Paid</th>
            <th class="money">Balance Due</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cassiahs</td>
            <td>Blue Mountain</td>
            <td class="money credit">-$1,345.00</td>
            <td class="money credit">-$50.00</td>
            <td class="money">$5,500.00</td>
            <td class="money paid">$5,798.31</td>
            <td class="money owed">$2,323.84</td>
          </tr>
          <tr>
            <td>Dancecore</td>
            <td>St. Catharines</td>
            <td class="money">-</td>
            <td class="money">-</td>
            <td class="money">$500.00</td>
            <td class="money paid">$12,754.90</td>
            <td class="money owed">$2,237.40</td>
          </tr>
          <tr>
            <td>Fever</td>
            <td>Blue Mountain</td>
            <td class="money credit">-$3,754.50</td>
            <td class="money credit">-$975.00</td>
            <td class="money">$500.00</td>
            <td class="money paid">$33,327.11</td>
            <td class="money owed">$3,254.41</td>
          </tr>
          <tr>
            <td>Danceology</td>
            <td>Blue Mountain</td>
            <td class="money credit">-$1,909.00</td>
            <td class="money credit">-$775.00</td>
            <td class="money">$500.00</td>
            <td class="money">$0.00</td>
            <td class="money owed">$18,038.78</td>
          </tr>
          <tr>
            <td>Danceology</td>
            <td>Toronto</td>
            <td class="money credit">-$1,572.50</td>
            <td class="money">-</td>
            <td class="money">$500.00</td>
            <td class="money">$0.00</td>
            <td class="money owed">$15,492.33</td>
          </tr>
          <tr>
            <td>Kingston</td>
            <td>Blue Mtn Summer</td>
            <td class="money credit">-$1,233.00</td>
            <td class="money credit">-$100.00</td>
            <td class="money">$8,500.00</td>
            <td class="money">$0.00</td>
            <td class="money owed">$3,926.61</td>
          </tr>
          <tr>
            <td>Taylor's</td>
            <td>St. Catharines</td>
            <td class="money credit">-$939.00</td>
            <td class="money">-</td>
            <td class="money">$8,290.00</td>
            <td class="money">$0.00</td>
            <td class="money owed">$1,259.63</td>
          </tr>
          <tr style="font-weight:700; background:#f3f4f6;">
            <td colspan="6">TOTAL (7 studios, 8 invoices)</td>
            <td class="money owed">$46,533.00</td>
          </tr>
          <tr class="hold">
            <td>⚠️ Dancepirations</td>
            <td>Blue Mountain</td>
            <td colspan="4">HOLD - Suspicious deposit</td>
            <td class="money">-$4,189.59</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST</p>
    </div>
  </div>
</body>
</html>
`;

async function send() {
  console.log('Sending updated Glow summary email...');

  const result = await sendEmail({
    to: 'danieljohnabrahamson@gmail.com',
    subject: 'GLOW Invoice Correction Summary (with Credits) - December 23, 2025',
    html,
    templateType: 'admin-summary',
  });

  if (result.success) {
    console.log('✓ Summary email sent!');
  } else {
    console.error('✗ Failed:', result.error);
  }
}

send().catch(console.error);
