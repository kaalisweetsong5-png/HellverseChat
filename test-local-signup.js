const fetch = require('node-fetch');

async function testLocalSignup() {
  try {
    console.log('🧪 Testing LOCAL signup endpoint...');
    
    const response = await fetch('http://localhost:4000/api/signup-request', {
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
      console.log('✅ SUCCESS: Local signup works!');
    } else {
      console.log('ℹ️  Different response - checking logs');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLocalSignup();