const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

async function ensureInstructorProfilesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS instructor_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      mobile_number VARCHAR(30) NOT NULL,
      highest_qualification VARCHAR(255) NOT NULL,
      years_of_experience INTEGER NOT NULL,
      specialization VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

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

  if (user.status === 'blocked') {
    return res.status(403).json({ error: 'Account is blocked' });
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
    if (adminUser.status === 'blocked') {
      return res.status(403).json({ error: 'Account is blocked' });
    }

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
  const { email, password, name, role: requestedRole } = req.body;
  
  try {
    // Input validation
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'All fields are required',
        message: 'Please provide email, password, and name' 
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

    const allowedRoles = ['student', 'instructor'];
    const normalizedRole = String(requestedRole || '').trim().toLowerCase();
    const role = allowedRoles.includes(normalizedRole) ? normalizedRole : 'student';

    // Save user to database
    const userData = {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      role,
      status: 'active',
      enrolledCourses: []
    };

    const user = await User.create(userData);

    // Generate JWT token
    const payload = { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      status: user.status
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
        status: user.status,
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

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Account is blocked' });
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

// POST /api/auth/instructor/login
exports.instructorLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findByEmail(String(email).toLowerCase().trim());
  if (!user || user.role !== 'instructor') {
    return res.status(401).json({ error: 'Invalid instructor credentials' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({ error: 'Account is blocked' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid instructor credentials' });
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return res.status(200).json({
    message: 'Instructor login successful',
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token
  });
});

// POST /api/auth/instructor/register
exports.instructorRegister = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    mobileNumber,
    highestQualification,
    yearsOfExperience,
    specialization,
    acceptTerms
  } = req.body;

  if (
    !name ||
    !email ||
    !password ||
    !mobileNumber ||
    !highestQualification ||
    yearsOfExperience === undefined ||
    yearsOfExperience === null ||
    !specialization
  ) {
    return res.status(400).json({
      error: 'All required instructor fields must be provided'
    });
  }

  if (!acceptTerms) {
    return res.status(400).json({
      error: 'You must accept the Terms & Conditions'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const mobileRegex = /^[0-9+\-()\s]{8,20}$/;
  if (!mobileRegex.test(String(mobileNumber).trim())) {
    return res.status(400).json({ error: 'Invalid mobile number format' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const experience = Number(yearsOfExperience);
  if (!Number.isInteger(experience) || experience < 0 || experience > 60) {
    return res.status(400).json({ error: 'Years of experience must be a whole number between 0 and 60' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existingUser = await User.findByEmail(normalizedEmail);
  if (existingUser) {
    return res.status(409).json({
      error: 'Email already registered',
      message: 'An account with this email already exists'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureInstructorProfilesTable(client);

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUserResult = await client.query(
      `INSERT INTO users (email, name, password, role, status, enrolled_courses, created_at)
       VALUES ($1, $2, $3, 'instructor', 'active', '{}'::integer[], CURRENT_TIMESTAMP)
       RETURNING id, email, name, role, status, created_at`,
      [normalizedEmail, String(name).trim(), hashedPassword]
    );

    const createdUser = newUserResult.rows[0];

    await client.query(
      `INSERT INTO instructor_profiles
       (user_id, mobile_number, highest_qualification, years_of_experience, specialization)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id)
       DO UPDATE SET
         mobile_number = EXCLUDED.mobile_number,
         highest_qualification = EXCLUDED.highest_qualification,
         years_of_experience = EXCLUDED.years_of_experience,
         specialization = EXCLUDED.specialization,
         updated_at = NOW()`,
      [
        createdUser.id,
        String(mobileNumber).trim(),
        String(highestQualification).trim(),
        experience,
        String(specialization).trim()
      ]
    );

    await client.query('COMMIT');

    const payload = {
      id: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      status: createdUser.status
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(201).json({
      message: 'Instructor registered successfully',
      user: createdUser,
      token
    });
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email already exists'
      });
    }

    throw error;
  } finally {
    client.release();
  }
});