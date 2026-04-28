// Complete Authentication Flow Example
// Shows how requests flow through the auth system

/**
 * REQUEST FLOW DIAGRAM:
 * 
 * Mobile App sends request:
 * 
 *   GET /api/courses
 *   Headers:
 *     Content-Type: application/json
 *     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *   
 *   ↓
 *   ↓ Browser/Network layer
 *   ↓
 *   
 *   Preflight (OPTIONS) request
 *   ↓
 *   app.options('*', cors()) handler
 *   ↓ Responds with CORS headers
 *   
 *   ↓
 *   ↓ If preflight succeeds (200)
 *   ↓
 *   
 *   Express Server receives request
 *   ↓
 *   cors() middleware
 *   ↓ Validates origin against FRONTEND_URLS
 *   ↓ Adds Access-Control-Allow-Origin header
 *   
 *   ↓
 *   ↓ If CORS origin is allowed
 *   ↓
 *   
 *   body parser middleware
 *   ↓ Parses JSON body if present
 *   
 *   ↓
 *   session middleware
 *   ↓ Loads session if present
 *   
 *   ↓
 *   passport middleware
 *   ↓ Checks passport authentication
 *   
 *   ↓
 *   request logging middleware
 *   ↓ Logs request details
 *   
 *   ↓
 *   Routes matching:
 *   GET /api/courses
 *   ↓
 *   validateToken middleware (CRITICAL)
 *   ↓ 
 *   [AUTH] Extract token from Authorization header
 *   ↓
 *   [AUTH] Token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *   ↓
 *   [AUTH] jwt.verify(token, JWT_SECRET)
 *   ↓
 *   [AUTH] Decoded = { id: 123, email: 'user@example.com' }
 *   ↓
 *   [AUTH] Query: SELECT * FROM users WHERE id = 123
 *   ↓
 *   [AUTH] User found: { id: 123, name: 'John', role: 'student', status: 'active' }
 *   ↓
 *   [AUTH] req.user = { id: 123, name: 'John', role: 'student', status: 'active' }
 *   ↓
 *   [AUTH] call next()
 *   
 *   ↓
 *   Controller (courseController.list)
 *   ↓
 *   Can now use req.user in logic
 *   ↓
 *   Query courses for this user
 *   
 *   ↓
 *   Response to client:
 *   {
 *     "success": true,
 *     "data": [
 *       { "id": 1, "title": "Course 1", ... },
 *       { "id": 2, "title": "Course 2", ... }
 *     ]
 *   }
 *   
 *   ↓ CORS headers included
 *   ↓ Access-Control-Allow-Origin: https://app.yourdomain.com
 */

// ============================================================================
// ACTUAL CODE FLOW
// ============================================================================

/**
 * Step 1: Mobile App Prepares Request
 */
const mobileAppExample = `
// Mobile App (Flutter/React Native)
import 'package:http/http.dart' as http;

class AuthService {
  Future<List<Course>> getCourses(String jwtToken) async {
    final response = await http.get(
      Uri.parse('https://api.yourdomain.com/api/courses'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer \$jwtToken',  // ← Critical: Bearer prefix
        'Accept': 'application/json',
      },
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return List<Course>.from(
        data['data'].map((c) => Course.fromJson(c))
      );
    } else if (response.statusCode == 401) {
      // Handle auth errors
      print('Auth Error: \${response.body}');
      // Redirect to login
    }
  }
}
`;

/**
 * Step 2: Server receives request in middleware chain
 */
const expressServerExample = `
// File: server.js

const express = require('express');
const cors = require('cors');
const app = express();

// Middleware 1: CORS
const allowedOrigins = ['http://localhost:3000', 'https://app.yourdomain.com'];
app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // ← Allow Authorization
}));

// Preflight handler
app.options('*', cors());

// Middleware 2: Body parser
app.use(express.json());

// Middleware 3: Request logging
app.use((req, res, next) => {
  console.log(\`\${req.method} \${req.url}\`);
  next();
});

// Routes
app.use('/api', require('./routes'));
`;

/**
 * Step 3: Route reaches protected endpoint
 */
