const http = require('http');

// Test registration endpoint
const postData = JSON.stringify({
  name: 'sanjubhai',
  email: 'sanju123@gmail.com',
  password: 'password123',
  role: 'student'
});

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Registration Response:', data);
    if (res.statusCode === 201) {
      console.log('✅ Registration successful!');
    } else {
      console.log('❌ Registration failed');
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Network error: ${e.message}`);
});

req.write(postData);
req.end();