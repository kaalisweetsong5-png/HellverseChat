// Test script for HellverseChat Backend
// Run with: node test-backend.js

const BASE_URL = 'http://localhost:4000';

async function testBackend() {
  console.log('🧪 Testing HellverseChat Backend...\n');

  // Test 1: Health Check
  console.log('1. Testing Health Check...');
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    console.log('✅ Health check:', healthData);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: User Signup
  console.log('\n2. Testing User Signup...');
  try {
    const signupRes = await fetch(`${BASE_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123',
        display: 'Test User'
      })
    });
    const signupData = await signupRes.json();
    console.log('✅ Signup successful:', signupData);
    
    // Test 3: User Login
    console.log('\n3. Testing User Login...');
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    });
    const loginData = await loginRes.json();
    console.log('✅ Login successful:', loginData);

  } catch (error) {
    console.log('❌ Auth test failed:', error.message);
  }

  console.log('\n🎉 Backend tests completed!');
}

// Run tests
testBackend();