const routeExample = `
// File: routes/courseRoutes.js

const express = require('express');
const router = express.Router();
const { validateToken } = require('../middleware/authMiddleware');
const courseController = require('../controllers/courseController');

// This route has validateToken middleware
router.get('/courses', validateToken, courseController.list);
//                      ^^^^^^^^^^^^^^
//                      Auth middleware checks here
`;

/**
 * Step 4: Auth middleware executes
 */
const authMiddlewareFlow = `
// File: middleware/authMiddleware.js

exports.validateToken = asyncHandler(async (req, res, next) => {
  console.log('🔐 [AUTH] Processing request to:', req.path);
  
  // Step 4a: Extract token from header
  const authHeader = req.headers.authorization;
  console.log('📋 [AUTH] Authorization header:', authHeader ? '✓ Present' : '✗ Missing');
  
  let token;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim();
    console.log('✓ [AUTH] Token extracted:', token.substring(0, 20) + '...');
  }
  
  // Step 4b: Verify JWT
  if (token) {
    try {
      console.log('🔒 [AUTH] Verifying token with JWT_SECRET...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✓ [AUTH] Token verified. User ID:', decoded.id);
      
      // Step 4c: Fetch user from database
      console.log('📊 [AUTH] Querying database for user...');
      const result = await pool.query(
        'SELECT id, name, email, role, status FROM users WHERE id = \$1',
        [decoded.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        });
      }
      
      const user = result.rows[0];
      
      // Step 4d: Check user status
      if (user.status === 'blocked') {
        return res.status(403).json({
          success: false,
          message: 'Account is blocked',
          error: 'ACCOUNT_BLOCKED'
        });
      }
      
      // Step 4e: Attach user to request
      req.user = user;
      console.log('✅ [AUTH] User authenticated:', user.email);
      
      // Step 4f: Call next middleware
      return next();
      
    } catch (error) {
      console.error('❌ [AUTH] Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
      });
    }
  }
  
  // Step 4g: No token found
  console.warn('❌ [AUTH] No token provided');
  return res.status(401).json({
    success: false,
    message: 'No token provided',
    error: 'NO_TOKEN'
  });
});
`;

/**
 * Step 5: Controller receives request with authenticated user
 */
const controllerExample = `
// File: controllers/courseController.js

exports.list = asyncHandler(async (req, res) => {
  console.log('📚 [CONTROLLER] Getting courses for user:', req.user.email);
  // req.user is now available because middleware authenticated it!
  // {
  //   id: 123,
  //   name: 'John Doe',
  //   email: 'john@example.com',
  //   role: 'student',
  //   status: 'active'
  // }
  
  // Fetch courses
  const courses = await Course.findByUserId(req.user.id);
  
  res.json({
    success: true,
    data: courses
  });
});
`;

/**
 * Step 6: Response sent back to mobile app
 */
const responseExample = `
// Response headers include CORS
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: https://app.yourdomain.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS

// Response body
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "JavaScript Fundamentals",
      "description": "Learn JS basics",
      ...
    },
    {
      "id": 2,
      "title": "React Development",
      "description": "Build React apps",
      ...
    }
  ]
}
`;

// ============================================================================
// ERROR SCENARIOS
// ============================================================================

/**
 * ERROR CASE 1: No Authorization Header
 */
const errorNoToken = `
Request:
GET /api/courses

Response:
HTTP/1.1 401 Unauthorized
{
  "success": false,
  "message": "Not authorized, no token provided",
  "error": "NO_TOKEN"
}

Debug log:
❌ [AUTH] Authorization header not found
❌ [AUTH] No token provided
`;

/**
 * ERROR CASE 2: Invalid Token Format
 */
const errorInvalidFormat = `
Request:
GET /api/courses
Authorization: MyToken eyJhbGc...

Response:
HTTP/1.1 401 Unauthorized
{
  "success": false,
  "message": "Not authorized, no token provided",
  "error": "NO_TOKEN"
}

Debug log:
⚠️ [AUTH] Authorization header format unrecognized: MyToken eyJhbGc...
❌ [AUTH] No token provided
`;

/**
 * ERROR CASE 3: Token Expired
 */
