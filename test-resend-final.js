const fetch = require('node-fetch');

async function testResendFinal() {
  try {
    console.log('🚀 Testing Resend Email System...');
    
    // Check current environment
    const envResponse = await fetch('https://www.hellversechat.com/api/debug-env');
    const envData = await envResponse.json();
    
    console.log('🌍 Current Railway Environment:');
    console.log('   EMAIL_USER configured:', envData.hasEmailUser);
    console.log('   EMAIL_PASS configured:', envData.hasEmailPass);  
    console.log('   RESEND_API_KEY configured:', envData.hasResendKey);
    console.log('   Active provider:', envData.emailProvider);
    
    if (!envData.hasResendKey) {
      console.log('\n❌ RESEND NOT CONFIGURED YET');
      console.log('📧 Railway Environment Variables Needed:');
      console.log('   RESEND_API_KEY = re_xxxxxxxxxxxxxxxxx');
      console.log('');
      console.log('🔧 Setup Steps:');
      console.log('   1. Go to Railway dashboard → Variables');
      console.log('   2. Delete EMAIL_USER and EMAIL_PASS if present');
      console.log('   3. Add RESEND_API_KEY with your API key from resend.com');
      console.log('   4. Get API key: resend.com dashboard → API Keys');
      return;
    }
    
    // Test email system
    console.log('\n📧 Testing Resend email system...');
    const testResponse = await fetch('https://www.hellversechat.com/api/test-email');
    const testData = await testResponse.json();
    
    console.log('📊 Email test status:', testResponse.status);
    console.log('📋 Response:', JSON.stringify(testData, null, 2));
    
    if (testResponse.status === 200 && testData.provider === 'Resend') {
      console.log('\n✅ RESEND WORKING!');
      console.log('🚀 Testing public signup...');
      
      // Test actual signup with any email
      const signupResponse = await fetch('https://www.hellversechat.com/api/signup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser' + Date.now(),
          password: 'testpass123',
          email: 'kaalisweetsong5@gmail.com'  // Use your verified email first
        })
      });
      
      const signupStatus = signupResponse.status;
      const signupText = await signupResponse.text();
      
      console.log('📊 Signup Status:', signupStatus);
      console.log('📋 Signup Response:', signupText);
      
      if (signupStatus === 200) {
        console.log('\n🎉 PERFECT! RESEND IS WORKING!');
        console.log('✅ Email verification system is functional');
        console.log('✅ Check your email for the verification code');
        console.log('');
        console.log('📧 Email Provider: Resend (Professional)');
        console.log('🔄 For unlimited public signups: verify domain at resend.com/domains');
        console.log('📝 Or emails will only go to your verified address');
      } else {
        console.log('\n❌ Signup still failing - checking error...');
      }
      
    } else {
      console.log('\n❌ Resend configuration issue');
      console.log('🔍 Check your Resend API key');
      
      if (testData.error && testData.error.includes('domain')) {
        console.log('💡 DOMAIN ISSUE: Need to verify domain or use resend.dev');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testResendFinal();