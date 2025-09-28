// Test script to verify API endpoints are working
const axios = require('axios');

const BASE_URL = 'http://localhost:3002';

async function testEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health endpoint working:', healthResponse.data);
    
    // Test register endpoint (exact frontend endpoint)
    console.log('\n2. Testing /auth/register endpoint...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'API Test User',
      email: `apitest${Date.now()}@example.com`,
      password: 'password123',
      role: 'student'
    });
    console.log('✅ Register endpoint working:', registerResponse.data);
    
    // Test login endpoint (exact frontend endpoint)
    console.log('\n3. Testing /auth/login endpoint...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'john@example.com',
      password: 'password123'
    });
    console.log('✅ Login endpoint working:', loginResponse.data);
    
    console.log('\n🎉 All API endpoints are working correctly!');
    console.log('\n📝 Your frontend should call:');
    console.log(`   - Register: ${BASE_URL}/auth/register`);
    console.log(`   - Login: ${BASE_URL}/auth/login`);
    console.log(`   - Profile: ${BASE_URL}/auth/me`);
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testEndpoints();