const errorExpired = `
Request:
GET /api/courses
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (expired)

Response:
HTTP/1.1 401 Unauthorized
{
  "success": false,
  "message": "Invalid or expired token",
  "error": "TOKEN_EXPIRED",
  "expiredAt": "2024-01-15T10:30:00Z"
}

Debug log:
✓ [AUTH] Token extracted from Bearer scheme
🔒 [AUTH] Verifying JWT token...
❌ [AUTH] Token verification failed: jwt expired
❌ [AUTH] Error type: TokenExpiredError
`;

/**
 * ERROR CASE 4: Wrong JWT Secret
 */
const errorWrongSecret = `
Request:
GET /api/courses
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (signed with different secret)

Response:
HTTP/1.1 401 Unauthorized
{
  "success": false,
  "message": "Invalid or expired token",
  "error": "INVALID_TOKEN"
}

Debug log:
✓ [AUTH] Token extracted from Bearer scheme
🔒 [AUTH] Verifying JWT token...
❌ [AUTH] Token verification failed: invalid signature
❌ [AUTH] Error type: JsonWebTokenError
`;

/**
 * ERROR CASE 5: CORS Preflight Fails
 */
const errorCORSPreflight = `
Browser sends preflight:
OPTIONS /api/courses
Origin: https://wrong-domain.com

Server rejects (not in FRONTEND_URLS):
HTTP/1.1 403 Forbidden
Error: Not allowed by CORS

Result: Browser never sends actual GET request
Console error: Access to XMLHttpRequest has been blocked by CORS policy
`;

// ============================================================================
// TESTING THE FLOW
// ============================================================================

const testingExample = `
// Test with cURL:

# 1. Get JWT token from login endpoint
TOKEN=\$(curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"password"}' \\
  | jq -r '.token')

echo "Token: \$TOKEN"

# 2. Use token to access protected route
curl -X GET http://localhost:3000/api/courses \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \$TOKEN" \\
  -H "Accept: application/json"

# 3. Watch the logs:
# 🔐 [AUTH] Route: GET /api/courses
# 📋 [AUTH] Authorization header: ✓ Present
# ✓ [AUTH] Token extracted from Bearer scheme
# 🔒 [AUTH] Verifying JWT token...
# ✓ [AUTH] Token verified successfully. User ID: 123
# ✅ [AUTH] User authenticated: user@example.com Role: student
`;

// ============================================================================
// ENV CONFIGURATION
// ============================================================================

const envConfig = `
# .env file must have:

# CRITICAL: JWT Secret must match between all instances
JWT_SECRET=your-very-secure-secret-key-min-32-characters

# CRITICAL: Include all frontend domains
FRONTEND_URLS=http://localhost:3000,https://app.yourdomain.com,https://mobile.yourdomain.com

# Server
NODE_ENV=development
PORT=3000
`;

// ============================================================================
// SUMMARY
// ============================================================================

const summary = `
COMPLETE FLOW SUMMARY:

1. Mobile app creates request with:
   - Authorization: Bearer <JWT_TOKEN>
   - Content-Type: application/json

2. Browser sends OPTIONS preflight:
   - Server responds with CORS headers
   - Indicates Authorization header is allowed

3. Browser sends actual GET request

4. Server processes through middleware:
   - CORS middleware ✓
   - Body parser ✓
   - Session ✓
   - Passport ✓

5. Route matches: /api/courses → validateToken middleware

6. validateToken middleware:
   - Extracts token from Authorization header
   - Verifies JWT signature
   - Queries database for user
   - Checks user status
   - Attaches user to req.user
   - Calls next()

7. Controller receives request:
   - req.user contains authenticated user
   - Can safely use user data

8. Response sent back with CORS headers

KEY POINTS:
✓ Always include "Bearer " prefix with token
✓ JWT_SECRET must be consistent
✓ FRONTEND_URLS must include app origin
✓ CORS must allow Authorization header
✓ Middleware chain must process in correct order
✓ Check debug logs: 🔐 [AUTH]
`;

module.exports = {
  mobileAppExample,
  expressServerExample,
  routeExample,
  authMiddlewareFlow,
  controllerExample,
  responseExample,
  errorNoToken,
  errorInvalidFormat,
  errorExpired,
  errorWrongSecret,
  errorCORSPreflight,
  testingExample,
  envConfig,
  summary
};
