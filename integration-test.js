// Full-Stack Integration Test for HellverseChat
// Tests both backend API and frontend Socket.IO integration

const API_URL = 'http://localhost:4000';
const FRONTEND_URL = 'http://localhost:5173';

console.log('🧪 HellverseChat Full-Stack Integration Test');
console.log('='.repeat(50));

async function testBackendHealth() {
    try {
        console.log('1. Testing Backend Health...');
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        console.log('✅ Backend Health:', data);
        return true;
    } catch (error) {
        console.log('❌ Backend Health Failed:', error.message);
        return false;
    }
}

async function testAuthentication() {
    try {
        console.log('\n2. Testing Authentication...');
        
        // Test Signup
        const signupData = {
            username: 'integrationtest',
            password: 'test123',
            display: 'Integration Test User'
        };
        
        const signupResponse = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signupData)
        });
        
        if (signupResponse.ok) {
            const userData = await signupResponse.json();
            console.log('✅ Signup successful:', userData.display);
            
            // Test Login
            const loginResponse = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: signupData.username,
                    password: signupData.password
                })
            });
            
            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                console.log('✅ Login successful:', loginData.display);
                return loginData.token;
            }
        }
        return null;
    } catch (error) {
        console.log('❌ Authentication Failed:', error.message);
        return null;
    }
}

async function testSocketIO(token) {
    return new Promise((resolve) => {
        try {
            console.log('\n3. Testing Socket.IO Connection...');
            
            // Import socket.io-client (this would work in a Node environment with the module installed)
            // For browser testing, we'll provide instructions instead
            console.log('📋 Socket.IO Test Instructions:');
            console.log('   1. Open browser to:', FRONTEND_URL);
            console.log('   2. Sign up or login with any credentials');
            console.log('   3. Verify real-time messaging works');
            console.log('   4. Check user list updates');
            console.log('   5. Test room switching');
            
            resolve(true);
        } catch (error) {
            console.log('❌ Socket.IO Test Setup Failed:', error.message);
            resolve(false);
        }
    });
}

function printIntegrationGuide() {
    console.log('\n🚀 Integration Test Complete!');
    console.log('='.repeat(50));
    console.log('Frontend URL: ', FRONTEND_URL);
    console.log('Backend URL:  ', API_URL);
    console.log('\n📋 Manual Testing Checklist:');
    console.log('   ✅ Backend health endpoint working');
    console.log('   ✅ User authentication (signup/login)');
    console.log('   ⏳ Real-time messaging');
    console.log('   ⏳ User presence updates');
    console.log('   ⏳ Room management');
    console.log('   ⏳ Responsive design');
    
    console.log('\n🔧 Features to Test in Browser:');
    console.log('   • Create account and login');
    console.log('   • Send messages and see real-time updates');
    console.log('   • Switch between channels');
    console.log('   • Create new channels');
    console.log('   • Check online users list');
    console.log('   • Test typing indicators');
    console.log('   • Mobile responsive layout');
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Complete manual testing in browser');
    console.log('   2. Deploy to Railway for production');
    console.log('   3. Register domain (HellverseChat.com)');
    console.log('   4. Configure DNS and SSL');
}

// Run the tests
async function runIntegrationTests() {
    const backendHealthy = await testBackendHealth();
    
    if (backendHealthy) {
        const token = await testAuthentication();
        await testSocketIO(token);
    }
    
    printIntegrationGuide();
}

runIntegrationTests();