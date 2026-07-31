const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initializeSchema } = require('./services/schemaInitializer');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Add request logging middleware BEFORE routes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
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
const {
  instructorLogin,
  instructorRegister
} = require('./controllers/authController');

// Root route - Welcome message
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Favicon route - prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content for favicon
});

// Add direct auth routes (what frontend expects)
app.use('/auth', authRoutes);

// Production compatibility aliases used by the deployed frontend.
app.post('/api/auth/instructor/login', instructorLogin);
app.post('/api/auth/instructor/register', instructorRegister);

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
      auth: '/api/auth/login, /api/auth/register, /api/auth/instructor/login, /api/auth/instructor/register',
      api: '/api'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', err.stack || err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request payload too large',
      message: 'The uploaded thumbnail or course data is too large. Try a smaller image.',
    });
  }

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Something went wrong!'
      : err.message || 'Something went wrong!';

  res.status(status).json({ error: message });
});

const server = app.listen(PORT, HOST, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server host binding ${HOST}:${PORT}`);
  console.log(`🚀 Server ready to accept connections!`);

  try {
    await initializeSchema();
    console.log('Database schema initialized');
  } catch (schemaError) {
    console.error('Database schema initialization failed:', schemaError.message);
  }
  
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
