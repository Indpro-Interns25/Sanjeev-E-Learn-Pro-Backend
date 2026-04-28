const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Enhanced middleware to validate JWT token with debugging
exports.validateToken = asyncHandler(async (req, res, next) => {
  let token;
  
  // Log incoming request headers for debugging
  console.log('🔐 [AUTH] Route:', req.method, req.path);
  console.log('📋 [AUTH] Authorization header:', req.headers.authorization ? '✓ Present' : '✗ Missing');
  console.log('📋 [AUTH] All headers:', Object.keys(req.headers).join(', '));
  
  // Extract token from Authorization header (handle case variations)
  if (req.headers.authorization) {
    try {
      const authHeader = req.headers.authorization;
      console.log('🔍 [AUTH] Raw Auth Header:', authHeader);
      
      // Handle "Bearer <token>" format
      if (authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7).trim();
        console.log('✓ [AUTH] Token extracted from Bearer scheme');
      }
      // Handle raw token (for backward compatibility)
      else if (!authHeader.includes(' ')) {
        token = authHeader.trim();
        console.log('✓ [AUTH] Token extracted as raw token');
      } else {
        console.warn('⚠️ [AUTH] Authorization header format unrecognized:', authHeader.substring(0, 20) + '...');
      }
    } catch (error) {
      console.error('❌ [AUTH] Error extracting token:', error.message);
    }
  }

  // Attempt token verification
  if (token) {
    try {
      console.log('🔒 [AUTH] Verifying JWT token...');
      
      // Verify token with secret
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✓ [AUTH] Token verified successfully. User ID:', decoded.id);

      // Get user from database
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

      // Check if user account is blocked
      if (result.rows[0].status === 'blocked') {
        console.warn('⚠️ [AUTH] User account is blocked. ID:', decoded.id);
        return res.status(403).json({ 
          success: false, 
          message: 'Account is blocked',
          error: 'ACCOUNT_BLOCKED'
        });
      }

      // Attach user data to request
      req.user = result.rows[0];
      console.log('✅ [AUTH] User authenticated:', req.user.email, 'Role:', req.user.role);
      return next();
      
    } catch (error) {
      console.error('❌ [AUTH] Token verification failed:', error.message);
      console.error('❌ [AUTH] Error type:', error.name);
      
      const errorResponse = {
        success: false,
        message: 'Invalid or expired token'
      };
      
      if (error.name === 'JsonWebTokenError') {
        errorResponse.error = 'INVALID_TOKEN';
      } else if (error.name === 'TokenExpiredError') {
        errorResponse.error = 'TOKEN_EXPIRED';
        errorResponse.expiredAt = error.expiredAt;
      }
      
      return res.status(401).json(errorResponse);
    }
  }

  // Fallback to Passport session authentication (for browser/OAuth)
  if (typeof req.isAuthenticated === 'function' && req.isAuthenticated() && req.user) {
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

  // No valid authentication found
  console.warn('❌ [AUTH] No token provided and not authenticated via session');
  return res.status(401).json({ 
    success: false, 
    message: 'Not authorized, no token provided',
    error: 'NO_TOKEN'
  });
});

// Middleware to check for admin role
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as an admin' });
  }
};

// Alias for validateToken (backward compatibility)
exports.verifyToken = exports.validateToken;

// Grant access to specific roles
exports.checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `User role ${req.user.role} is not authorized to access this route` });
    }
    next();
  };
};
