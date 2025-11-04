const fetch = require('node-fetch');

async function checkEnvironment() {
  try {
    console.log('🔍 Checking Railway environment...');
    
    const response = await fetch('https://www.hellversechat.com/api/debug-env');
    const data = await response.json();
    
    console.log('🌍 Railway Environment:', JSON.stringify(data, null, 2));
    
    if (!data.hasEmailUser || !data.hasEmailPass) {
      console.log('❌ Email credentials not configured on Railway');
      console.log('ℹ️  This explains the 500 error - no email config available');
    } else {
      console.log('✅ Email credentials are configured');
    }
    
  } catch (error) {
    console.error('❌ Failed to check environment:', error.message);
  }
}

checkEnvironment();