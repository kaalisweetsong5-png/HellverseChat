const fetch = require('node-fetch');

async function testSignup() {
  try {
    console.log('🧪 Testing signup endpoint...');
    
    const response = await fetch('https://www.hellversechat.com/api/signup-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser' + Date.now(),
        password: 'testpass123',
        email: 'test' + Date.now() + '@example.com'
      })
    });
    
    const status = response.status;
    const text = await response.text();
    
    console.log(`📊 Response Status: ${status}`);
    console.log(`📋 Response Body: ${text}`);
    
    if (status === 200 && text.includes('Verification code sent')) {
      console.log('✅ SUCCESS: Signup endpoint working properly!');
      console.log('✅ Email verification system functioning correctly');
    } else if (status === 500) {
      console.log('❌ STILL 500 ERROR: Need to investigate further');
    } else {
      console.log('ℹ️  Different response - check if this is expected');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSignup();