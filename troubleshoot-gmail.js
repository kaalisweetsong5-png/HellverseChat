const fetch = require('node-fetch');

async function troubleshootGmail() {
  try {
    console.log('🔧 Troubleshooting Gmail configuration...');
    
    // Get detailed environment info
    const envResponse = await fetch('https://www.hellversechat.com/api/debug-env');
    const envData = await envResponse.json();
    
    console.log('📋 Full environment data:', JSON.stringify(envData, null, 2));
    
    // Test with more detailed error reporting
    console.log('\n🧪 Testing email with full error details...');
    const testResponse = await fetch('https://www.hellversechat.com/api/test-email');
    const testText = await testResponse.text();
    
    console.log('📊 Raw response status:', testResponse.status);
    console.log('📋 Raw response body:', testText);
    
    try {
      const testData = JSON.parse(testText);
      console.log('\n🔍 Parsed error details:');
      console.log('   Error:', testData.error);
      console.log('   Provider:', testData.provider);
      console.log('   Email User:', testData.emailUser);
      
      if (testData.error && testData.error.includes('timeout')) {
        console.log('\n❌ CONNECTION TIMEOUT ISSUES:');
        console.log('   This usually means:');
        console.log('   1. Wrong Gmail App Password in Railway');
        console.log('   2. Gmail account needs 2FA enabled');  
        console.log('   3. App Password not generated correctly');
        console.log('   4. Railway environment not updated yet');
      }
      
    } catch (parseError) {
      console.log('❌ Could not parse response as JSON');
    }
    
    // Test a simple signup to see server-side logs
    console.log('\n🧪 Testing signup to see server logs...');
    const signupResponse = await fetch('https://www.hellversechat.com/api/signup-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser' + Date.now(),
        password: 'testpass123',
        email: 'debug' + Date.now() + '@example.com'
      })
    });
    
    const signupStatus = signupResponse.status;
    const signupText = await signupResponse.text();
    
    console.log('📊 Signup Status:', signupStatus);
    console.log('📋 Signup Response:', signupText);
    
    if (signupStatus === 500) {
      console.log('\n🔍 DIAGNOSIS:');
      console.log('   The Gmail credentials in Railway are not working.');
      console.log('   Please verify:');
      console.log('   1. EMAIL_USER = hellversechat@gmail.com');
      console.log('   2. EMAIL_PASS = [16-character app password with no spaces]');
      console.log('   3. 2-Factor Auth enabled on hellversechat@gmail.com');
      console.log('   4. App Password generated at: myaccount.google.com/apppasswords');
    }
    
  } catch (error) {
    console.error('❌ Troubleshooting failed:', error.message);
  }
}

troubleshootGmail();