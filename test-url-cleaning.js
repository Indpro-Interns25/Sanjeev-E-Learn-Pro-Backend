const http = require('http');

async function testUrlCleaning() {
  console.log('🧪 Testing URL Cleaning for /api/lessons with trailing space...\n');
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Test the problematic URL with trailing space
    const testUrl = '/api/lessons%20'; // %20 is URL-encoded space
    
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: testUrl,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: responseData });
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });
      
      req.end();
    });

    console.log('Request URL:', testUrl);
    console.log('Response Status:', response.status);
    
    if (response.status === 200) {
      console.log('✅ URL cleaning worked! Lessons endpoint responded successfully');
      console.log('📊 Success:', response.data.success);
      console.log('📖 Lessons count:', response.data.data?.length || 0);
    } else {
      console.log('❌ Status:', response.status);
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Start server first
const { spawn } = require('child_process');
console.log('🚀 Starting server with URL cleaning...');

const server = spawn('node', ['server.js'], { 
  detached: false,
  stdio: ['ignore', 'pipe', 'pipe']
});

server.stdout.on('data', (data) => {
  if (data.toString().includes('PostgreSQL connection established')) {
    console.log('✅ Server ready with URL cleaning middleware!\n');
    testUrlCleaning().then(() => {
      server.kill();
      process.exit(0);
    });
  }
});

server.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString());
});

setTimeout(() => {
  server.kill();
  process.exit(1);
}, 15000);