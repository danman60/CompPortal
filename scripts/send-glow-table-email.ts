/**
 * Send Glow Invoice Summary TABLE FORMAT to danieljohnabrahamson@gmail.com
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
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0 0; }
    .content { padding: 24px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 11px; }
    th { background: #f3f4f6; padding: 8px 4px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
    td { padding: 8px 4px; border-bottom: 1px solid #e5e7eb; color: #4b5563; }
    tr:hover { background: #f9fafb; }
    .money { text-align: right; font-family: monospace; white-space: nowrap; }
    .paid { color: #10b981; font-weight: 600; }
    .owed { color: #ef4444; font-weight: 700; }
    .credit { color: #8b5cf6; }
    .hold { background: #fef3c7; }
    .hold td { color: #92400e; }
    .total-row { font-weight: 700; background: #f3f4f6; }
    .footer { background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>GLOW Invoice Correction Summary</h1>
      <p>Production $0 Fee Incident - December 23, 2025</p>
    </div>

    <div class="content">
      <table>
        <thead>
          <tr>
            <th>Studio</th>
            <th>Competition</th>
            <th>Issue</th>
            <th>Production Entry</th>
            <th class="money">Old Total</th>
            <th class="money">New Total</th>
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
            <td>Prod $0 + Title</td>
            <td>COME ON DOWN (41p)</td>
            <td class="money">$11,298.31</td>
            <td class="money">$13,622.15</td>
            <td class="money credit">-$1,345.00</td>
            <td class="money credit">-$50.00</td>
            <td class="money">$5,500.00</td>
            <td class="money paid">$5,798.31</td>
            <td class="money owed">$2,323.84</td>
          </tr>
          <tr>
            <td>Dancecore</td>
            <td>St. Catharines</td>
            <td>Prod $0</td>
            <td>Conga (36p)</td>
            <td class="money">$13,254.90</td>
            <td class="money">$15,492.30</td>
            <td class="money">-</td>
            <td class="money">-</td>
            <td class="money">$500.00</td>
            <td class="money paid">$12,754.90</td>
            <td class="money owed">$2,237.40</td>
          </tr>
          <tr>
            <td>Fever</td>
            <td>Blue Mountain</td>
            <td>Prod $0</td>
            <td>Murder Mystery (74p)</td>
            <td class="money">$33,827.12</td>
            <td class="money">$37,081.52</td>
            <td class="money credit">-$3,754.50</td>
            <td class="money credit">-$975.00</td>
            <td class="money">$500.00</td>
            <td class="money paid">$33,327.11</td>
            <td class="money owed">$3,254.41</td>
          </tr>
          <tr>
            <td>Danceology</td>
            <td>Blue Mountain</td>
            <td>Prod $0 (4 entries)</td>
            <td>She's in love, Bey, etc (90p)</td>
            <td class="money">$13,504.63</td>
            <td class="money">$18,538.78</td>
            <td class="money credit">-$1,909.00</td>
            <td class="money credit">-$775.00</td>
            <td class="money">$500.00</td>
            <td class="money">$0.00</td>
            <td class="money owed">$18,038.78</td>
          </tr>
          <tr>
            <td>Danceology</td>
            <td>Toronto</td>
            <td>Prod $0 (2 entries)</td>
            <td>Bey, Mark's hip hop (59p)</td>
            <td class="money">$12,692.16</td>
            <td class="money">$15,992.33</td>
            <td class="money credit">-$1,572.50</td>
            <td class="money">-</td>
            <td class="money">$500.00</td>
            <td class="money">$0.00</td>
            <td class="money owed">$15,492.33</td>
          </tr>
          <tr>
            <td>Kingston</td>
            <td>Blue Mtn Summer</td>
            <td>Title $115-&gt;$145</td>
            <td>11 Title entries ($30 diff)</td>
            <td class="money">$12,091.00</td>
            <td class="money">$12,426.61</td>
            <td class="money credit">-$1,233.00</td>
            <td class="money credit">-$100.00</td>
            <td class="money">$8,500.00</td>
            <td class="money">$0.00</td>
            <td class="money owed">$3,926.61</td>
          </tr>
          <tr>
            <td>Taylor's</td>
            <td>St. Catharines</td>
            <td>Prod $0</td>
            <td>Welcome to Bikini Bottom (20p)</td>
            <td class="money">$8,430.93</td>
            <td class="money">$9,549.63</td>
            <td class="money credit">-$939.00</td>
            <td class="money">-</td>
            <td class="money">$8,290.00</td>
            <td class="money">$0.00</td>
            <td class="money owed">$1,259.63</td>
          </tr>
          <tr class="total-row">
            <td colspan="10">TOTAL (7 studios, 8 invoices)</td>
            <td class="money owed">$46,533.00</td>
          </tr>
          <tr class="hold">
            <td>Dancepirations</td>
            <td>Blue Mountain</td>
            <td colspan="7">HOLD - Suspicious $16,250.32 deposit needs CD clarification</td>
            <td class="money paid">$9,000.00</td>
            <td class="money">-$4,189.59</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:24px; padding:16px; background:#dbeafe; border-radius:8px;">
        <strong style="color:#1e40af;">Notes:</strong>
        <ul style="color:#1e3a8a; margin:8px 0 0 0; padding-left:20px; font-size:13px;">
          <li>Cassiahs, Dancecore, Fever have prior payments - they only owe the difference</li>
          <li>Danceology (both), Kingston, Taylor's have no prior payment - they owe full balance</li>
          <li>Kingston is Title fee issue ($115->$145), not Production $0</li>
          <li>Dancepirations ON HOLD pending deposit clarification</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <p>Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST</p>
    </div>
  </div>
</body>
</html>
`;

async function send() {
  console.log('Sending Glow TABLE summary email...');

  const result = await sendEmail({
    to: 'danieljohnabrahamson@gmail.com',
    subject: 'GLOW Invoice Correction Summary (TABLE) - December 23, 2025',
    html,
    templateType: 'admin-summary',
  });

  if (result.success) {
    console.log('✓ Table summary email sent!');
  } else {
    console.error('✗ Failed:', result.error);
  }
}

send().catch(console.error);
