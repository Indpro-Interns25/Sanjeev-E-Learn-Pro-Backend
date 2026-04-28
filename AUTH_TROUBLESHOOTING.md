# Authentication Troubleshooting Guide

## Issue 1: "Not authorized, no token" on Mobile

### Symptoms:
- Mobile app getting 401 errors
- Web browser works fine
- CORS errors in console

### Root Causes:
1. **Token not sent in Authorization header**
2. **CORS blocking Authorization header**
3. **Preflight request failing**

### Solutions:

**Step 1: Verify mobile app is sending token**
```dart
// Flutter Example - Check this:
final headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer $token',  // ← Must have "Bearer " prefix
  'Accept': 'application/json',
};
print('Headers: $headers');  // Debug print

final response = await http.get(
  Uri.parse('https://api.yourdomain.com/api/courses'),
  headers: headers,
);
```

**Step 2: Check CORS configuration**
```javascript
// server.js should have:
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

// Preflight handler
app.options('*', cors());
```

**Step 3: Check .env FRONTEND_URLS**
```
# .env should include mobile app origin
FRONTEND_URLS=http://localhost:3000,https://app.yourdomain.com,https://mobile.yourdomain.com
```

**Step 4: Enable debug logs**
```
Look for these logs:
✓ [AUTH] Token extracted from Bearer scheme
🔒 [AUTH] Verifying JWT token...
```

---

## Issue 2: "Invalid token" Error

### Symptoms:
- Token verification fails
- Status code 401 with "INVALID_TOKEN"
- Works on one device but not another

### Root Causes:
1. **JWT_SECRET mismatch**
2. **Token malformed**
3. **Different secret on different servers**

### Solutions:

**Step 1: Verify JWT_SECRET is consistent**
```bash
# Check .env
echo $JWT_SECRET

# Should be same across all server instances
# If running multiple instances, must be identical
```

**Step 2: Verify token format**
```javascript
// Test token structure
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// Should have 3 parts separated by dots:
// [header].[payload].[signature]

const parts = token.split('.');
console.log('Parts:', parts.length); // Should be 3
```

**Step 3: Use test helper to verify**
```javascript
const authHelper = require('./utils/authTestHelper');

// Verify token
const result = authHelper.verifyTestToken(token);
if (!result.success) {
  console.error('Token error:', result.error);
}
```

**Step 4: Generate fresh token**
```javascript
const authHelper = require('./utils/authTestHelper');

// Generate test token
const newToken = authHelper.generateTestToken({
  id: 123,
  email: 'test@example.com',
  role: 'student'
});

// Use in request:
// Authorization: Bearer {newToken}
```

---

## Issue 3: "Token expired" Error

### Symptoms:
- Works initially, then fails after time passes
- Status code 401 with "TOKEN_EXPIRED"
- Mobile app needs to log out and log back in

### Root Causes:
1. **Token TTL has passed**
2. **Server time out of sync**
3. **No token refresh mechanism**

### Solutions:

**Step 1: Check token expiration**
```javascript
const jwt = require('jsonwebtoken');
const token = 'your-token-here';
const decoded = jwt.decode(token);

console.log('Expires at:', new Date(decoded.exp * 1000));
console.log('Expires in:', decoded.exp - Math.floor(Date.now() / 1000), 'seconds');
```

**Step 2: Implement token refresh endpoint**
```javascript
// routes/authRoutes.js
router.post('/refresh', async (req, res) => {
  const { token } = req.body;
  
  try {
    // Verify even expired token
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    // Generate new token
    const newToken = jwt.sign(
      { id: decoded.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ success: true, token: newToken });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});
```

**Step 3: Mobile app should call refresh before expiration**
```dart
// Flutter Example
void scheduleTokenRefresh(String token) {
  final decoded = jwt.decode(token);
  final expiresAt = DateTime.fromMillisecondsSinceEpoch(decoded['exp'] * 1000);
  final now = DateTime.now();
  final timeUntilExpiry = expiresAt.difference(now);
  
  // Refresh 5 minutes before expiry
  final refreshTime = timeUntilExpiry - Duration(minutes: 5);
  
  Timer(refreshTime, () {
    // Call /api/auth/refresh endpoint
    refreshToken(token);
  });
}
```

---

## Issue 4: CORS Preflight Fails

### Symptoms:
- OPTIONS request returns error
- Actual request never sent
- Network tab shows failed OPTIONS

### Root Causes:
1. **Missing app.options() handler**
2. **CORS middleware not first**
3. **Missing required headers**

### Solutions:

**Step 1: Verify CORS middleware order**
```javascript
// server.js - CORS must be FIRST middleware
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// ✓ Correct: CORS first
app.use(cors({ /* config */ }));
app.use(express.json());
app.use(routes);

// ✗ Wrong: CORS after other middleware
// app.use(express.json());
// app.use(cors({ /* config */ }));
```

