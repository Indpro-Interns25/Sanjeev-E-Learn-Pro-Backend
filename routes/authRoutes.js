const express = require('express');
const router = express.Router();
const { login, register, validateToken } = require('../controllers/authController');

// Handle OPTIONS requests for CORS preflight
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).send();
});

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/register
router.post('/register', register);

// GET /api/auth/validate (to check if token is valid)
router.get('/validate', validateToken, (req, res) => {
  res.status(200).json({
    message: 'Token is valid',
    user: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role }
  });
});

// GET /api/auth/profile (get current user profile)
router.get('/profile', validateToken, (req, res) => {
  res.status(200).json({
    message: 'User profile retrieved successfully',
    user: { 
      id: req.user.id, 
      email: req.user.email, 
      name: req.user.name, 
      role: req.user.role,
      created_at: req.user.created_at
    },
    isAuthenticated: true
  });
});

// POST /api/auth/logout (logout user - frontend should clear token)
router.post('/logout', (req, res) => {
  res.status(200).json({
    message: 'Logout successful',
    instructions: 'Clear the token from localStorage and redirect to login page'
  });
});

module.exports = router;