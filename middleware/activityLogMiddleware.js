const jwt = require('jsonwebtoken');
const pool = require('../db');

const NOISY_PATHS = ['/health', '/test', '/debug', '/favicon.ico'];

function shouldSkip(req) {
  return NOISY_PATHS.some((prefix) => req.path.startsWith(prefix));
}

function decodeUserId(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return decoded.id || null;
  } catch (error) {
    return null;
  }
}

function activityLogMiddleware(req, res, next) {
  if (shouldSkip(req)) return next();

  const startedAt = Date.now();
  const userId = decodeUserId(req);

  res.on('finish', async () => {
    try {
      if (res.statusCode < 200 || res.statusCode >= 500) return;

      await pool.query(
        `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
        [
          userId,
          `${req.method} ${req.baseUrl || ''}${req.path}`.slice(0, 120),
          'http_request',
          null,
          JSON.stringify({
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt
          }),
          req.ip,
          req.headers['user-agent'] || ''
        ]
      );
    } catch (error) {
      // Intentionally no throw to avoid request disruption.
    }
  });

  next();
}

module.exports = activityLogMiddleware;
