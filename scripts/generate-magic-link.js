const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function generateMagicLink() {
  const email = 'danieljohnabrahamson@gmail.com';

  console.log(`\n=== GENERATING MAGIC LINK ===`);
  console.log(`Email: ${email}\n`);

  try {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: 'https://empwr.compsync.net/dashboard'
      }
    });

    if (error) {
      console.error('ERROR:', error.message);
      process.exit(1);
    }

    console.log('✅ Magic link generated!\n');
    console.log('Click this link to login (valid for 1 hour):');
    console.log(`\n${data.properties.action_link}\n`);
    console.log('Or copy-paste into your browser.\n');
  } catch (err) {
    console.error('FATAL ERROR:', err);
    process.exit(1);
  }
}

generateMagicLink();
