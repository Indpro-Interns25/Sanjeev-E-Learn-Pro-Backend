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
  console.log('🧪 Testing Admin Dashboard Endpoints...\n');
  
  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 1: Admin Stats
    console.log('1. Testing GET /api/admin/stats');
    const statsResponse = await makeRequest('/api/admin/stats');
    console.log('   Status:', statsResponse.status);
    if (statsResponse.data.success) {
      console.log('   ✅ Stats Success:', statsResponse.data.success);
      const stats = statsResponse.data.data.stats;
      console.log('   📊 Total Students:', stats.total_students);
      console.log('   👨‍🏫 Total Instructors:', stats.total_instructors);
      console.log('   📚 Total Courses:', stats.total_courses);
      console.log('   📖 Total Lessons:', stats.total_lessons);
    } else {
      console.log('   ❌ Response:', JSON.stringify(statsResponse.data, null, 2));
    }
    
    console.log('\n2. Testing GET /api/admin/courses');
    const coursesResponse = await makeRequest('/api/admin/courses');
    console.log('   Status:', coursesResponse.status);
    if (coursesResponse.data.success) {
      console.log('   ✅ Courses Success:', coursesResponse.data.success);
      console.log('   📚 Course Count:', coursesResponse.data.data.length);
    } else {
      console.log('   ❌ Response:', JSON.stringify(coursesResponse.data, null, 2));
    }
    
    console.log('\n3. Testing GET /api/admin/lessons');
    const lessonsResponse = await makeRequest('/api/admin/lessons');
    console.log('   Status:', lessonsResponse.status);
    if (lessonsResponse.data.success) {
      console.log('   ✅ Lessons Success:', lessonsResponse.data.success);
      console.log('   📖 Lesson Count:', lessonsResponse.data.data.length);
    } else {
      console.log('   ❌ Response:', JSON.stringify(lessonsResponse.data, null, 2));
    }
    
    console.log('\n4. Testing GET /api/admin/students');
    const studentsResponse = await makeRequest('/api/admin/students');
    console.log('   Status:', studentsResponse.status);
    if (studentsResponse.data.success) {
      console.log('   ✅ Students Success:', studentsResponse.data.success);
      console.log('   👥 Student Count:', studentsResponse.data.data.length);
    } else {
      console.log('   ❌ Response:', JSON.stringify(studentsResponse.data, null, 2));
    }
    
    console.log('\n✅ Admin endpoint testing completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAdminEndpoints();