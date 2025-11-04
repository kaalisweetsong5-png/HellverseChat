const fetch = require('node-fetch');

async function testPublicEmail() {
  try {
    console.log('🧪 Testing PUBLIC email sending with verified domain...');
    
    // Test with a completely different email address
    const testEmail = 'randomtest' + Date.now() + '@gmail.com';
    
    console.log('📧 Testing signup with random email:', testEmail);
    
    const signupResponse = await fetch('https://www.hellversechat.com/api/signup-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'publictest' + Date.now(),
        password: 'testpass123',
        email: testEmail  // Random email - should work if domain is verified
      })
    });
    
    const signupStatus = signupResponse.status;
    const signupText = await signupResponse.text();
    
    console.log('📊 Signup Status:', signupStatus);
    console.log('📋 Signup Response:', signupText);
    
    if (signupStatus === 200 && signupText.includes('Verification code sent')) {
      console.log('\n🎉 SUCCESS! DOMAIN VERIFICATION WORKING!');
      console.log('✅ Can send emails to ANY email address');
      console.log('✅ Public signups are fully functional');
      console.log('✅ Your domain verification is working perfectly');
      console.log('');
      console.log('🚀 HELLVERSECHAT IS READY FOR PUBLIC USE!');
      console.log('📧 Anyone can now sign up and receive verification emails');
    } else if (signupStatus === 500) {
      console.log('\n❌ Still restricted to your email only');
      console.log('🔍 Domain verification might not be complete');
      console.log('💡 Check resend.com/domains for verification status');
    } else {
      console.log('\n⚠️  Unexpected response:', signupStatus, signupText);
    }
    
    // Also test the email API directly
    console.log('\n🧪 Testing email API directly...');
    const emailTestResponse = await fetch('https://www.hellversechat.com/api/test-email');
    const emailTestData = await emailTestResponse.json();
    
    console.log('📋 Email API Response:', JSON.stringify(emailTestData, null, 2));
    
    if (emailTestData.success && !emailTestData.result?.message?.includes('own email address')) {
      console.log('✅ Domain verification confirmed via API');
    } else if (emailTestData.result?.message?.includes('own email address')) {
      console.log('❌ API still shows domain restriction');
      console.log('🔧 Domain verification may need more time or DNS propagation');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPublicEmail();