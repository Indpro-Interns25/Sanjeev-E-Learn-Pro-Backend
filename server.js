const express = require('express');
const cors = require('cors');
require('dotenv').config();
const activityLogMiddleware = require('./middleware/activityLogMiddleware');
const { initializeSchema } = require('./services/schemaInitializer');
const { initializeSocket } = require('./services/socketService');

const app = express();
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Trust proxy for proper IP forwarding
app.set('trust proxy', true);

// Enhanced CORS configuration for frontend on port 3000
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
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

// Handle preflight requests explicitly for better compatibility
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

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Additional CORS middleware for all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  next();
});

// URL cleaning middleware - remove trailing spaces and normalize URLs
app.use((req, res, next) => {
  // Decode the URL and remove trailing whitespace
  const cleanUrl = decodeURIComponent(req.url).trim();
  
  // If the URL was cleaned (had trailing spaces), redirect to clean URL
  if (cleanUrl !== decodeURIComponent(req.url)) {
    console.log(`🧹 Cleaning URL: "${req.url}" -> "${encodeURI(cleanUrl)}"`);
    req.url = encodeURI(cleanUrl);
    req.originalUrl = encodeURI(cleanUrl);
  }
  
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

// Persist activity logs for successful API requests.
app.use(activityLogMiddleware);

// Basic endpoints for testing
app.get('/health', (req, res) => {
  console.log('✅ Health endpoint accessed');
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3000
  });
});

app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Debug endpoint to help diagnose frontend connection issues
app.get('/debug', (req, res) => {
  console.log('🔍 Debug endpoint accessed from:', req.headers.origin || 'unknown origin');
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.status(200).json({
    message: 'Backend is working!',
    server: baseUrl,
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
const statsController = require('./controllers/statsController');

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

// Public real-time stats endpoint used by frontend dashboard cards.
app.get('/stats', statsController.getPublicStats);

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
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Bind to all interfaces

let server;
let io;

async function startServer() {
  try {
    await initializeSchema();

    server = app.listen(PORT, HOST, () => {
      console.log('\n🚀 ================================');
      console.log('✅ E-LEARN PRO BACKEND STARTED!');
      console.log('🚀 ================================');
      console.log(`Server running on port ${PORT}`);
      console.log(`📍 Server Host: ${HOST}:${PORT}`);
      console.log(`📍 Process ID: ${process.pid}`);
      console.log('\n🔗 Frontend Expected Endpoints: /auth/login, /auth/register, /auth/me');
      console.log('\n📡 Real-time Features Enabled:');
      console.log('   Authenticated Socket.io chat, notifications, and WebRTC signaling');
      console.log('🚀 ================================\n');
    });

    io = initializeSocket(server);
    app.set('io', io);
    console.log('✅ Authenticated Socket.IO initialized');

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
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  if (!server) {
    process.exit(0);
    return;
  }

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