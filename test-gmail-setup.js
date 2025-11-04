const fetch = require('node-fetch');

async function testGmailSetup() {
  try {
    console.log('🧪 Testing Gmail/SMTP configuration...');
    
    // Check current environment
    const envResponse = await fetch('https://www.hellversechat.com/api/debug-env');
    const envData = await envResponse.json();
    
    console.log('🌍 Current Railway Environment:');
    console.log('   EMAIL_USER configured:', envData.hasEmailUser);
    console.log('   EMAIL_PASS configured:', envData.hasEmailPass);  
    console.log('   RESEND_API_KEY configured:', envData.hasResendKey);
    console.log('   Active provider:', envData.emailProvider);
    
    if (!envData.hasEmailUser || !envData.hasEmailPass) {
      console.log('\n❌ GMAIL NOT CONFIGURED YET');
      console.log('📧 Railway Environment Variables Needed:');
      console.log('   EMAIL_USER = your-gmail@gmail.com');
      console.log('   EMAIL_PASS = your-gmail-app-password');
      console.log('');
      console.log('🔧 Setup Steps:');
      console.log('   1. Go to Railway dashboard → Variables');
      console.log('   2. Delete RESEND_API_KEY if present');
      console.log('   3. Add EMAIL_USER with your Gmail address');
      console.log('   4. Add EMAIL_PASS with your Gmail App Password');
      console.log('   5. Get App Password: myaccount.google.com → Security → App passwords');
      return;
    }
    
    // Test email system
    console.log('\n📧 Testing Gmail email system...');
    const testResponse = await fetch('https://www.hellversechat.com/api/test-email');
    const testData = await testResponse.json();
    
    console.log('📊 Email test status:', testResponse.status);
    console.log('📋 Response:', JSON.stringify(testData, null, 2));
    
    if (testResponse.status === 200 && testData.provider === 'SMTP') {
      console.log('\n✅ GMAIL WORKING!');
      console.log('🚀 Testing public signup...');
      
      // Test actual signup
      const signupResponse = await fetch('https://www.hellversechat.com/api/signup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser' + Date.now(),
          password: 'testpass123',
          email: 'anyone' + Date.now() + '@example.com'  // Any email should work now
        })
      });
      
      const signupStatus = signupResponse.status;
      const signupText = await signupResponse.text();
      
      console.log('📊 Signup Status:', signupStatus);
      console.log('📋 Signup Response:', signupText);
      
      if (signupStatus === 200) {
        console.log('\n🎉 PERFECT! PUBLIC SIGNUP IS WORKING!');
        console.log('✅ Anyone can now sign up and receive verification emails');
        console.log('✅ Emails will be sent from your Gmail account');
      } else {
        console.log('\n❌ Signup still failing - investigating...');
      }
      
    } else {
      console.log('\n❌ Gmail configuration issue');
      console.log('🔍 Check your Gmail App Password');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGmailSetup();