// Quick test to verify Resend API key works
// Run with: node test-resend-api.js

const RESEND_API_KEY = 're_iwv9H3gt_J2XPKvJt9Fq3DZQmq89sxb7T';

async function testResendAPI() {
  console.log('🧪 Testing Resend API Key...\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'danieljohnabrahamson@gmail.com',
        subject: 'Resend API Test',
        html: '<p>This is a test email from Resend API to verify the key works.</p>',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS! API key works.');
      console.log('📧 Email ID:', data.id);
      console.log('\nCheck your inbox: danieljohnabrahamson@gmail.com');
      console.log('Also check Resend logs: https://resend.com/emails\n');
    } else {
      console.log('❌ FAILED! API key issue.');
      console.log('Status:', response.status);
      console.log('Error:', data);
      console.log('\nPossible issues:');
      console.log('- API key revoked or regenerated');
      console.log('- API key missing Full Access permissions');
      console.log('- Resend account suspended\n');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

testResendAPI();
