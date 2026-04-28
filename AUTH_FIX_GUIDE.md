# Authentication Fix Guide - Protected Routes & Mobile Requests

## Overview
This guide covers the complete authentication setup for protected routes, including JWT validation, CORS configuration, and mobile app integration.

---

## 1. Enhanced Auth Middleware

### Location: `middleware/authMiddleware.js`

The updated middleware includes:
- ✅ Comprehensive debugging logs
- ✅ Token extraction from Authorization header (case-insensitive)
- ✅ JWT verification with error classification
- ✅ User status validation (blocked accounts)
- ✅ Fallback to Passport session authentication
- ✅ Detailed error responses

#### Key Features:

```javascript
// Handles both "Bearer <token>" and raw token formats
// Logs complete flow for debugging mobile issues
// Returns structured error codes for client-side handling
// Supports multiple authentication methods
```

### Token Extraction Logic:
```
1. Check Authorization header exists
2. Handle "Bearer <token>" format
3. Handle raw token (backward compatibility)
4. Verify JWT with JWT_SECRET
5. Fetch user from database
6. Validate user status (not blocked)
7. Attach user to req.user
```

---

## 2. Route Protection Examples

### Protected Route - Courses API

**File:** `routes/courseRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

// Protected routes with auth middleware
router.get('/', validateToken, courseController.list);
router.get('/:id', validateToken, courseController.get);
router.post('/', validateToken, allowRoles('admin', 'instructor'), courseController.create);
router.put('/:id', validateToken, allowRoles('admin', 'instructor'), courseController.update);
router.delete('/:id', validateToken, allowRoles('admin'), courseController.remove);

module.exports = router;
```

### Applied Routes:
- ✅ `GET /api/courses` - List all courses
- ✅ `GET /api/courses/:id` - Get single course
- ✅ `POST /api/courses` - Create course (admin/instructor)
- ✅ `PUT /api/courses/:id` - Update course (admin/instructor)
- ✅ `DELETE /api/courses/:id` - Delete course (admin)

**All routes require valid JWT token in Authorization header**

---

## 3. CORS Configuration

### File: `server.js`

```javascript
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// CORS Configuration
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
```

### Environment Setup:

**.env file:**
```
FRONTEND_URLS=http://localhost:3000,https://yourdomain.com,https://app.yourdomain.com
NODE_ENV=development
JWT_SECRET=your-secure-secret-key
```

---

## 4. Mobile App Integration

### Mobile Request Example (Flutter/React Native)

```dart
// Flutter/Dart Example
final response = await http.get(
  Uri.parse('https://api.yourdomain.com/api/courses'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $jwtToken',  // ← Token in Bearer scheme
    'Accept': 'application/json',
  },
);
```

```javascript
// React Native/JavaScript Example
const response = await fetch('https://api.yourdomain.com/api/courses', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`,  // ← Token in Bearer scheme
    'Accept': 'application/json',
  },
});
```

```csharp
// C#/.NET Example
var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", $"Bearer {jwtToken}");
var response = await client.GetAsync("https://api.yourdomain.com/api/courses");
```

### Token Storage Best Practices:
- ✅ Store tokens securely (Secure Storage/Keychain)
- ✅ Include token in every protected route request
- ✅ Handle token refresh when expired
- ✅ Clear token on logout

---

## 5. Debugging Mobile Issues

### Enable Debug Logging

The auth middleware logs detailed information:

```
🔐 [AUTH] Route: GET /api/courses
📋 [AUTH] Authorization header: ✓ Present
🔍 [AUTH] Raw Auth Header: Bearer eyJhbGc...
✓ [AUTH] Token extracted from Bearer scheme
🔒 [AUTH] Verifying JWT token...
✓ [AUTH] Token verified successfully. User ID: 123
✅ [AUTH] User authenticated: user@example.com Role: student
```

### Common Issues & Solutions:

| Issue | Cause | Solution |
|-------|-------|----------|
| "No token provided" | Missing Authorization header | Ensure mobile app sends `Authorization: Bearer <token>` |
| "Invalid token" | Malformed token or wrong secret | Check JWT_SECRET matches between mobile and backend |
| "Token expired" | Token TTL exceeded | Implement token refresh mechanism |
| "User not found" | User deleted from database | Verify user exists in users table |
| "Account blocked" | User status is 'blocked' | Check user status in database |
| CORS errors | Invalid origin | Add mobile app origin to FRONTEND_URLS |

---

## 6. Error Response Format

All authentication errors return structured responses:

```json
// 401 - No Token
{
  "success": false,
  "message": "Not authorized, no token provided",
  "error": "NO_TOKEN"
}

// 401 - Invalid Token
{
  "success": false,
  "message": "Invalid or expired token",
  "error": "INVALID_TOKEN"
}

// 401 - Token Expired
{
  "success": false,
  "message": "Invalid or expired token",
  "error": "TOKEN_EXPIRED",
  "expiredAt": "2024-01-15T10:30:00Z"
}

// 403 - Account Blocked
{
  "success": false,
  "message": "Account is blocked",
  "error": "ACCOUNT_BLOCKED"
}

// 200 - Success
{
  "success": true,
  "data": [ /* courses data */ ]
}
```

---

## 7. Testing Protected Routes

### Using cURL:

```bash
# Get JWT token first (from login)
TOKEN="your_jwt_token_here"

# Test protected route
curl -X GET http://localhost:3000/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

### Using Postman:

1. Go to "Authorization" tab
2. Select "Bearer Token" type
3. Paste your JWT token
4. Make request to `/api/courses`

---

## 8. Setup Checklist

- [ ] Update `.env` with `JWT_SECRET`
- [ ] Update `.env` with `FRONTEND_URLS` (all mobile/web origins)
- [ ] Verify `middleware/authMiddleware.js` is updated
- [ ] Verify `routes/courseRoutes.js` has `validateToken` middleware
- [ ] Test with mobile app or Postman
- [ ] Check browser console for debug logs: `🔐 [AUTH]`
- [ ] Verify CORS headers in network tab
- [ ] Test token expiration and refresh

---

## 9. Token Lifecycle

```
1. User logs in via /api/auth/login
   ↓ Returns: { token: "eyJhbGc..." }

2. Mobile app stores token securely
   ↓ Saved in Secure Storage/Keychain

3. Mobile app includes token in every request
   ↓ Header: Authorization: Bearer eyJhbGc...

4. Backend middleware validates token
   ↓ Decodes JWT and fetches user from database

5. If valid → User data attached to req.user → Proceed to route
6. If invalid/expired → Return 401 → Mobile app requests new token

7. Implement token refresh
   ↓ POST /api/auth/refresh with expired token
   ↓ Returns new valid token

8. User logs out
   ↓ Clear token from Secure Storage
   ↓ Clear session from server
```

---

## 10. Production Considerations

### Security:
- Use strong `JWT_SECRET` (min 32 characters)
- Set `secure: true` in production for HTTPS only
- Use `sameSite: 'none'` with `secure: true` for cross-site requests
- Implement token expiration (1 hour recommended)
- Refresh tokens should be longer-lived (7 days)

### Performance:
- Cache user data to reduce database queries
- Implement rate limiting on auth endpoints
- Use Redis for token blacklisting

### Monitoring:
- Log all authentication failures
- Monitor for token replay attacks
- Track API usage by user

---

## Additional Resources

- [JWT.io Documentation](https://jwt.io)
- [Express.js Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/nodejs-security/)
