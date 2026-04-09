const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to validate JWT token
exports.validateToken = asyncHandler(async (req, res, next) => {
  let token;
  
  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get user from the database
      const result = await pool.query('SELECT id, name, email, role, status FROM users WHERE id = $1', [decoded.id]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      if (result.rows[0].status === 'blocked') {
        return res.status(403).json({ success: false, message: 'Account is blocked' });
      }

      req.user = result.rows[0];
      next();
    } catch (error) {
      console.error('Token validation error:', error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
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
