// QUICK REFERENCE: Auth Middleware Implementation
// File: middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Enhanced JWT Token Validation Middleware
 * 
 * Features:
 * ✓ Debug logging at every step
 * ✓ Bearer token extraction with case-insensitivity
 * ✓ Comprehensive error classification
 * ✓ Database user verification
 * ✓ User status validation
 * ✓ Passport session fallback
 * 
 * Returns:
 * - 200: User authenticated, req.user populated
 * - 401: No/invalid token or user not found
 * - 403: User account blocked
 */

exports.validateToken = asyncHandler(async (req, res, next) => {
  
  // ============================================================
  // 1. LOG REQUEST DETAILS
  // ============================================================
  console.log('🔐 [AUTH] Route:', req.method, req.path);
  console.log('📋 [AUTH] Authorization header:', req.headers.authorization ? '✓ Present' : '✗ Missing');
  
  if (process.env.DEBUG_AUTH === 'true') {
    console.log('📋 [AUTH] All headers:', Object.keys(req.headers).join(', '));
  }
  
  let token;
  
  // ============================================================
  // 2. EXTRACT TOKEN FROM HEADER
  // ============================================================
  if (req.headers.authorization) {
    try {
      const authHeader = req.headers.authorization;
      console.log('🔍 [AUTH] Raw Auth Header:', authHeader.substring(0, 30) + '...');
      
      // Try Bearer format (case-insensitive)
      if (authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7).trim();
        console.log('✓ [AUTH] Token extracted from Bearer scheme');
      }
      // Try raw token (backward compatibility)
      else if (!authHeader.includes(' ')) {
        token = authHeader.trim();
        console.log('✓ [AUTH] Token extracted as raw token');
      }
      // Unrecognized format
      else {
        console.warn('⚠️ [AUTH] Authorization header format unrecognized');
      }
    } catch (error) {
      console.error('❌ [AUTH] Error extracting token:', error.message);
    }
  }
  
  // ============================================================
  // 3. VERIFY JWT TOKEN
  // ============================================================
  if (token) {
    try {
      console.log('🔒 [AUTH] Verifying JWT token...');
      
      // Verify token signature and expiration
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✓ [AUTH] Token verified successfully. User ID:', decoded.id);
      
      // ============================================================
      // 4. FETCH USER FROM DATABASE
      // ============================================================
      console.log('📊 [AUTH] Querying database for user...');
      
      const result = await pool.query(
        'SELECT id, name, email, role, status FROM users WHERE id = $1', 
        [decoded.id]
      );
      
      if (result.rows.length === 0) {
        console.warn('⚠️ [AUTH] User not found in database. ID:', decoded.id);
        return res.status(401).json({ 
          success: false, 
          message: 'Not authorized, user not found',
          error: 'USER_NOT_FOUND'
        });
      }
      
      const user = result.rows[0];
      console.log('✓ [AUTH] User found:', user.email);
      
      // ============================================================
      // 5. CHECK USER STATUS
      // ============================================================
      if (user.status === 'blocked') {
        console.warn('⚠️ [AUTH] User account is blocked. ID:', user.id, 'Email:', user.email);
        return res.status(403).json({ 
          success: false, 
          message: 'Account is blocked',
          error: 'ACCOUNT_BLOCKED'
        });
      }
      
      // ============================================================
      // 6. ATTACH USER TO REQUEST
      // ============================================================
      req.user = user;
      console.log('✅ [AUTH] User authenticated:', user.email, 'Role:', user.role);
      
      return next();
      
    } catch (error) {
      console.error('❌ [AUTH] Token verification failed:', error.message);
      console.error('❌ [AUTH] Error type:', error.name);
      
      const errorResponse = {
        success: false,
        message: 'Invalid or expired token'
      };
      
      // Classify error for client
      if (error.name === 'JsonWebTokenError') {
        errorResponse.error = 'INVALID_TOKEN';
        console.error('   Reason: Invalid signature or malformed token');
      } else if (error.name === 'TokenExpiredError') {
        errorResponse.error = 'TOKEN_EXPIRED';
        errorResponse.expiredAt = error.expiredAt;
        console.error('   Reason: Token expired at', error.expiredAt);
      } else {
        errorResponse.error = 'TOKEN_ERROR';
        console.error('   Reason: Unknown JWT error');
      }
      
      return res.status(401).json(errorResponse);
    }
  }
  
  // ============================================================
  // 7. FALLBACK TO PASSPORT SESSION
  // ============================================================
  if (typeof req.isAuthenticated === 'function' && req.isAuthenticated() && req.user) {
    console.log('📱 [AUTH] User authenticated via Passport session');
    
    if (req.user.status === 'blocked') {
      console.warn('⚠️ [AUTH] Session user account is blocked:', req.user.email);
      return res.status(403).json({ 
        success: false, 
        message: 'Account is blocked',
        error: 'ACCOUNT_BLOCKED'
      });
    }
    
    console.log('✅ [AUTH] User authenticated via session:', req.user.email);
    return next();
  }
  
  // ============================================================
  // 8. NO AUTHENTICATION FOUND
  // ============================================================
  console.warn('❌ [AUTH] No token provided and not authenticated via session');
  return res.status(401).json({ 
    success: false, 
    message: 'Not authorized, no token provided',
    error: 'NO_TOKEN'
  });
});

