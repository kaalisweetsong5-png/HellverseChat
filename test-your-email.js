const fetch = require('node-fetch');

async function testWithYourEmail() {
  try {
    console.log('🧪 Testing signup with your verified email address...');
    
    const response = await fetch('https://www.hellversechat.com/api/signup-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser' + Date.now(),
        password: 'testpass123',
        email: 'kaalisweetsong5@gmail.com'  // Your verified email from Resend
      })
    });
    
    const status = response.status;
    const text = await response.text();
    
    console.log(`📊 Response Status: ${status}`);
    console.log(`📋 Response Body: ${text}`);
    
    if (status === 200 && text.includes('Verification code sent')) {
      console.log('🎉 SUCCESS! Resend is working!');
      console.log('📧 Check your email (kaalisweetsong5@gmail.com) for the verification code');
      console.log('');
      console.log('💡 NEXT STEPS:');
      console.log('   For public signups, you need to either:');
      console.log('   1. Verify your domain at resend.com/domains');
      console.log('   2. Or upgrade to a paid Resend plan');
      console.log('   3. Or switch back to Gmail option for unlimited emails');
    } else {
      console.log('❌ Still not working - investigating...');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWithYourEmail();