const fetch = require('node-fetch');

async function testResendSetup() {
  try {
    console.log('🧪 Testing Resend email configuration...');
    
    // First check if Resend is configured
    const envResponse = await fetch('https://www.hellversechat.com/api/debug-env');
    const envData = await envResponse.json();
    
    console.log('🌍 Current environment:', {
      hasEmailUser: envData.hasEmailUser,
      hasEmailPass: envData.hasEmailPass,
      hasResendKey: envData.hasResendKey
    });
    
    // Test the email system
    console.log('\n📧 Testing email system...');
    const testResponse = await fetch('https://www.hellversechat.com/api/test-email');
    const testData = await testResponse.json();
    
    console.log('📊 Email test result:', testResponse.status);
    console.log('📋 Response:', JSON.stringify(testData, null, 2));
    
    if (testResponse.status === 200) {
      console.log('✅ SUCCESS: Resend email system working!');
      console.log('🚀 Ready for public signups!');
    } else if (testData.error && testData.error.includes('Resend')) {
      console.log('❌ RESEND ERROR: Check your API key');
    } else {
      console.log('⚠️  Unexpected response - check configuration');
    }
    
    // Test actual signup
    console.log('\n🧪 Testing full signup flow...');
    const signupResponse = await fetch('https://www.hellversechat.com/api/signup-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser' + Date.now(),
        password: 'testpass123',
        email: 'test' + Date.now() + '@example.com'
      })
    });
    
    const signupStatus = signupResponse.status;
    const signupText = await signupResponse.text();
    
    console.log('📊 Signup Status:', signupStatus);
    console.log('📋 Signup Response:', signupText);
    
    if (signupStatus === 200) {
      console.log('🎉 PERFECT! Public signup is working with Resend!');
    } else {
      console.log('❌ Signup still failing - need to debug further');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testResendSetup();