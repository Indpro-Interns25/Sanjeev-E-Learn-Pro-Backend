// Test Helper for Authentication Debugging
// Location: utils/authTestHelper.js

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Generate a test JWT token for debugging
 * @param {Object} payload - User data (id, email, role)
 * @param {string} expiresIn - Token expiration (default: 7d)
 * @returns {string} JWT token
 */
function generateTestToken(payload, expiresIn = '7d') {
  const token = jwt.sign(
    {
      id: payload.id || 1,
      email: payload.email || 'test@example.com',
      role: payload.role || 'student',
      ...payload
    },
    JWT_SECRET,
    { expiresIn }
  );
  
  console.log('✅ Test token generated:');
  console.log('🔗 Token:', token);
  console.log('📋 Payload:', jwt.decode(token));
  console.log('⏰ Expires in:', expiresIn);
  
  return token;
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload or error
 */
function verifyTestToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verified successfully');
    console.log('📋 Decoded payload:', decoded);
    return { success: true, data: decoded };
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded payload
 */
function decodeToken(token) {
  try {
    const decoded = jwt.decode(token);
    console.log('📋 Token decoded (unverified):', decoded);
    return decoded;
  } catch (error) {
    console.error('❌ Decode failed:', error.message);
    return null;
  }
}

/**
 * Test authorization header extraction
 * @param {string} authHeader - Authorization header value
 * @returns {Object} Extracted token and method
 */
function parseAuthHeader(authHeader) {
  console.log('🔍 Parsing header:', authHeader);
  
  if (!authHeader) {
    return { success: false, error: 'No Authorization header' };
  }
  
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    console.log('✓ Bearer token extracted');
    return { success: true, method: 'Bearer', token };
  } else if (!authHeader.includes(' ')) {
    console.log('✓ Raw token extracted');
    return { success: true, method: 'Raw', token: authHeader.trim() };
  }
  
  return { success: false, error: 'Unrecognized format' };
}

module.exports = {
  generateTestToken,
  verifyTestToken,
  decodeToken,
  parseAuthHeader
};

/**
 * Usage Examples:
 * 
 * const authHelper = require('./utils/authTestHelper');
 * 
 * // Generate test token
 * const token = authHelper.generateTestToken({
 *   id: 1,
 *   email: 'student@example.com',
 *   role: 'student'
 * });
 * 
 * // Verify token
 * authHelper.verifyTestToken(token);
 * 
 * // Parse Authorization header
 * authHelper.parseAuthHeader('Bearer eyJhbGc...');
 * 
 * // Use in cURL:
 * // curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/courses
 */
