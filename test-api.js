const axios = require('axios');

async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');

  try {
    // Test register endpoint
    console.log('Testing POST /auth/register...');
    const registerResponse = await axios.post('http://localhost:3002/auth/register', {
      name: 'API Test User',
      email: 'apitest@example.com',
      password: 'password123',
      role: 'student'
    });
    console.log('✅ Register successful:', registerResponse.data);

    // Test login endpoint
    console.log('\nTesting POST /auth/login...');
    const loginResponse = await axios.post('http://localhost:3002/auth/login', {
      email: 'john@example.com',
      password: 'password123'
    });
    console.log('✅ Login successful:', loginResponse.data);

    // Test profile endpoint
    console.log('\nTesting GET /auth/me...');
    const profileResponse = await axios.get('http://localhost:3002/auth/me', {
      headers: {
        Authorization: `Bearer ${loginResponse.data.token}`
      }
    });
    console.log('✅ Profile successful:', profileResponse.data);

  } catch (error) {
    console.error('❌ API Test failed:', error.response?.data || error.message);
  }
}

testAPI();