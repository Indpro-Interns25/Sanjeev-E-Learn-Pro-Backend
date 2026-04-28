#!/usr/bin/env node

/**
 * Complete Authentication Testing Suite
 * File: scripts/test-auth-complete.js
 * 
 * Usage:
 *   node scripts/test-auth-complete.js
 * 
 * Tests all authentication scenarios
 */

const http = require('http');
const jwt = require('jsonwebtoken');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  header: (msg) => console.log(`${colors.blue}${colors.bright}=== ${msg} ===${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.bright}→ ${msg}${colors.reset}`),
};

/**
 * Make HTTP request
 */
function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            rawHeaders: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            error: 'Failed to parse JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Generate test JWT token
 */
function generateTestToken(payload = {}, expiresIn = '7d') {
  const defaultPayload = {
    id: 1,
    email: 'test@example.com',
    role: 'student',
    ...payload
  };

  return jwt.sign(defaultPayload, JWT_SECRET, { expiresIn });
}

/**
 * Generate expired token
 */
function generateExpiredToken() {
  return jwt.sign(
    { id: 1, email: 'test@example.com' },
    JWT_SECRET,
    { expiresIn: '-1s' } // Expired 1 second ago
  );
}

/**
 * Generate token with wrong secret
 */
function generateWrongSecretToken() {
  return jwt.sign(
    { id: 1, email: 'test@example.com' },
    'wrong-secret',
    { expiresIn: '7d' }
  );
}

/**
 * Test 1: Valid Token
 */
async function test1ValidToken() {
  log.header('TEST 1: Valid Token');

  const token = generateTestToken();
  log.test(`Generated token: ${token.substring(0, 30)}...`);

  log.test('Making request with valid token...');
  const response = await makeRequest(
    'GET',
    '/api/courses',
    { 'Authorization': `Bearer ${token}` }
  );

  log.info(`Status: ${response.status}`);
  log.info(`Response: ${JSON.stringify(response.body, null, 2)}`);

  if (response.status === 200) {
    log.success('Valid token accepted');
  } else if (response.status === 401 && response.body?.error === 'USER_NOT_FOUND') {
    log.warning('Token valid but user not in database (expected in test)');
  } else {
    log.error(`Unexpected response: ${response.status}`);
  }
}

/**
 * Test 2: Missing Token
 */
async function test2MissingToken() {
  log.header('TEST 2: Missing Token');

  log.test('Making request WITHOUT Authorization header...');
  const response = await makeRequest('GET', '/api/courses');

  log.info(`Status: ${response.status}`);
  log.info(`Error: ${response.body?.error}`);
  log.info(`Message: ${response.body?.message}`);

  if (response.status === 401 && response.body?.error === 'NO_TOKEN') {
    log.success('Missing token correctly rejected with NO_TOKEN');
  } else {
    log.error(`Unexpected response: ${response.status} ${response.body?.error}`);
  }
}

/**
 * Test 3: Invalid Token Format
 */
async function test3InvalidFormat() {
  log.header('TEST 3: Invalid Token Format');

  log.test('Test 3a: Missing "Bearer " prefix...');
  const token = generateTestToken();
  const response3a = await makeRequest(
    'GET',
    '/api/courses',
    { 'Authorization': token } // No "Bearer " prefix
  );

  log.info(`Status: ${response3a.status}`);
  log.info(`Error: ${response3a.body?.error}`);

  if (response3a.status === 401 && response3a.body?.error === 'NO_TOKEN') {
    log.success('Invalid format correctly rejected');
  } else {
    log.error(`Unexpected: ${response3a.status}`);
  }

  log.test('Test 3b: Invalid Bearer format...');
  const response3b = await makeRequest(
    'GET',
    '/api/courses',
    { 'Authorization': 'InvalidPrefix ' + token }
  );

  log.info(`Status: ${response3b.status}`);
  log.info(`Error: ${response3b.body?.error}`);

  if (response3b.status === 401 && response3b.body?.error === 'NO_TOKEN') {
    log.success('Invalid prefix correctly rejected');
  } else {
    log.error(`Unexpected: ${response3b.status}`);
  }
}

/**
 * Test 4: Expired Token
 */
async function test4ExpiredToken() {
  log.header('TEST 4: Expired Token');

  // Wait a bit to ensure token is expired
  log.test('Generating expired token and waiting...');
  const expiredToken = generateExpiredToken();

  // Wait to ensure expiration
  await new Promise(resolve => setTimeout(resolve, 1100));

  log.test('Making request with expired token...');
  const response = await makeRequest(
    'GET',
    '/api/courses',
    { 'Authorization': `Bearer ${expiredToken}` }
  );

  log.info(`Status: ${response.status}`);
  log.info(`Error: ${response.body?.error}`);
  log.info(`Message: ${response.body?.message}`);

  if (response.status === 401 && response.body?.error === 'TOKEN_EXPIRED') {
    log.success('Expired token correctly rejected with TOKEN_EXPIRED');
  } else {
    log.error(`Unexpected: ${response.status}`);
  }
}

/**
 * Test 5: Invalid Signature
 */
