const bcrypt = require('bcrypt');
const User = require('../models/userModel');
require('dotenv').config();

async function testRegistration() {
  console.log('🧪 Testing user registration and database storage...\n');
  
  try {
    // Test user data
    const testUser = {
      name: 'sanjubhai',
      email: 'sanju123@gmail.com',
      password: 'password123',
      role: 'student'
    };
    
    console.log('1. Testing user creation process...');
    
    // Check if user already exists
    console.log('2. Checking if email already exists...');
    const existingUser = await User.findByEmail(testUser.email);
    
    if (existingUser) {
      console.log('   ⚠️  User with this email already exists');
      console.log('   📧 Existing user:', {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        created_at: existingUser.created_at
      });
      return;
    }
    
    // Hash password
    console.log('3. Hashing password...');
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    console.log('   ✅ Password hashed successfully');
    
    // Create user
    console.log('4. Creating user in database...');
    const newUser = await User.create({
      email: testUser.email,
      name: testUser.name,
      password: hashedPassword,
      role: testUser.role
    });
    
    console.log('   ✅ User created successfully!');
    console.log('   📋 User details:', {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      created_at: newUser.created_at
    });
    
    // Verify user can be found
    console.log('5. Verifying user can be retrieved...');
    const foundUser = await User.findById(newUser.id);
    if (foundUser) {
      console.log('   ✅ User retrieval successful');
    } else {
      console.log('   ❌ User retrieval failed');
    }
    
    // Test password verification
    console.log('6. Testing password verification...');
    const isPasswordValid = await bcrypt.compare(testUser.password, foundUser.password);
    if (isPasswordValid) {
      console.log('   ✅ Password verification successful');
    } else {
      console.log('   ❌ Password verification failed');
    }
    
    console.log('\n🎉 Registration process test completed successfully!');
    console.log('\n📝 Frontend Integration Instructions:');
    console.log('   Use POST request to: http://localhost:3002/api/auth/register');
    console.log('   Content-Type: application/json');
    console.log('   Body example:', JSON.stringify(testUser, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the test
testRegistration();