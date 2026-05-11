const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function resolveUserFromToken(req) {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
    return null;
  }

  const token = req.headers.authorization.split(' ')[1];
  if (!token) return null;

  const decoded = jwt.verify(token, JWT_SECRET);
  const result = await pool.query('SELECT id, name, email, role, status FROM users WHERE id = $1', [decoded.id]);

  if (result.rows.length === 0) {
    return null;
  }

  if (result.rows[0].status === 'blocked') {
    return { blocked: true };
  }

  return result.rows[0];
}

// Middleware to validate JWT token
exports.validateToken = asyncHandler(async (req, res, next) => {
  try {
    const user = await resolveUserFromToken(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    if (user.blocked) {
      return res.status(403).json({ success: false, message: 'Account is blocked' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
});

// Middleware for public endpoints: attach req.user if token is valid, otherwise continue anonymously
exports.attachUserIfPresent = asyncHandler(async (req, res, next) => {
  try {
    const user = await resolveUserFromToken(req);
    if (!user) return next();

    if (user.blocked) {
      return res.status(403).json({ success: false, message: 'Account is blocked' });
    }

    req.user = user;
    next();
  } catch (error) {
    // Public endpoints should not fail if token is absent/invalid; proceed as anonymous.
    req.user = null;
    next();
  }
});

exports.optionalValidateToken = exports.attachUserIfPresent;

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