async function test5InvalidSignature() {
  log.header('TEST 5: Invalid Signature (Wrong Secret)');

  const wrongToken = generateWrongSecretToken();
  log.test('Generated token with wrong secret: ' + wrongToken.substring(0, 30) + '...');

  log.test('Making request with wrong-secret token...');
  const response = await makeRequest(
    'GET',
    '/api/courses',
    { 'Authorization': `Bearer ${wrongToken}` }
  );

  log.info(`Status: ${response.status}`);
  log.info(`Error: ${response.body?.error}`);
  log.info(`Message: ${response.body?.message}`);

  if (response.status === 401 && response.body?.error === 'INVALID_TOKEN') {
    log.success('Invalid signature correctly rejected with INVALID_TOKEN');
  } else {
    log.error(`Unexpected: ${response.status}`);
  }
}

/**
 * Test 6: Malformed Token
 */
async function test6MalformedToken() {
  log.header('TEST 6: Malformed Token');

  const malformedToken = 'not-a-valid-jwt-token';
  log.test(`Using malformed token: ${malformedToken}`);

  log.test('Making request with malformed token...');
  const response = await makeRequest(
    'GET',
    '/api/courses',
    { 'Authorization': `Bearer ${malformedToken}` }
  );

  log.info(`Status: ${response.status}`);
  log.info(`Error: ${response.body?.error}`);
  log.info(`Message: ${response.body?.message}`);

  if (response.status === 401 && response.body?.error === 'INVALID_TOKEN') {
    log.success('Malformed token correctly rejected');
  } else {
    log.error(`Unexpected: ${response.status}`);
  }
}

/**
 * Test 7: Header Case Insensitivity
 */
async function test7CaseInsensitive() {
  log.header('TEST 7: Header Case Insensitivity');

  const token = generateTestToken();

  const variants = [
    { name: 'lowercase "bearer"', header: `bearer ${token}` },
    { name: 'uppercase "BEARER"', header: `BEARER ${token}` },
    { name: 'mixed "BeArEr"', header: `BeArEr ${token}` },
    { name: 'standard "Bearer"', header: `Bearer ${token}` },
  ];

  for (const variant of variants) {
    log.test(`Testing ${variant.name}...`);
    const response = await makeRequest(
      'GET',
      '/api/courses',
      { 'Authorization': variant.header }
    );

    if (response.status === 200 || response.body?.error === 'USER_NOT_FOUND') {
      log.success(`${variant.name} - Token extracted successfully`);
    } else if (response.status === 401) {
      log.warning(`${variant.name} - Token format rejected: ${response.body?.error}`);
    } else {
      log.error(`${variant.name} - Unexpected: ${response.status}`);
    }
  }
}

/**
 * Test 8: CORS Headers
 */
async function test8CORSHeaders() {
  log.header('TEST 8: CORS Headers');

  log.test('Making request and checking CORS headers...');
  const response = await makeRequest(
    'GET',
    '/api/courses',
    { 'Authorization': `Bearer ${generateTestToken()}` }
  );

  log.info('Response headers:');
  const corsHeaders = [
    'access-control-allow-origin',
    'access-control-allow-credentials',
    'access-control-allow-methods',
    'access-control-allow-headers'
  ];

  for (const header of corsHeaders) {
    const value = response.headers[header];
    if (value) {
      log.success(`${header}: ${value}`);
    } else {
      log.warning(`${header}: NOT SET`);
    }
  }
}

/**
 * Test 9: Authorization Header Check
 */
async function test9AuthorizationInCORS() {
  log.header('TEST 9: Authorization Header in CORS');

  const response = await makeRequest('GET', '/api/courses');

  const allowedHeaders = response.headers['access-control-allow-headers'];
  if (allowedHeaders && allowedHeaders.toLowerCase().includes('authorization')) {
    log.success('Authorization header is allowed in CORS');
  } else {
    log.error('Authorization header NOT in CORS allowed headers');
    log.info(`Allowed headers: ${allowedHeaders}`);
  }
}

/**
 * Test 10: Token Payload Verification
 */
async function test10TokenPayload() {
  log.header('TEST 10: Token Payload Verification');

  const payload = {
    id: 42,
    email: 'testuser@example.com',
    role: 'instructor'
  };

  const token = generateTestToken(payload);
  const decoded = jwt.verify(token, JWT_SECRET);

  log.test('Token generated with custom payload');
  log.info(`Payload: ${JSON.stringify(decoded, null, 2)}`);

  for (const [key, value] of Object.entries(payload)) {
    if (decoded[key] === value) {
      log.success(`${key}: ${value} ✓`);
    } else {
      log.error(`${key}: expected ${value}, got ${decoded[key]}`);
    }
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  log.header('AUTHENTICATION TEST SUITE');
  log.info(`API URL: ${API_URL}`);
  log.info(`Testing endpoint: GET /api/courses`);
  console.log();

  try {
    await test1ValidToken();
    console.log();

    await test2MissingToken();
    console.log();

    await test3InvalidFormat();
    console.log();

    await test4ExpiredToken();
    console.log();

    await test5InvalidSignature();
    console.log();

    await test6MalformedToken();
    console.log();

    await test7CaseInsensitive();
    console.log();

    await test8CORSHeaders();
    console.log();

    await test9AuthorizationInCORS();
    console.log();

    await test10TokenPayload();
    console.log();

    log.header('ALL TESTS COMPLETED');
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  generateTestToken,
  generateExpiredToken,
  makeRequest,
  runAllTests
};
