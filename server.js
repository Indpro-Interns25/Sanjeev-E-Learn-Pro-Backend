const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Trust proxy for proper IP forwarding
app.set('trust proxy', true);

// Enhanced CORS configuration for frontend on port 3000
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'], // Allow frontend origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Handle preflight requests explicitly for better compatibility
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Additional CORS middleware for all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  next();
});

// Enhanced request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const origin = req.headers.origin || 'no-origin';
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${ip} - Origin: ${origin}`);
  
  // Log request body for POST requests (except passwords)
  if (req.method === 'POST' && req.body) {
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '***';
    console.log(`[${timestamp}] Request Body:`, logBody);
  }
  
  next();
});

// Basic endpoints for testing
app.get('/health', (req, res) => {
  console.log('✅ Health endpoint accessed');
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3002
  });
});

// Debug endpoint to help diagnose frontend connection issues
app.get('/debug', (req, res) => {
  console.log('🔍 Debug endpoint accessed from:', req.headers.origin || 'unknown origin');
  res.status(200).json({
    message: 'Backend is working!',
    server: 'http://localhost:3002',
    endpoints: {
      register: '/auth/register',
      login: '/auth/login',
      profile: '/auth/me'
    },
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

app.get('/test', (req, res) => {
  console.log('🧪 Test endpoint accessed');
  res.status(200).json({ 
    message: 'Test endpoint working!',
    cors: 'enabled',
    timestamp: new Date().toISOString()
  });
});

// Import and use routes
const routes = require('./routes');
const { login, register, validateToken } = require('./controllers/authController');

// Add direct API routes that frontend expects
app.post('/auth/login', login);
app.post('/auth/register', register);
app.get('/auth/me', validateToken, (req, res) => {
  res.status(200).json({
    message: 'User profile retrieved successfully',
    user: { 
      id: req.user.id, 
      email: req.user.email, 
      name: req.user.name, 
      role: req.user.role
    }
  });
});
app.post('/auth/logout', (req, res) => {
  res.status(200).json({
    message: 'Logout successful'
  });
});
app.post('/auth/forgot-password', (req, res) => {
  res.status(200).json({
    message: 'Password reset email sent (feature not implemented yet)'
  });
});

// Additional direct routes for compatibility
app.post('/api/login', login);
app.post('/api/register', register);
app.post('/login', login);
app.post('/register', register);

// Keep the existing full API routes as well
app.use('/api', routes);

// Catch-all error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❓ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl,
    availableEndpoints: [
      'GET /health',
      'GET /test',
      'POST /auth/login',
      'POST /auth/register',
      'GET /auth/me',
      'POST /auth/logout',
      'POST /auth/forgot-password',
      'POST /api/login',
      'POST /api/register', 
      'POST /login',
      'POST /register',
      'POST /api/auth/login',
      'POST /api/auth/register'
    ]
  });
});

// Server configuration
const PORT = process.env.PORT || 3002;
const HOST = '0.0.0.0'; // Bind to all interfaces

const server = app.listen(PORT, HOST, () => {
  console.log('\n🚀 ================================');
  console.log('✅ E-LEARN PRO BACKEND STARTED!');
  console.log('🚀 ================================');
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`📍 Server Host: ${HOST}:${PORT}`);
  console.log(`📍 Process ID: ${process.pid}`);
  console.log('\n🔗 Frontend Expected Endpoints:');
  console.log(`   � Login: http://localhost:${PORT}/auth/login`);
  console.log(`   📝 Register: http://localhost:${PORT}/auth/register`);
  console.log(`   � Profile: http://localhost:${PORT}/auth/me`);
  console.log(`   � Logout: http://localhost:${PORT}/auth/logout`);
  console.log(`   � Reset Password: http://localhost:${PORT}/auth/forgot-password`);
  console.log('\n� Additional API Endpoints:');
  console.log(`   � Health: http://localhost:${PORT}/health`);
  console.log(`   🧪 Test: http://localhost:${PORT}/test`);
  console.log(`   � Alt Login: http://localhost:${PORT}/api/login`);
  console.log(`   � Alt Register: http://localhost:${PORT}/api/register`);
  console.log('\n🌐 Alternative URLs:');
  console.log(`   http://127.0.0.1:${PORT}`);
  console.log(`   http://localhost:${PORT}`);
  console.log('🚀 ================================\n');
});

// Enhanced error handling
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.log('💡 Try using a different port or kill existing processes:');
    console.log('   taskkill /f /im node.exe');
    process.exit(1);
  } else if (err.code === 'EACCES') {
    console.error(`❌ Permission denied to bind to port ${PORT}`);
    console.log('💡 Try using a port > 1024 or run as administrator');
    process.exit(1);
  } else {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.log('⏰ Forcing server shutdown...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;