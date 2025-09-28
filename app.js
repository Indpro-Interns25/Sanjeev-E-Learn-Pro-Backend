const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware BEFORE routes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.status(200).json({ status: 'ok', message: 'Server is running!' });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ message: 'Test endpoint working!' });
});

// Routes
const routes = require('./routes');
const authRoutes = require('./routes/authRoutes');

// Root route - Welcome message
app.get('/', (req, res) => {
  res.json({
    message: '🎓 Welcome to E-Learn Pro Backend API!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/auth',
      dashboard: '/api/dashboard',
      users: '/api/users',
      courses: '/api/courses'
    },
    status: 'Server is running successfully! ✅'
  });
});

// Favicon route - prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content for favicon
});

// Add direct auth routes (what frontend expects)
app.use('/auth', authRoutes);

app.use('/api', routes);

// Catch-all route for undefined routes
app.use('*', (req, res) => {
  console.log(`❓ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: {
      root: '/',
      health: '/health',
      auth: '/api/auth/login, /api/auth/register',
      api: '/api'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server if not already started
const PORT = 3002; // Use port 3002 as requested
const HOST = '127.0.0.1'; // Use IPv4 explicitly

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://127.0.0.1:${PORT}/health`);
  console.log(`🔐 Login endpoint: http://127.0.0.1:${PORT}/api/auth/login`);
  console.log(`📝 Register endpoint: http://127.0.0.1:${PORT}/api/auth/register`);
  console.log(`🚀 Server ready to accept connections!`);
  
  // Test if server is actually listening
  const address = server.address();
  console.log(`🔧 Server address: ${JSON.stringify(address)}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
  } else {
    console.error('❌ Server failed to start:', err);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
  });
});
