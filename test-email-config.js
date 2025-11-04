const fetch = require('node-fetch');

async function testEmailConfig() {
  try {
    console.log('🧪 Testing email configuration on Railway...');
    
    const response = await fetch('https://www.hellversechat.com/api/test-email');
    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Data:', JSON.stringify(data, null, 2));
    
    if (response.status === 500) {
      console.log('❌ EMAIL ERROR CONFIRMED!');
      console.log('🔍 Error details:', data.error);
      
      if (data.emailUser && data.emailUser.includes('your-email@gmail.com')) {
        console.log('🎯 FOUND THE ISSUE!');
        console.log('📧 EMAIL_USER is set to placeholder value: your-email@gmail.com');
        console.log('📧 EMAIL_PASS is set to placeholder value: your-app-password');
        console.log('✅ SOLUTION: Replace with real Gmail credentials in Railway dashboard');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEmailConfig();