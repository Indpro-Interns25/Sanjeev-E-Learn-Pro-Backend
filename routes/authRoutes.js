const express = require('express');
const router = express.Router();
const passport = require('passport');
const { login, register, adminLogin, getMe, forgotPassword } = require('../controllers/authController');
const { validateToken } = require('../middleware/authMiddleware');
const pool = require('../db');
const {
  buildOAuthResponse,
  getOAuthRedirectUrl,
  getSafeUser,
} = require('../services/oauthAuthService');
const { isStrategyConfigured } = require('../config/passport');

function requireStrategy(provider) {
  return (req, res, next) => {
    if (!isStrategyConfigured(provider)) {
      return res.status(503).json({
        success: false,
        error: `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured`,
      });
    }

    return next();
  };
}

function startOAuth(provider, scope, extraOptions = {}) {
  return [
    requireStrategy(provider),
    passport.authenticate(provider, {
      scope,
      session: true,
      ...extraOptions,
    }),
  ];
}

function finishOAuth(provider) {
  return (req, res, next) => {
    if (!isStrategyConfigured(provider)) {
      return res.status(503).json({
        success: false,
        error: `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured`,
      });
    }

    passport.authenticate(provider, (error, user, info) => {
      if (error) {
        return next(error);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: info?.message || `${provider} authentication failed`,
        });
      }

      req.logIn(user, (loginError) => {
        if (loginError) {
          return next(loginError);
        }

        const authResponse = buildOAuthResponse(user, provider);
        const redirectUrl = getOAuthRedirectUrl(provider, authResponse.token);

        if (redirectUrl && req.accepts('html')) {
          return res.redirect(302, redirectUrl);
        }

        return res.status(200).json({
          ...authResponse,
          user: getSafeUser(user),
        });
      });
    })(req, res, next);
  };
}

// Handle OPTIONS requests for CORS preflight
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).send();
});

// GET /auth/users - Get all users (public for testing)
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        email, 
        role, 
        created_at, 
        updated_at 
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/admin/login
router.post('/admin/login', adminLogin);

// POST /api/auth/register
router.post('/register', register);

// OAuth routes
router.get('/google', ...startOAuth('google', ['profile', 'email']));
router.get('/google/callback', finishOAuth('google'));

router.get('/github', ...startOAuth('github', ['user:email']));
router.get('/github/callback', finishOAuth('github'));

router.get('/facebook', ...startOAuth('facebook', ['email', 'public_profile'], {
  profileFields: ['id', 'displayName', 'emails', 'name', 'photos'],
}));
router.get('/facebook/callback', finishOAuth('facebook'));

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
router.post('/logout', (req, res, next) => {
  const finish = () => {
    res.status(200).json({
      message: 'Logout successful',
      instructions: 'Clear the token from localStorage or end the session on the frontend.'
    });
  };

  if (typeof req.logout === 'function') {
    return req.logout((error) => {
      if (error) {
        return next(error);
      }

      if (req.session) {
        return req.session.destroy((sessionError) => {
          if (sessionError) {
            return next(sessionError);
          }

          finish();
        });
      }

      return finish();
    });
  }

  if (req.session) {
    return req.session.destroy((error) => {
      if (error) {
        return next(error);
      }
      finish();
    });
  }

  return finish();
});

// GET /auth/me - Validate token and return current user
router.get('/me', validateToken, getMe);

// POST /auth/forgot-password
router.post('/forgot-password', forgotPassword);

module.exports = router;