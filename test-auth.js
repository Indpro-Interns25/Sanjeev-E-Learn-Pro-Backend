const axios = require('axios');

async function testLoginAndRegistration() {
  const baseURL = 'http://localhost:3002/api/auth';
  
  console.log('🧪 Testing Authentication System...\n');
  
  // Test 1: Registration
  console.log('📝 1. Testing Registration...');
  try {
    const newUser = {
      name: "New Test User",
      email: `newuser${Date.now()}@example.com`,
      password: "newpassword123",
      role: "student"
    };
    
    const regResponse = await axios.post(`${baseURL}/register`, newUser);
    console.log('✅ Registration Success!');
    console.log('   Status:', regResponse.status);
    console.log('   User:', regResponse.data.user);
    console.log('   Token Length:', regResponse.data.token.length, 'characters');
    
    // Test 2: Login with newly registered user
    console.log('\n🔐 2. Testing Login with new user...');
    const loginResponse = await axios.post(`${baseURL}/login`, {
      email: newUser.email,
      password: newUser.password
    });
    
    console.log('✅ Login Success!');
    console.log('   Status:', loginResponse.status);
    console.log('   User:', loginResponse.data.user);
    console.log('   Token Length:', loginResponse.data.token.length, 'characters');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
  
  // Test 3: Login with existing test user
  console.log('\n🔐 3. Testing Login with existing test user...');
  try {
    const loginResponse = await axios.post(`${baseURL}/login`, {
      email: "your.email@example.com",
      password: "yourpassword123"
    });
    
    console.log('✅ Existing User Login Success!');
    console.log('   Status:', loginResponse.status);
    console.log('   User:', loginResponse.data.user);
    console.log('   Has Token:', !!loginResponse.data.token);
    
  } catch (error) {
    console.error('❌ Existing User Login Error:', error.response?.data?.message || error.message);
  }
  
  console.log('\n🎉 Authentication tests completed!');
}

testLoginAndRegistration();