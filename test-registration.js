const axios = require('axios');

async function testRegistration() {
  try {
    console.log('🧪 Testing Registration Endpoint...');
    
    const newUser = {
      name: "Test User " + Date.now(),
      email: `testuser${Date.now()}@example.com`,
      password: "testpassword123",
      role: "student"
    };

    console.log('📤 Sending registration request with data:', newUser);

    const response = await axios.post('http://localhost:3002/api/auth/register', newUser, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Registration Successful!');
    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Data:', response.data);

    // Test getting all users to verify the user was created
    console.log('\n🔍 Verifying user was created by getting all users...');
    
    const usersResponse = await axios.get('http://localhost:3002/api/admin/users', {
      headers: {
        'Authorization': 'Bearer your-admin-token-here' // You'll need to login as admin first
      }
    });

    console.log('👥 Total users in database:', usersResponse.data.users.length);
    const newlyCreatedUser = usersResponse.data.users.find(user => user.email === newUser.email);
    
    if (newlyCreatedUser) {
      console.log('🎉 User successfully created and found in database:');
      console.log('- Name:', newlyCreatedUser.name);
      console.log('- Email:', newlyCreatedUser.email);
      console.log('- Role:', newlyCreatedUser.role);
      console.log('- Created At:', newlyCreatedUser.created_at);
    } else {
      console.log('⚠️ User not found in database - there might be an issue');
    }

  } catch (error) {
    console.error('❌ Registration Failed!');
    console.error('Error Status:', error.response?.status);
    console.error('Error Message:', error.response?.data?.message || error.message);
    console.error('Full Error:', error.response?.data);
  }
}

testRegistration();