// Simple Backend Test - Manual Testing Guide
console.log(`
🧪 HellverseChat Backend Testing Guide
=====================================

Your backend server should be running on: http://localhost:4000

📋 Manual Tests to Run:

1. Health Check (Browser/Postman):
   GET http://localhost:4000/health
   Expected: { "status": "ok", "timestamp": "2025-11-04T..." }

2. User Signup (POST):
   URL: http://localhost:4000/signup  
   Body: {
     "username": "testuser",
     "password": "password123", 
     "display": "Test User"
   }
   Expected: { "token": "jwt...", "username": "testuser" }

3. User Login (POST):
   URL: http://localhost:4000/login
   Body: {
     "username": "testuser",
     "password": "password123"
   }
   Expected: { "token": "jwt...", "username": "testuser", "display": "Test User" }

4. Socket.IO Test (Browser Console):
   Open browser dev tools at: http://localhost:4000
   Run:
   > const socket = io('ws://localhost:4000');
   > socket.emit('auth', { token: 'your-jwt-token-here' });
   > socket.emit('message', { text: 'Hello World!', room: 'general' });

📱 Quick Browser Tests:
- Visit: http://localhost:4000 (should show Express error - normal)
- Visit: http://localhost:4000/health (should show JSON status)

🚀 Production Tests (Once deployed on Railway):
- Replace localhost:4000 with your Railway URL
- Test same endpoints
- Verify HTTPS works
- Test from different networks

✅ What Success Looks Like:
- Health endpoint returns JSON
- Signup creates new users  
- Login returns valid JWT tokens
- Socket.IO connections work
- No CORS errors in browser console

❌ Common Issues:
- Port 4000 not accessible: Check Windows Firewall
- CORS errors: Check CORS_ORIGIN environment variable
- JWT errors: Check JWT_SECRET is set properly
`);

// Auto-test what we can
async function quickTest() {
  try {
    console.log('\n🔄 Running automatic tests...\n');

    // Test signup
    const signupRes = await fetch('http://localhost:4000/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `testuser${Date.now()}`,
        password: 'test123',
        display: 'Auto Test User'
      })
    });

    if (signupRes.ok) {
      const data = await signupRes.json();
      console.log('✅ Signup test PASSED');
      console.log('🎫 JWT Token received:', data.token.substring(0, 20) + '...');
      return data.token;
    } else {
      console.log('❌ Signup test FAILED');
    }
  } catch (error) {
    console.log('❌ Backend connection FAILED:', error.message);
    console.log('💡 Make sure server is running: cd backend && npm start');
  }
}

quickTest();