// ============================================================
// USAGE IN ROUTES
// ============================================================
/*
const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { validateToken } = require('../middleware/authMiddleware');

// Protected route - requires valid token
router.get('/', validateToken, courseController.list);

// The flow:
// 1. Request comes in with Authorization header
// 2. validateToken middleware checks and validates token
// 3. If valid: req.user is populated, next() called, controller executes
// 4. If invalid: 401 response, controller never executes
*/

// ============================================================
// ERROR RESPONSE CODES
// ============================================================
/*
NO_TOKEN:            No Authorization header or token provided
INVALID_TOKEN:       Token signature invalid or malformed
TOKEN_EXPIRED:       Token expiration time has passed
USER_NOT_FOUND:      User ID in token doesn't exist in database
ACCOUNT_BLOCKED:     User account status is 'blocked'
TOKEN_ERROR:         Other JWT verification error
*/

// ============================================================
// ENVIRONMENT VARIABLES REQUIRED
// ============================================================
/*
JWT_SECRET:          Secret key for JWT signing/verification (min 32 chars)
NODE_ENV:            'development' or 'production'
DEBUG_AUTH:          'true' to enable extra logging
*/

// ============================================================
// DEBUG OUTPUT EXAMPLES
// ============================================================
/*
SUCCESS:
🔐 [AUTH] Route: GET /api/courses
📋 [AUTH] Authorization header: ✓ Present
🔍 [AUTH] Raw Auth Header: Bearer eyJhbGc...
✓ [AUTH] Token extracted from Bearer scheme
🔒 [AUTH] Verifying JWT token...
✓ [AUTH] Token verified successfully. User ID: 123
📊 [AUTH] Querying database for user...
✓ [AUTH] User found: john@example.com
✅ [AUTH] User authenticated: john@example.com Role: student

NO TOKEN:
🔐 [AUTH] Route: GET /api/courses
📋 [AUTH] Authorization header: ✗ Missing
❌ [AUTH] No token provided
Response: 401 {"success":false,"message":"Not authorized, no token provided","error":"NO_TOKEN"}

TOKEN EXPIRED:
✓ [AUTH] Token extracted from Bearer scheme
🔒 [AUTH] Verifying JWT token...
❌ [AUTH] Token verification failed: jwt expired
❌ [AUTH] Error type: TokenExpiredError
   Reason: Token expired at 2024-01-15T10:30:00.000Z
Response: 401 {"success":false,"message":"Invalid or expired token","error":"TOKEN_EXPIRED"}

INVALID SIGNATURE:
✓ [AUTH] Token extracted from Bearer scheme
🔒 [AUTH] Verifying JWT token...
❌ [AUTH] Token verification failed: invalid signature
❌ [AUTH] Error type: JsonWebTokenError
   Reason: Invalid signature or malformed token
Response: 401 {"success":false,"message":"Invalid or expired token","error":"INVALID_TOKEN"}

USER BLOCKED:
✓ [AUTH] Token extracted from Bearer scheme
🔒 [AUTH] Verifying JWT token...
✓ [AUTH] Token verified successfully. User ID: 123
✓ [AUTH] User found: john@example.com
⚠️ [AUTH] User account is blocked. ID: 123 Email: john@example.com
Response: 403 {"success":false,"message":"Account is blocked","error":"ACCOUNT_BLOCKED"}
*/

// ============================================================
// TESTING WITH CURL
// ============================================================
/*
# 1. Get token from login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.token')

# 2. Use token to access protected route
curl -X GET http://localhost:3000/api/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# 3. Watch server console for [AUTH] logs
*/

// ============================================================
// INTEGRATION WITH CORS
// ============================================================
/*
// In server.js, ensure CORS allows Authorization header:

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Preflight handler
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});
*/

module.exports = exports;
