const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Trust proxy for proper IP forwarding
app.set('trust proxy', true);

// Enhanced CORS configuration for frontend connectivity
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://localhost:5173', // Vite default
    'http://localhost:5174', // Vite alternative
    'http://localhost:8080', // Vue CLI
    'http://localhost:4200'  // Angular CLI
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-HTTP-Method-Override'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS before any other middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${ip}`);
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
  console.log('\n🔗 API Endpoints:');
  console.log(`   📊 Health: http://localhost:${PORT}/health`);
  console.log(`   🧪 Test: http://localhost:${PORT}/test`);
  console.log(`   🔐 Login: http://localhost:${PORT}/api/auth/login`);
  console.log(`   📝 Register: http://localhost:${PORT}/api/auth/register`);
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