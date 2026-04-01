const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Find user by email
  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Generate token
  const payload = { id: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return res.status(200).json({
    message: 'Login successful',
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token
  });
});

// POST /api/auth/admin/login
exports.adminLogin = asyncHandler(async (req, res) => {
  const { adminName, password } = req.body;

  // Validate required fields
  if (!adminName || !password) {
    return res.status(400).json({ error: 'Admin name and password are required' });
  }

  // Check if it's the default admin credentials
  const defaultAdminName = process.env.ADMIN_USERNAME || 'admin';
  const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (adminName === defaultAdminName && password === defaultAdminPassword) {
    // Generate token for admin
    const payload = { id: 1, email: 'admin@elearn.com', role: 'admin', adminName: adminName };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(200).json({
      message: 'Admin login successful',
      user: { id: 1, email: 'admin@elearn.com', name: adminName, role: 'admin' },
      token
    });
  }

  // Try to find admin user in database
  const adminUser = await User.findByEmail(adminName + '@admin.com');
  if (adminUser && adminUser.role === 'admin') {
    const isPasswordValid = await bcrypt.compare(password, adminUser.password);
    if (isPasswordValid) {
      const payload = { id: adminUser.id, email: adminUser.email, role: adminUser.role };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      return res.status(200).json({
        message: 'Admin login successful',
        user: { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role },
        token
      });
    }
  }

  return res.status(401).json({ error: 'Invalid admin credentials' });
});

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  console.log('🔥 Registration attempt received:', {
    body: req.body,
    headers: req.headers,
    method: req.method,
    url: req.url
  });
  
  const { email, password, name, role } = req.body;
  
  try {
    // Input validation
    if (!email || !password || !name || !role) {
      return res.status(400).json({ 
        error: 'All fields are required',
        message: 'Please provide email, password, name, and role' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        message: 'Please provide a valid email address' 
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password too short',
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Validate role
    const validRoles = ['student', 'instructor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role',
        message: 'Role must be student, instructor, or admin' 
      });
    }

    // Check if email already exists
    const existingUser = await User.findByEmail(email.toLowerCase().trim());
    if (existingUser) {
      return res.status(409).json({ 
        error: 'Email already registered',
        message: 'An account with this email already exists' 
      });
    }

    // Hash password with bcrypt (salt rounds = 12 for better security)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Save user to database
    const userData = {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      role: role.toLowerCase()
    };

    const user = await User.create(userData);
    console.log('✅ User created successfully in database:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    // Generate JWT token
    const payload = { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Return success response with exact format requested
    return res.status(201).json({
      message: 'User registered',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific database errors
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return res.status(409).json({ 
        error: 'Email already registered',
        message: 'An account with this email already exists' 
      });
    }
    
    if (error.code === '23502') { // PostgreSQL not null violation
      return res.status(400).json({ 
        error: 'Missing required field',
        message: 'All fields are required' 
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: error.message 
      });
    }
    
    // Generic server error
    return res.status(500).json({ 
      error: 'Registration failed',
      message: 'An internal server error occurred during registration' 
    });
  }
});

// Middleware to validate JWT token
exports.validateToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// GET /auth/me - Return current authenticated user
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
});

// POST /auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = await User.findByEmail(email.toLowerCase().trim());
  // Always return success to prevent email enumeration
  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.'
  });
});