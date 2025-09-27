const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Trust proxy for proper IP handling
app.set('trust proxy', true);

// Enhanced logging middleware (must be first)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${ip} - User-Agent: ${req.get('User-Agent')}`);
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://localhost:5173', // Vite default
      'http://127.0.0.1:5173'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('CORS: Allowing origin:', origin);
    return callback(null, true); // Allow all origins in development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200
}));

// Handle preflight requests
app.options('*', (req, res) => {
  console.log('Handling preflight request for:', req.url);
  res.sendStatus(200);
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  console.log('✅ Health check endpoint accessed');
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple test endpoint  
app.get('/test', (req, res) => {
  console.log('✅ Test endpoint accessed');
  res.status(200).json({ 
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
});

// API routes
const routes = require('./routes');
app.use('/api', routes);

// Catch-all route for debugging
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found', 
    method: req.method,
    url: req.originalUrl,
    availableRoutes: [
      'GET /health',
      'GET /test', 
      'POST /api/auth/register',
      'POST /api/auth/login'
    ]
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server with multiple binding attempts
const PORT = process.env.PORT || 3003;
const HOSTS = ['0.0.0.0', 'localhost', '127.0.0.1'];

function tryStartServer(hostIndex = 0) {
  if (hostIndex >= HOSTS.length) {
    console.error('❌ Failed to start server on any host');
    process.exit(1);
  }
  
  const HOST = HOSTS[hostIndex];
  
  const server = app.listen(PORT, HOST, () => {
    const address = server.address();
    console.log('🚀 ================================');
    console.log('✅ SERVER STARTED SUCCESSFULLY!');
    console.log('🚀 ================================');
    console.log(`📍 Host: ${HOST}`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Full Address: http://${HOST}:${PORT}`);
    console.log(`📍 Server Address Info:`, address);
    console.log('');
    console.log('🔗 Available Endpoints:');
    console.log(`   📊 Health: http://localhost:${PORT}/health`);
    console.log(`   🧪 Test: http://localhost:${PORT}/test`);
    console.log(`   🔐 Login: http://localhost:${PORT}/api/auth/login`);
    console.log(`   📝 Register: http://localhost:${PORT}/api/auth/register`);
    console.log('');
    console.log('🌐 Alternative URLs:');
    console.log(`   http://127.0.0.1:${PORT}`);
    console.log(`   http://localhost:${PORT}`);
    console.log('🚀 ================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${PORT} busy on ${HOST}, trying next host...`);
      tryStartServer(hostIndex + 1);
    } else if (err.code === 'EADDRNOTAVAIL') {
      console.log(`⚠️  Address ${HOST} not available, trying next host...`);  
      tryStartServer(hostIndex + 1);
    } else {
      console.error('❌ Server error:', err);
      tryStartServer(hostIndex + 1);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down server gracefully...');
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down server gracefully...');
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
  });
}

// Start the server
tryStartServer();