**Step 2: Add preflight handler**
```javascript
// After CORS middleware
app.options('*', cors());

// Or explicit OPTIONS handling
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});
```

**Step 3: Check network tab**
- Go to Network tab
- Make request
- Look for OPTIONS request
- Check if Status is 200
- Verify response headers include `Access-Control-Allow-*`

---

## Issue 5: "User not found" Error

### Symptoms:
- Token is valid
- Status code 401 with "USER_NOT_FOUND"
- User was deleted or ID doesn't exist

### Root Causes:
1. **User deleted from database**
2. **Token contains wrong user ID**
3. **Database migration issue**

### Solutions:

**Step 1: Verify user exists**
```sql
-- Check users table
SELECT id, name, email, role, status FROM users WHERE id = 1;

-- If empty, user doesn't exist
-- Either create test user or regenerate token with valid user
```

**Step 2: Check token user ID**
```javascript
const jwt = require('jsonwebtoken');
const token = 'your-token-here';
const decoded = jwt.decode(token);

console.log('Token user ID:', decoded.id);
```

**Step 3: Verify database migrations ran**
```bash
# Check if users table exists and has correct structure
npm run migrate
```

**Step 4: Create test user**
```javascript
// utils/createTestUser.js
const pool = require('../db');
const bcrypt = require('bcrypt');

async function createTestUser() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    ['Test User', 'test@example.com', hashedPassword, 'student', 'active']
  );
  
  console.log('Created user with ID:', result.rows[0].id);
}

createTestUser();
```

---

## Issue 6: "Account is blocked" Error

### Symptoms:
- User was previously able to access
- Suddenly getting 403 "Account is blocked"
- Token is valid

### Root Causes:
1. **Admin blocked the user**
2. **User status changed to 'blocked'**

### Solutions:

**Step 1: Check user status**
```sql
SELECT id, email, status FROM users WHERE email = 'user@example.com';
```

**Step 2: Unblock user**
```sql
UPDATE users SET status = 'active' WHERE id = 123;
```

**Step 3: Verify in next request**
```
User should now be able to access protected routes
```

---

## Issue 7: Header Case Sensitivity

### Symptoms:
- Works sometimes, fails other times
- Inconsistent behavior across browsers/apps
- Token sometimes found, sometimes not

### Root Causes:
1. **Authorization vs authorization header**
2. **Case-sensitive checks in middleware**

### Solutions:

**Step 1: Updated middleware handles this**
```javascript
// Middleware now handles case-insensitive
if (req.headers.authorization.toLowerCase().startsWith('bearer ')) {
  // Extracts correctly regardless of case
}
```

**Step 2: Mobile app should use consistent case**
```dart
// Good: consistent lowercase
final headers = {
  'authorization': 'Bearer $token',
  'content-type': 'application/json',
};
```

---

## Quick Debug Checklist

- [ ] Authorization header present in request? `console.log(req.headers.authorization)`
- [ ] Token in "Bearer <token>" format?
- [ ] JWT_SECRET same in .env and middleware?
- [ ] Token hasn't expired? Check `exp` claim in decoded token
- [ ] User exists in database? Query `SELECT * FROM users WHERE id = X`
- [ ] User status is 'active'? Not 'blocked'
- [ ] CORS origin allowed in FRONTEND_URLS?
- [ ] Content-Type header is 'application/json'?
- [ ] Preflight (OPTIONS) request succeeds?
- [ ] Debug logs showing token extraction? Look for `✓ [AUTH]`

---

## Enable Full Debug Mode

### 1. Update .env:
```
NODE_ENV=development
CORS_DEBUG=true
LOG_LEVEL=debug
```

### 2. Watch console output:
```
🔐 [AUTH] Route: GET /api/courses
📋 [AUTH] Authorization header: ✓ Present
🔍 [AUTH] Raw Auth Header: Bearer eyJhbGc...
✓ [AUTH] Token extracted from Bearer scheme
🔒 [AUTH] Verifying JWT token...
✓ [AUTH] Token verified successfully. User ID: 123
✅ [AUTH] User authenticated: user@example.com Role: student
```

### 3. Browser network tab:
- Check Request Headers for `Authorization: Bearer ...`
- Check Response Headers for `Access-Control-Allow-*`
- Check status codes (200 success, 401 auth error, 403 forbidden)

---

## Production Troubleshooting

### Issue: Works locally but fails in production

**Possible causes:**
1. JWT_SECRET changed between environments
2. FRONTEND_URLS doesn't include production URL
3. HTTPS enabled but secure cookie flag wrong
4. Time out of sync between servers

**Solutions:**
```javascript
// Verify environment variables
console.log('Production JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('FRONTEND_URLS:', process.env.FRONTEND_URLS);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Check system time
console.log('Server time:', new Date().toISOString());
```

---

## Support

If issues persist:
1. Check logs for `🔐 [AUTH]` debug messages
2. Test with cURL first (rules out mobile app issues)
3. Verify all environment variables are set
4. Check database connection
5. Restart server and try again
