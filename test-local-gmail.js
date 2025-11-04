const nodemailer = require('nodemailer');

async function testLocalGmail() {
  console.log('🧪 Testing Gmail connection locally...');
  console.log('📝 This will help identify if the issue is Railway or Gmail setup');
  
  // Test with the same email that's configured in Railway
  const testConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'hellversechat@gmail.com',
      pass: 'REPLACE_WITH_REAL_APP_PASSWORD' // You'll need to update this
    }
  };
  
  console.log('🔧 Testing Gmail SMTP connection...');
  console.log('   Host:', testConfig.host);
  console.log('   Port:', testConfig.port);
  console.log('   User:', testConfig.auth.user);
  console.log('   Pass:', testConfig.auth.pass.substring(0, 4) + '...');
  
  if (testConfig.auth.pass === 'REPLACE_WITH_REAL_APP_PASSWORD') {
    console.log('\n❌ SETUP REQUIRED:');
    console.log('📝 To test locally, update this file:');
    console.log('   1. Open: test-local-gmail.js');
    console.log('   2. Replace REPLACE_WITH_REAL_APP_PASSWORD with your real app password');
    console.log('   3. Run: node test-local-gmail.js');
    console.log('');
    console.log('🔍 Current Railway Status:');
    console.log('   Railway has EMAIL_USER and EMAIL_PASS configured');
    console.log('   But connection timeout suggests wrong app password');
    console.log('');
    console.log('✅ NEXT STEPS:');
    console.log('   1. Generate fresh Gmail App Password');
    console.log('   2. Update Railway EMAIL_PASS variable');
    console.log('   3. Wait 2-3 minutes for Railway restart');
    console.log('   4. Test again with: node test-gmail-setup.js');
    return;
  }
  
  try {
    const transporter = nodemailer.createTransporter(testConfig);
    
    console.log('🔗 Attempting Gmail connection...');
    await transporter.verify();
    
    console.log('✅ SUCCESS: Gmail connection working!');
    console.log('📧 Sending test email...');
    
    const result = await transporter.sendMail({
      from: '"HellverseChat Test" <hellversechat@gmail.com>',
      to: 'hellversechat@gmail.com', // Send to self for testing
      subject: 'HellverseChat - Local Test',
      text: 'If you receive this, Gmail is working correctly!'
    });
    
    console.log('✅ SUCCESS: Test email sent!');
    console.log('📧 Message ID:', result.messageId);
    console.log('');
    console.log('🎉 GMAIL IS WORKING LOCALLY!');
    console.log('❌ The issue is with Railway environment variables');
    console.log('🔧 Update Railway EMAIL_PASS with this same app password');
    
  } catch (error) {
    console.error('❌ Gmail connection failed:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('🔍 INVALID LOGIN - This means:');
      console.log('   1. Wrong Gmail app password');
      console.log('   2. 2FA not enabled on hellversechat@gmail.com');
      console.log('   3. App password not generated correctly');
    } else if (error.message.includes('timeout')) {
      console.log('🔍 TIMEOUT - This could mean:');
      console.log('   1. Network/firewall blocking Gmail SMTP');
      console.log('   2. Wrong SMTP settings');
      console.log('   3. Gmail temporarily blocking connections');
    }
  }
}

testLocalGmail();