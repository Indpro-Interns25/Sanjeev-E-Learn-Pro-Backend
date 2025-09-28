const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

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

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAdminEndpoints() {
  console.log('🧪 Testing Fixed Admin Endpoints...\n');
  
  try {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 1: Admin Stats
    console.log('1. Testing GET /api/admin/stats');
    try {
      const statsResponse = await makeRequest('/api/admin/stats');
      console.log('   Status:', statsResponse.status);
      if (statsResponse.data.success) {
        console.log('   ✅ Admin Stats Working');
        const stats = statsResponse.data.data.stats;
        console.log('   📊 Stats:', {
          students: stats.total_students,
          instructors: stats.total_instructors,
          courses: stats.total_courses,
          lessons: stats.total_lessons,
          enrollments: stats.total_enrollments
        });
      }
    } catch (error) {
      console.log('   ❌ Stats Error:', error.message);
    }
    
    // Test 2: Courses
    console.log('\n2. Testing GET /api/admin/courses');
    try {
      const coursesResponse = await makeRequest('/api/admin/courses');
      console.log('   Status:', coursesResponse.status);
      if (coursesResponse.data.success) {
        console.log('   ✅ Admin Courses Working');
        console.log('   📚 Total Courses:', coursesResponse.data.data.length);
      }
    } catch (error) {
      console.log('   ❌ Courses Error:', error.message);
    }
    
    // Test 3: Lessons
    console.log('\n3. Testing GET /api/admin/lessons');
    try {
      const lessonsResponse = await makeRequest('/api/admin/lessons');
      console.log('   Status:', lessonsResponse.status);
      if (lessonsResponse.data.success) {
        console.log('   ✅ Admin Lessons Working');
        console.log('   📖 Total Lessons:', lessonsResponse.data.data.length);
      }
    } catch (error) {
      console.log('   ❌ Lessons Error:', error.message);
    }
    
    // Test 4: Students
    console.log('\n4. Testing GET /api/admin/students');
    try {
      const studentsResponse = await makeRequest('/api/admin/students');
      console.log('   Status:', studentsResponse.status);
      if (studentsResponse.data.success) {
        console.log('   ✅ Admin Students Working');
        console.log('   👥 Total Students:', studentsResponse.data.data.length);
        if (studentsResponse.data.data.length > 0) {
          const student = studentsResponse.data.data[0];
          console.log('   Sample Student:', student.name, '- Status:', student.status);
        }
      }
    } catch (error) {
      console.log('   ❌ Students Error:', error.message);
    }
    
    console.log('\n✅ Admin endpoint testing completed!');
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Start server and then test
console.log('🚀 Starting server for admin endpoint testing...');
const { spawn } = require('child_process');
const server = spawn('node', ['server.js'], { 
  detached: false,
  stdio: 'pipe'
});

server.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('PostgreSQL connection established')) {
    console.log('✅ Server ready, starting admin endpoint tests...\n');
    testAdminEndpoints().then(() => {
      setTimeout(() => {
        server.kill();
        process.exit(0);
      }, 2000);
    });
  }
});

server.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString());
});

// Kill server after 15 seconds
setTimeout(() => {
  server.kill();
  process.exit(0);
}, 15000);